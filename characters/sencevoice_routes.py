from collections import defaultdict
import json
from modelscope.utils.constant import Tasks
from modelscope.pipelines import pipeline
import os
from urllib.parse import parse_qs
import soundfile as sf
import numpy as np
from funasr import AutoModel
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
import logging
# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class Config(BaseSettings):
    sv_thr: float = Field(0.29, description="Speaker verification threshold")
    chunk_size_ms: int = Field(100, description="Chunk size in milliseconds")
    sample_rate: int = Field(16000, description="Sample rate in Hz")
    bit_depth: int = Field(16, description="Bit depth")
    channels: int = Field(1, description="Number of audio channels")


config = Config()

emo_dict = {
    "<|HAPPY|>": "😊",
    "<|SAD|>": "😔",
    "<|ANGRY|>": "😡",
    "<|NEUTRAL|>": "",
    "<|FEARFUL|>": "😰",
    "<|DISGUSTED|>": "🤢",
    "<|SURPRISED|>": "😮",
}

event_dict = {
    "<|BGM|>": "🎼",
    "<|Speech|>": "",
    "<|Applause|>": "👏",
    "<|Laughter|>": "😀",
    "<|Cry|>": "😭",
    "<|Sneeze|>": "🤧",
    "<|Breath|>": "",
    "<|Cough|>": "🤧",
}

emoji_dict = {
    "<|nospeech|><|Event_UNK|>": "❓",
    "<|zh|>": "",
    "<|en|>": "",
    "<|yue|>": "",
    "<|ja|>": "",
    "<|ko|>": "",
    "<|nospeech|>": "",
    "<|HAPPY|>": "😊",
    "<|SAD|>": "😔",
    "<|ANGRY|>": "😡",
    "<|NEUTRAL|>": "",
    "<|BGM|>": "🎼",
    "<|Speech|>": "",
    "<|Applause|>": "👏",
    "<|Laughter|>": "😀",
    "<|FEARFUL|>": "😰",
    "<|DISGUSTED|>": "🤢",
    "<|SURPRISED|>": "😮",
    "<|Cry|>": "😭",
    "<|EMO_UNKNOWN|>": "",
    "<|Sneeze|>": "🤧",
    "<|Breath|>": "",
    "<|Cough|>": "😷",
    "<|Sing|>": "",
    "<|Speech_Noise|>": "",
    "<|withitn|>": "",
    "<|woitn|>": "",
    "<|GBG|>": "",
    "<|Event_UNK|>": "",
}

lang_dict = {
    "<|zh|>": "<|lang|>",
    "<|en|>": "<|lang|>",
    "<|yue|>": "<|lang|>",
    "<|ja|>": "<|lang|>",
    "<|ko|>": "<|lang|>",
    "<|nospeech|>": "<|lang|>",
}

emo_set = {"😊", "😔", "😡", "😰", "🤢", "😮"}
event_set = {"🎼", "👏", "😀", "😭", "🤧", "😷", }


def format_str(s):
    for sptk in emoji_dict:
        s = s.replace(sptk, emoji_dict[sptk])
    return s


def format_str_v2(s):
    sptk_dict = {}
    for sptk in emoji_dict:
        sptk_dict[sptk] = s.count(sptk)
        s = s.replace(sptk, "")
    emo = "<|NEUTRAL|>"
    for e in emo_dict:
        if sptk_dict[e] > sptk_dict[emo]:
            emo = e
    for e in event_dict:
        if sptk_dict[e] > 0:
            s = event_dict[e] + s
    s = s + emo_dict[emo]

    for emoji in emo_set.union(event_set):
        s = s.replace(" " + emoji, emoji)
        s = s.replace(emoji + " ", emoji)
    return s.strip()


def format_str_v3(s):
    def get_emo(s):
        return s[-1] if s[-1] in emo_set else None

    def get_event(s):
        return s[0] if s[0] in event_set else None

    s = s.replace("<|nospeech|><|Event_UNK|>", "❓")
    for lang in lang_dict:
        s = s.replace(lang, "<|lang|>")
    s_list = [format_str_v2(s_i).strip(" ") for s_i in s.split("<|lang|>")]
    new_s = " " + s_list[0]
    cur_ent_event = get_event(new_s)
    for i in range(1, len(s_list)):
        if len(s_list[i]) == 0:
            continue
        if get_event(s_list[i]) == cur_ent_event and get_event(s_list[i]) != None:
            s_list[i] = s_list[i][1:]
        # else:
        cur_ent_event = get_event(s_list[i])
        if get_emo(s_list[i]) != None and get_emo(s_list[i]) == get_emo(new_s):
            new_s = new_s[:-1]
        new_s += s_list[i].strip().lstrip()
    new_s = new_s.replace("The.", " ")
    return new_s.strip()


sv_pipeline = pipeline(
    task='speaker-verification',
    model='iic/speech_campplus_sv_zh_en_16k-common_advanced',
    model_revision='v1.0.0'
)

asr_pipeline = pipeline(
    task=Tasks.auto_speech_recognition,
    model='iic/SenseVoiceSmall',
    model_revision="master",
    device="cuda:0",
)


model = AutoModel(
    model="fsmn-vad",
    model_revision="v2.0.4",
    disable_pbar=True,
    max_end_silence_time=200,
    speech_noise_thres=0.8
)

reg_spks_files = [
    "speaker/speaker1_a_cn_16k.wav"
]


def reg_spk_init(files):
    reg_spk = {}
    for f in files:
        data, sr = sf.read(f, dtype="float32")
        k, _ = os.path.splitext(os.path.basename(f))
        reg_spk[k] = {
            "data": data,
            "sr":   sr,
        }
    return reg_spk


reg_spks = reg_spk_init(reg_spks_files)


def process_vad_audio(audio, sv=True, lang="auto"):
    logger.debug(f"[process_vad_audio] process audio(length: {len(audio)})")
    if not sv:
        return asr_pipeline(audio, language=lang.strip())

    hit = False
    for k, v in reg_spks.items():
        res_sv = sv_pipeline([audio, v["data"]], thr=config.sv_thr)
        logger.debug(f"[speaker check] {k}: {res_sv}")
        if res_sv["score"] >= config.sv_thr:
            hit = True

    return asr_pipeline(audio, language=lang.strip()) if hit else None


router = APIRouter()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    # Change to domains if you deploy this to production
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the response model


class TranscriptionResponse(BaseModel):
    code: int
    msg: str
    data: str


class Config(BaseSettings):
    sv_thr: float = Field(0.29, description="说话人验证阈值")
    chunk_size_ms: int = Field(100, description="块大小（毫秒）")
    sample_rate: int = Field(16000, description="采样率（Hz）")
    bit_depth: int = Field(16, description="位深")
    channels: int = Field(1, description="音频通道数")


config = Config()


# 全局字典用于管理每个 clientMsgId 的转录上下文
transcription_contexts = defaultdict(lambda: {
    "total_transcription": "",  # 存储累积的转录文本
    "audio_chunks": [],
    "audio_vad": np.array([]),
    "cache": {},
    "audio_url": None,
    "last_vad_beg": -1,
    "last_vad_end": -1,
    "offset": 0
})


@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    logger.error("Exception occurred", exc_info=True)
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        message = exc.detail
        data = ""
    elif isinstance(exc, RequestValidationError):
        status_code = HTTP_422_UNPROCESSABLE_ENTITY
        message = "Validation error: " + str(exc.errors())
        data = ""
    else:
        status_code = 500
        message = "Internal server error: " + str(exc)
        data = ""

    return JSONResponse(
        status_code=status_code,
        content=TranscriptionResponse(
            code=status_code,
            msg=message,
            data=data
        ).model_dump()
    )




@router.websocket("/sencevoice/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # 解析查询参数
    query_params = parse_qs(websocket.scope['query_string'].decode())
    sv = query_params.get('sv', ['false'])[0].lower() in [
        'true', '1', 't', 'y', 'yes']
    lang = query_params.get('lang', ['auto'])[0].lower()
    client_msg_id = query_params.get('clientMsgId', [None])[0]

    if not client_msg_id:
        logger.warning("未提供 clientMsgId，关闭连接")
        await websocket.close(code=1008, reason="未提供 clientMsgId")
        return

    logger.info(f"已连接，clientMsgId: {client_msg_id}")

    # 初始化上下文
    context = transcription_contexts[client_msg_id]

    try:
        while True:
            message = await websocket.receive_text()
            logger.debug(f"收到消息: {message}")
            data = json.loads(message)

            msg_type = data.get('type')
            received_client_msg_id = data.get('clientMsgId')

            # if received_client_msg_id != client_msg_id:
            #     logger.warning(
            #         f"clientMsgId 不匹配: {received_client_msg_id} != {client_msg_id}")
            #     # 发送错误信息给前端
            #     await websocket.send_json({
            #         "clientMsgId": client_msg_id,
            #         "code": 400,
            #         "msg": "clientMsgId 不匹配"
            #     })
            #     continue

            if msg_type == 'audio':
                # 处理音频数据
                audio_blob = data.get('audioBlob')  # 预期为整数列表
                if not audio_blob:
                    logger.warning("消息中未找到 audioBlob")
                    continue

                # 将 audioBlob 列表转换为字节
                audio_bytes = bytes(audio_blob)

                # 将字节转换为 numpy 数组
                audio_np = np.frombuffer(
                    audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

                # 追加到音频缓冲区
                context["audio_chunks"].append(audio_np)

                # 合并所有音频片段
                combined_audio = np.concatenate(context["audio_chunks"])

                # 设定每次处理的块大小
                chunk_size = int(config.chunk_size_ms * config.sample_rate *
                                 config.channels * (config.bit_depth // 8) / 1000)

                # 分块处理
                while len(combined_audio) >= chunk_size:
                    chunk = combined_audio[:chunk_size]
                    combined_audio = combined_audio[chunk_size:]
                    context["audio_vad"] = np.append(
                        context["audio_vad"], chunk)

                    # VAD 推理
                    res = model.generate(
                        input=chunk,
                        cache=context["cache"],
                        is_final=False,
                        chunk_size=config.chunk_size_ms
                    )
                    logger.debug(f"VAD 推理结果: {res}")

                    if len(res[0]["value"]):
                        vad_segments = res[0]["value"]
                        for segment in vad_segments:
                            if segment[0] > -1:  # 语音开始
                                context["last_vad_beg"] = segment[0]
                            if segment[1] > -1:  # 语音结束
                                context["last_vad_end"] = segment[1]

                            if context["last_vad_beg"] > -1 and context["last_vad_end"] > -1:
                                logger.debug(
                                    f"VAD 语音段: {[context['last_vad_beg'], context['last_vad_end']]}")
                                context["last_vad_beg"] -= context["offset"]
                                context["last_vad_end"] -= context["offset"]
                                context["offset"] += context["last_vad_end"]
                                beg = int(context["last_vad_beg"]
                                          * config.sample_rate / 1000)
                                end = int(context["last_vad_end"]
                                          * config.sample_rate / 1000)

                                # 确保索引在范围内
                                beg = max(0, beg)
                                end = min(len(context["audio_vad"]), end)

                                result = process_vad_audio(
                                    context["audio_vad"][beg:end], sv, lang
                                )
                                logger.debug(
                                    f"[process_vad_audio] 结果: {result}")
                                context["audio_vad"] = context["audio_vad"][end:]
                                context["last_vad_beg"] = context["last_vad_end"] = -1

                                if result is not None:
                                    current_transcription = format_str_v3(result[0]['text']).strip()
                                    # 找到新增的部分
                                    previous_transcription = context["total_transcription"]
                                    new_part = current_transcription[len(previous_transcription):]
                                    if new_part:
                                        # 更新累积的转录文本
                                        context["total_transcription"] = current_transcription

                                        # 发送新增的部分
                                        response = {
                                            "clientMsgId": client_msg_id,
                                            "transcriptionText": new_part.strip()
                                        }
                                        await websocket.send_json(response)

                # 更新音频缓冲区
                context["audio_chunks"] = [combined_audio]

            elif msg_type == 'transcription':
                # 处理转录文本确认
                transcription_text = data.get('content', '')
                context["transcription"] += transcription_text + " "
                # 发送确认信息
                await websocket.send_json({
                    "clientMsgId": client_msg_id,
                    "code": 0,
                    "msg": "transcription_received"
                })

            elif msg_type == 'audioUrl':
                # 处理音频 URL
                audio_url = data.get('audioUrl', '')
                context["audio_url"] = audio_url
                # 发送确认信息
                await websocket.send_json({
                    "clientMsgId": client_msg_id,
                    "code": 0,
                    "msg": "audioUrl_received"
                })

            elif msg_type == 'end':
                # 处理 'end' 消息
                logger.info(f"收到 'end' 消息，clientMsgId: {client_msg_id}")
                # 处理剩余的音频数据
                if len(context["audio_vad"]) > 0:
                    result = process_vad_audio(
                        context["audio_vad"], sv, lang
                    )
                    logger.debug(f"[process_vad_audio] 最终结果: {result}")
                    if result is not None:
                        # 更新转录上下文
                        context["total_transcription"] += format_str_v3(
                            result[0]['text']) + " "

                        # 发送最终的转录结果
                        response = {
                            "type": "end",
                            "clientMsgId": client_msg_id,
                            "transcriptionText": format_str_v3(result[0]['text'])
                        }
                        await websocket.send_json(response)

                # 可选：发送最终确认消息
                await websocket.send_json({
                    "clientMsgId": client_msg_id,
                    "code": 0,
                    "msg": "Final transcription completed"
                })

                # 关闭 WebSocket 连接
                await websocket.close()
                # 清理上下文
                if client_msg_id in transcription_contexts:
                    del transcription_contexts[client_msg_id]
                break  # 退出循环

            else:
                logger.warning(f"未知的消息类型: {msg_type}")
                # 发送错误信息
                await websocket.send_json({
                    "clientMsgId": client_msg_id,
                    "code": 400,
                    "msg": f"未知的消息类型: {msg_type}"
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket 断开连接，clientMsgId: {client_msg_id}")
        # 清理上下文
        if client_msg_id in transcription_contexts:
            del transcription_contexts[client_msg_id]
    except Exception as e:
        logger.error(f"发生意外错误: {e}")
        await websocket.close()
        if client_msg_id in transcription_contexts:
            del transcription_contexts[client_msg_id]
