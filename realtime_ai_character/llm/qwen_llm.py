import os
from typing import Optional, List, Dict, Any
from uuid import uuid4

from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.schema import BaseMessage, HumanMessage, AIMessage

from realtime_ai_character.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler, LLM
from realtime_ai_character.logger import get_logger
from realtime_ai_character.utils import Character, timed
from langchain_community.embeddings import DashScopeEmbeddings
from langchain_community.vectorstores import Chroma

logger = get_logger(__name__)
os.environ['DASHSCOPE_API_KEY'] = "sk-b9bbfde1f3fb4961aeb3aa0d1e333d9c"

# 选用RolePlay 配置agent
from modelscope_agent.agents.role_play import RolePlay  # NOQA


class ChatGeneration:
    def __init__(self, text: str, generation_info: Dict[str, str], message: AIMessage):
        self.text = text
        self.generation_info = generation_info
        self.message = message


class RunInfo:
    def __init__(self, run_id: uuid4):
        self.run_id = run_id


class QwenLlm(LLM):
    def __init__(self, model):
        self.config = {'model': 'qwen-max', 'model_server': 'dashscope'}
        self.db = self.get_chroma()

    def get_chroma(self):
        embeddings = DashScopeEmbeddings(
            model="text-embedding-v1", dashscope_api_key=os.environ['DASHSCOPE_API_KEY'])

        chroma = Chroma(
            collection_name="llm",
            embedding_function=embeddings,
            persist_directory="./chroma.db",
        )
        return chroma

    def get_config(self):
        return self.config

    @timed
    async def achat(
        self,
        history: List[BaseMessage],
        user_input: str,
        user_id: str,
        character: Character,
        callback: AsyncCallbackTextHandler,
        audioCallback: Optional[AsyncCallbackAudioHandler] = None,
        metadata: Optional[Dict[str, Any]] = None,
        *args,
        **kwargs,
    ) -> str:
        try:
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

            bot = RolePlay(
                function_list=[], llm=self.config, instruction=context)
            response = bot.run(user_input)  # 确保这里是同步调用

            text = ''
            for chunk in response:
                text += chunk
                await callback.on_new_token(chunk)  # 调用callback

            ai_message = AIMessage(content=text, response_metadata={
                                   'finish_reason': 'stop'})
            chat_generation = ChatGeneration(text=text, generation_info={
                                             'finish_reason': 'stop'}, message=ai_message)
            run_id = uuid4()
            run_info = RunInfo(run_id)

            # Append the end identifier to the response text
            text += f"[end={run_info.run_id}]"
            # callback.on_new_token(f"[end={run_info.run_id}]")
            await callback.on_llm_end(text)

            logger.info(
                f"qwen response: {text}=========metadata: {metadata} run_info: {run_info} text: {chat_generation.text}")

            return chat_generation.text

        except Exception as e:
            logger.error(f"An error occurred in achat: {e}")
            raise

    def _generate_context(self, query: str, character: Character) -> str:
        logger.info(
            f"Generating context for query: {query} and character: {character.name}")
        docs = self.db.similarity_search(query)
        docs = [d for d in docs if d.metadata["character_name"] == character.name]
        logger.info(
            f"Found {len(docs)} documents, character_name: {character.name}, docs: {docs}")

        context = "\n".join([d.page_content for d in docs])
        return context
