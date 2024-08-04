import os
from typing import Optional

from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.schema import BaseMessage, HumanMessage

from characters.database.chroma import get_chroma
from characters.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler, LLM
from characters.logger import get_logger
from characters.utils import Character, timed

logger = get_logger(__name__)


class OpenaiLlm(LLM):
    def __init__(self, model):
        if os.getenv("OPENAI_API_TYPE") == "azure":
            from langchain.chat_models import AzureChatOpenAI

            self.chat_open_ai = AzureChatOpenAI(
                deployment_name=os.getenv(
                    "OPENAI_API_MODEL_DEPLOYMENT_NAME", "gpt-35-turbo"),
                model=model,
                temperature=0.5,
                streaming=True,
            )
        else:
            from langchain.chat_models import ChatOpenAI

            self.chat_open_ai = ChatOpenAI(
                openai_api_base=os.getenv('OPENAI_BASE_URL'),
                model=model, temperature=0.5, streaming=True, openai_proxy="http://127.0.0.1:8118")
        self.config = {"model": model, "temperature": 0.5, "streaming": True}
        self.db = get_chroma()

        logger.info(
            f"Initialized OpenaiLlm with model: {model}, config: {self.config}")

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

        # 1. Generate context
        context = self._generate_context(user_input, character)
        logger.debug(f"Generated context: {context}")

        # 2. Add user input to history
        history.append(
            HumanMessage(
                content=character.llm_user_prompt.format(
                    context=context, query=user_input)
            )
        )
        logger.debug(f"History after adding user input: {history}")

        # 3. Generate response
        callbacks = [callback, StreamingStdOutCallbackHandler()]
        if audioCallback is not None:
            callbacks.append(audioCallback)
        logger.info("Generating response from OpenAI model...")
        response = await self.chat_open_ai.agenerate(
            [history], callbacks=callbacks, metadata=metadata
        )
        logger.info(f"Response: {response}")
        return response.generations[0][0].text

    def _generate_context(self, query, character: Character) -> str:
        logger.info(
            f"Generating context for query: {query} and character: {character.name}")
        docs = self.db.similarity_search(query)
        docs = [d for d in docs if d.metadata["character_name"] == character.name]
        logger.info(
            f"Found {len(docs)} documents, character_name: {character.name}, docs: {docs}")

        context = "\n".join([d.page_content for d in docs])
        return context
