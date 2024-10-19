import asyncio
import json
import os
import uuid
from dataclasses import dataclass
from functools import partial  # Add this import

from fastapi import APIRouter, Depends, HTTPException, Path, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from characters.audio.speech_to_text import get_speech_to_text, SpeechToText
from characters.audio.text_to_speech import get_text_to_speech, TextToSpeech
from characters.audio_process_service import AudioProcessService
from characters.database.connection import get_db
from characters.llm import get_llm, LLM
from characters.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler
from characters.logger import get_logger
from characters.models.character import Character
from characters.models.interaction import Interaction
from characters.utils import (
    build_history,
    ConversationHistory,
    get_connection_manager,
    get_timer,
    task_done_callback,
    Transcript,
    upload_file_to_oss,
)


logger = get_logger(__name__)

router = APIRouter()

manager = get_connection_manager()

timer = get_timer()

GREETING_TXT_MAP = {
    "en-US": "Hi, my friend, what brings you here today?",
    "es-ES": "Hola, mi amigo, ¿qué te trae por aquí hoy?",
    "fr-FR": "Salut mon ami, qu'est-ce qui t'amène ici aujourd'hui?",
    "de-DE": "Hallo mein Freund, was bringt dich heute hierher?",
    "it-IT": "Ciao amico mio, cosa ti porta qui oggi?",
    "pt-PT": "Olá meu amigo, o que te traz aqui hoje?",
    "hi-IN": "नमस्ते मेरे दोस्त, आज आपको यहां क्या लाया है?",
    "pl-PL": "Cześć mój przyjacielu, co cię tu dziś przynosi?",
    "zh-CN": "嗨，我的朋友，今天你为什么来这里？",
    "ja-JP": "こんにちは、私の友達、今日はどうしたの？",
    "ko-KR": "안녕, 내 친구, 오늘 여기 왜 왔어?",
}


async def get_current_user(token: str):
    """Helper function for auth with Firebase."""
    try:
        decoded_token = auth.verify_id_token(token)
    except FirebaseError as e:
        logger.info(f"Received invalid token: {token} with error {e}")
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials")

    return decoded_token["uid"]


@dataclass
class SessionAuthResult:
    is_existing_session: bool
    is_authenticated_user: bool


async def check_session_auth(session_id: str, user_id: str, db: Session) -> SessionAuthResult:
    """
    Helper function to check if the session is authenticated.
    """
    if os.getenv("USE_AUTH") != "true":
        return SessionAuthResult(
            is_existing_session=False,
            is_authenticated_user=True,
        )
    try:
        original_chat = await asyncio.to_thread(
            db.query(Interaction).filter(
                Interaction.session_id == session_id).first
        )
    except Exception as e:
        logger.info(f"Failed to lookup session {session_id} with error {e}")
        return SessionAuthResult(
            is_existing_session=False,
            is_authenticated_user=False,
        )
    if not original_chat:
        # Continue with a new session.
        return SessionAuthResult(
            is_existing_session=False,
            is_authenticated_user=True,
        )
    is_authenticated_user = original_chat.user_id == user_id
    return SessionAuthResult(
        is_existing_session=True,
        is_authenticated_user=is_authenticated_user,  # type: ignore
    )


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str = Path(...),
    llm_model: str = Query("gpt-3.5-turbo-16k"),
    language: str = 'zh-cn',
    token: str = Query(None),
    character_id: str = Query(None),
    platform: str = Query(None),
    db: Session = Depends(get_db),
    speech_to_text=Depends(get_speech_to_text),
    default_text_to_speech=Depends(get_text_to_speech),
):
    # Default user_id to session_id. If auth is enabled and token is provided, use
    # the user_id from the token.
    user_id = str(session_id)
    if os.getenv("USE_AUTH") == "true":
        # Do not allow anonymous users to use advanced model.
        if token:
            try:
                user_id = await get_current_user(token)
                logger.info(f"User #{user_id} is authenticated")
            except HTTPException:
                await websocket.close(code=1008, reason="Unauthorized")
                return
        elif llm_model != "rebyte":
            await websocket.close(code=1008, reason="Unauthorized")
            return
    session_auth_result = await check_session_auth(session_id=session_id, user_id=user_id, db=db)
    if not session_auth_result.is_authenticated_user:
        logger.info(
            f"User #{user_id} is not authorized to access session {session_id}")
        await websocket.close(code=1008, reason="Unauthorized")
        return
    logger.info(
        f"User #{user_id} is authorized to access session {session_id}")

    llm = get_llm(model=llm_model)
    await manager.connect(websocket)
    try:
        main_task = asyncio.create_task(
            handle_receive(
                websocket,
                session_id,
                user_id,
                db,
                llm,
                character_id,
                platform,
                speech_to_text,
                default_text_to_speech,
                language,
                session_auth_result.is_existing_session,
            )
        )
        await asyncio.gather(main_task)

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        await manager.broadcast_message(f"User #{user_id} left the chat")


async def handle_receive(
    websocket: WebSocket,
    session_id: str,
    user_id: str,
    db: Session,
    llm: LLM,
    character_id: str,
    platform: str,
    speech_to_text: SpeechToText,
    default_text_to_speech: TextToSpeech,
    language: str,
    load_from_existing_session: bool = False,
):
    tts_task = None  # 初始化 tts_task 以便后续检查

    async def on_new_token(token, message_id, from_type, append_or_update="update", is_end=False):
        logger.info(
            f"on_new_token is called, token: {token}, message_id: {message_id}&isEnd={is_end}")
        return await manager.send_message(message=f"[end={message_id}]\n?text={token}&from={from_type}&appendOrUpdate={append_or_update}&isEnd={is_end}", websocket=websocket)

    try:
        conversation_history = ConversationHistory()
        if load_from_existing_session:
            logger.info(
                f"User #{user_id} is loading from existing session {session_id}")
            await asyncio.to_thread(conversation_history.load_from_db, session_id=session_id, db=db)

        # 0. Receive client platform info (web, mobile, terminal)
        if not platform:
            data = await websocket.receive()
            if data["type"] != "websocket.receive":
                raise WebSocketDisconnect(reason="disconnected")
            platform = data["text"]

        logger.info(
            f"User #{user_id}:{platform} connected to server with " f"session_id {session_id}"
        )

        # 1. User selected a character
        character = None
        if character_id:
            character = await asyncio.to_thread(
                db.query(Character).filter(Character.id == character_id).first
            )

        if character.tts:
            text_to_speech = get_text_to_speech(character.tts)
        else:
            text_to_speech = default_text_to_speech

        conversation_history.system_prompt = character.system_prompt
        logger.info(f"User #{user_id} selected character: {character.name}")

        tts_event = asyncio.Event()
        previous_transcript = None
        token_buffer = []

        # Greet the user
        greeting_text = GREETING_TXT_MAP[language if language else "en-US"]
        message_id = str(uuid.uuid4().hex)[:16]
        await on_new_token(greeting_text, message_id, "character")
        tts_task = asyncio.create_task(
            text_to_speech.stream(
                text=greeting_text,
                websocket=websocket,
                tts_event=tts_event,
                voice_id=character.voice_id,
                first_sentence=True,
                language='zh-cn',
                priority=0,
            )
        )
        tts_task.add_done_callback(task_done_callback)

        async def stop_audio():
            if tts_task and not tts_task.done():
                tts_event.set()
                tts_task.cancel()
                if previous_transcript:
                    conversation_history.user.append(previous_transcript)
                    conversation_history.ai.append(" ".join(token_buffer))
                    token_buffer.clear()
                try:
                    await tts_task
                except asyncio.CancelledError:
                    pass
                tts_event.clear()

        # 4. return response to client
        async def text_mode_tts_task_done_call_back(response, message_id, msg_data):
            logger.info(
                f"text_mode_tts_task_done_call_back is called, response: {response}, message_id: {message_id}")
            # Send response to client, indicates the response is done
            await on_new_token(response, message_id, "character", "append", True)
            # Update conversation history
            conversation_history.user.append(msg_data)
            conversation_history.ai.append(response)
            logger.info(f"server message: {response}")
            token_buffer.clear()
            # Persist interaction in the database
            tools = []
            interaction = Interaction(
                user_id=user_id,
                session_id=session_id,
                client_message=msg_data,
                server_message=response,
                platform=platform,
                action_type="text",
                character_id=character_id,
                tools=",".join(tools),
                language=language,
                message_id=message_id,
                llm_config=llm.get_config(),
                audio_url=""
            )
            await asyncio.to_thread(interaction.save, db)

        while True:
            data = await websocket.receive()
            if data["type"] != "websocket.receive":
                raise WebSocketDisconnect(reason="disconnected")

            # show latency info
            timer.report()
            # JSON 解析
            try:
                message_data = data["text"]
                json_data = json.loads(message_data)  # 尝试将接收到的数据解析为 JSON
                message_type = json_data.get("type", "")
                client_msg_id = json_data.get(
                    "clientMsgId", "")  # 获取 clientMsgId
                logger.info(
                    f"========message_type:{message_type}========clientMsgId:{client_msg_id}")
            except (ValueError, KeyError):
                logger.error(
                    f"Failed to parse incoming message as JSON: {data}")
                raise WebSocketDisconnect(reason="Invalid message format")

            # 处理不同类型的消息
            if message_type == "text":
                # 处理空消息
                msg_data = json_data.get("content", "")
                if not msg_data:
                    continue
                logger.info(
                    f"Received text message with clientMsgId {client_msg_id}: {msg_data}")

                # 2. 保存文本消息
                interaction = Interaction(
                    user_id=user_id,
                    session_id=session_id,
                    client_message=msg_data,
                    server_message="",
                    platform=platform,
                    action_type="text",
                    character_id=character_id,
                    tools="",
                    language=language,
                    message_id=client_msg_id,  # 使用前端传递的 clientMsgId
                    llm_config=llm.get_config(),
                    audio_url=""
                )
                await asyncio.to_thread(interaction.save, db)

                # 3. Send message to LLM
                server_message_id = str(uuid.uuid4().hex)[:16]
                tts_task = asyncio.create_task(
                    llm.achat(
                        history=build_history(conversation_history),
                        user_input=msg_data,
                        user_id=user_id,
                        character=character,
                        callback=AsyncCallbackTextHandler(
                            partial(on_new_token, message_id=server_message_id, from_type="character", append_or_update="append"), token_buffer, partial(
                                text_mode_tts_task_done_call_back, message_id=server_message_id, msg_data=msg_data)  # Pass message_id here
                        ),
                        audioCallback=AsyncCallbackAudioHandler(
                            text_to_speech, websocket, tts_event, character.voice_id, language
                        ),
                        metadata={"message_id": server_message_id,
                                  "user_id": user_id},
                    )
                )
                tts_task.add_done_callback(task_done_callback)

            # 处理音频消息
            elif message_type == "audio":
                transcript = json_data.get("content", "")
                audio_url = json_data.get("audioUrl", None)
                # 忽略拾取背景噪音的音频
                if not transcript or len(transcript) < 2:
                    continue

                await manager.send_message(
                    message=f"[+transcript_audio]"
                    f"?text={transcript}"
                    f"&messageId={client_msg_id}"
                    f"&audioUrl={audio_url}", 
                    websocket=websocket,
                )

                if audio_url:
                    continue
    
                # 开始计时 LLM 生成第一个 token 的时间
                timer.start("LLM First Token")

                # 4. 停止之前的音频流，如果收到新的转录
                await stop_audio()

                previous_transcript = transcript

                async def audio_mode_tts_task_done_call_back(response, server_message_id, transcript, audio_url):
                    try:
                        logger.info(
                            "audio_mode_tts_task_done_call_back is called >>>")

                        # 发送响应给客户端，[=] 表示响应完成
                        await manager.send_message(message=f"[+transcript_audio]"
                                                   f"?text={response}&from=character&messageId={server_message_id}&isEnd={True}", websocket=websocket)

                        # 更新对话历史
                        conversation_history.user.append(transcript)
                        conversation_history.ai.append(response)
                        logger.info(
                            f"audio_mode_tts_task_done_call_back is called, {response}")
                        token_buffer.clear()

                        # 保存交互记录到数据库
                        tools = []
                        interaction = Interaction(
                            user_id=user_id,
                            session_id=session_id,
                            client_message=transcript,
                            server_message=response,
                            platform=platform,
                            action_type="audio",
                            character_id=character_id,
                            tools=",".join(tools),
                            language=language,
                            message_id=server_message_id,
                            llm_config=llm.get_config(),
                            audio_url=audio_url
                        )
                        await asyncio.to_thread(interaction.save, db)

                    except Exception as e:
                        # 记录异常信息
                        logger.error(
                            f"Error in audio_mode_tts_task_done_call_back: {str(e)}")

                # 5. 将消息发送给 LLM
                server_message_id = str(uuid.uuid4().hex)[:16]
                tts_task = asyncio.create_task(
                    llm.achat(
                        history=build_history(conversation_history),
                        user_input=transcript,
                        user_id=user_id,
                        character=character,
                        callback=AsyncCallbackTextHandler(
                            partial(on_new_token, message_id=server_message_id, from_type="character", append_or_update="append"),
                            token_buffer=token_buffer,
                            on_llm_end=lambda response, server_message_id=server_message_id, transcript=transcript, audio_url=audio_url, callback=audio_mode_tts_task_done_call_back: callback(
                                response, server_message_id, transcript=transcript, audio_url=audio_url)
                        ),
                        audioCallback=AsyncCallbackAudioHandler(
                            text_to_speech, websocket, tts_event, character.voice_id, language
                        ),
                        metadata={"message_id": server_message_id,
                                  "user_id": user_id},
                    )
                )
                tts_task.add_done_callback(task_done_callback)

    except WebSocketDisconnect:
        logger.info(f"User #{user_id} closed the connection")
        timer.reset()
        await manager.disconnect(websocket)
        return
