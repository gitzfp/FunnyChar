from uuid import uuid4

from openai.types.chat import ChatCompletionChunk

from characters.utils import Character, timed
from characters.logger import get_logger
from characters.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler, LLM
from characters.database.chroma import get_chroma
from langchain.schema import BaseMessage, HumanMessage
from typing import Optional
import os
from openai import OpenAI
import asyncio

client = OpenAI(
    base_url=os.getenv('OPENAI_BASE_URL'),
    api_key=os.getenv('OPENAI_API_KEY', 'api_key')
)
logger = get_logger(__name__)


class OpenaiLlm(LLM):
    def __init__(self, model):
        from langchain.chat_models import ChatOpenAI

        self.chat_open_ai = ChatOpenAI(
            openai_api_base=os.getenv('OPENAI_BASE_URL'),
            model=model, temperature=0.5, streaming=True, openai_proxy="http://127.0.0.1:8118")
        self.config = {"model": model, "temperature": 0.5, "streaming": True}
        self.db = get_chroma()
        self.conversation_id = str(uuid4())  # Initialize conversation ID
        logger.info(
            f"Initialized OpenaiLlm with model: {model}, config: {self.config}, conversation id: {self.conversation_id}")

    def get_config(self):
        return self.config

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

        response_stream = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": character.llm_system_prompt},
                {"role": "user", "content": user_input}
            ],
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
                    await callback.on_new_token(chunk)
                    if audioCallback is not None:
                        await audioCallback.on_llm_new_token(chunk)  # 调用音频回调
            self.conversation_id = message.id
            logger.debug(
                f"conversation_id:{self.conversation_id}Final response: {reply}=====》》》》====message: {message}")

        run_id = uuid4()
        end_message = f"[end={run_id}]"
        await callback.on_llm_end(end_message)
        return reply
