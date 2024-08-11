from uuid import uuid4

from openai.types.chat import ChatCompletionChunk
from characters.utils import Character, timed
from characters.logger import get_logger
from characters.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler, LLM
from characters.database.chroma import get_chroma
from langchain.schema import BaseMessage, HumanMessage, AIMessage, SystemMessage
from typing import Optional
import os
from openai import OpenAI

logger = get_logger(__name__)


class OpenaiLlm(LLM):
    def __init__(self, model):
        # 获取配置
        config = self.get_config()

        # 使用从 get_config() 获取的配置初始化 OpenAI
        self.chat_open_ai = OpenAI(
            base_url=config["base_url"],
            api_key=config["api_key"]
        )
        self.db = get_chroma()
        self.conversation_id = str(uuid4())  # Initialize conversation ID
        logger.info(
            f"Initialized OpenaiLlm with model: {model}, conversation id: {self.conversation_id}")

    def get_config(self):
        # 实现 get_config 方法
        return {
            "base_url": os.getenv('OPENAI_BASE_URL'),
            "api_key": os.getenv('OPENAI_API_KEY', 'api_key')
        }

    @timed
    async def achat(
        self,
        history: list[BaseMessage],
        user_input: str,
        user_id: str,
        character: Character,
        callback: AsyncCallbackTextHandler,
        audioCallback: Optional[AsyncCallbackAudioHandler] = None,
        metadata: Optional[dict] = None,
        *args,
        **kwargs,
    ) -> str:
        logger.info(f"Received user input: {user_input}")
        logger.debug(f"History before adding user input: {history}")
        logger.debug(f"Character configuration: {character}")

        # 将 history 和 character.llm_system_prompt 结合起来
        if len(character.llm_system_prompt):
            messages = [
                {"role": "system", "content": character.llm_system_prompt}]

        # 将 history 转换为合适的格式并添加到 messages 中
        for msg in history:
            if isinstance(msg, SystemMessage):
                messages.append({"role": "system", "content": msg.content})
            elif isinstance(msg, HumanMessage):
                messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                messages.append({"role": "assistant", "content": msg.content})

        # 添加用户当前输入
        if len(user_input) > 0:
            messages.append({"role": "user", "content": user_input})

        # 调用 OpenAI 的 API
        response_stream = self.chat_open_ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            user=self.conversation_id,
            stream=True  # Ensure streaming is enabled
        )

        reply = ""
        for message in response_stream:
            if isinstance(message, ChatCompletionChunk):
                delta = message.choices[0].delta
                if delta and delta.content:
                    chunk = delta.content
                    reply += chunk
                    await callback.on_llm_new_token(chunk)
                    if audioCallback is not None:
                        await audioCallback.on_llm_new_token(chunk)  # 调用音频回调
            self.conversation_id = message.id

        logger.debug(
            f"conversation_id:{self.conversation_id}Final response: {reply}=====》》》》====message: {message}")
        run_id = uuid4()
        reply += f"[end={run_id}]"
        logger.info("Calling on_llm_end callback %s",
                    reply, exc_info="on_llm_end调用")
        await callback.on_llm_end(reply)
        if audioCallback is not None:
            await audioCallback.on_llm_end(reply)  # 调用音频回调
        logger.info(f"After calling on_llm_end,{reply}")
        return reply
