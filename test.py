import os
import logging
from typing import Optional

from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.schema import BaseMessage, HumanMessage

from realtime_ai_character.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler, LLM
from realtime_ai_character.logger import get_logger
from realtime_ai_character.utils import Character, timed

logger = get_logger(__name__)
os.environ['DASHSCOPE_API_KEY'] = "sk-b9bbfde1f3fb4961aeb3aa0d1e333d9c"

# 选用RolePlay 配置agent
try:
    from modelscope_agent.agents.role_play import RolePlay  # NOQA
    from modelscope_agent.memory import MemoryWithRetrievalKnowledge  # 确保正确导入
    logger.info("modelscope modules imported successfully")
except ImportError as e:
    logger.error(f"Error importing modelscope modules: {e}")
    raise


class QwenLlm(LLM):
    def __init__(self, model):
        self.config = {'model': 'qwen-max', 'model_server': 'dashscope'}
        logger.info(f"QwenLlm initialized with config: {self.config}")

    def get_config(self):
        logger.debug("Fetching LLM config")
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
        logger.debug(f"Character configuration: {character}")

        try:
            bot = RolePlay(function_list=[], llm=self.config,
                           instruction=character.llm_user_prompt)
            logger.info("RolePlay bot initialized")
        except ImportError as e:
            logger.error(f"Error initializing RolePlay bot: {e}")
            raise

        DEFAULT_UUID_HISTORY = "./history"
        storage_path = "./config"
        memory_history_path = os.path.join(
            DEFAULT_UUID_HISTORY, 'default_user.json')
        memory_agent_name = 'default_memory'

        logger.debug("Initializing memory with retrieval knowledge")
        try:
            memory = MemoryWithRetrievalKnowledge(
                storage_path=storage_path,
                name=memory_agent_name,
                memory_path=memory_history_path,
            )
            logger.info("MemoryWithRetrievalKnowledge initialized")
        except ImportError as e:
            logger.error(
                f"Error initializing MemoryWithRetrievalKnowledge: {e}")
            raise

        logger.info("Running memory retrieval")
        ref_doc = memory.run(
            query=user_input, url="./rebyte-concepts.txt", checked=True)

        logger.info("Generating response from bot")
        response = bot.run(user_input, remote=False,
                           print_info=True, ref_doc=ref_doc)

        text = ''.join(response)
        logger.info(f"Generated response: {text}")

        return text


# 在你的入口文件中设置日志级别和格式
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logger = get_logger(__name__)

    # 你的应用程序逻辑
    # e.g., app.run()
