import os
import logging
from typing import Optional

from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.schema import BaseMessage, HumanMessage

from realtime_ai_character.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler, LLM
from realtime_ai_character.logger import get_logger
from realtime_ai_character.utils import Character, timed
from langchain_community.embeddings import DashScopeEmbeddings
from langchain_community.vectorstores import Chroma

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

    def get_chroma(self):
        embeddings = DashScopeEmbeddings(
            model="text-embedding-v1", dashscope_api_key=os.environ['DASHSCOPE_API_KEY'])

        chroma = Chroma(
            collection_name="llm",
            embedding_function=embeddings,
            persist_directory="./chroma.db",
        )
        return chroma

    def get_all_documents(self):
        # Custom method to retrieve all documents
        try:
            return self.db._collection.find({})
        except Exception as e:
            logger.error(f"Error retrieving all documents: {e}")
            return []

    def print_all_documents(self):
        try:
            logger.info("Initializing Chroma database...")
            self.db = self.get_chroma()
            logger.info("Chroma database initialized successfully.")

            logger.info("Starting similarity search with an empty query...")
            # 添加try-except块以捕获similarity_search方法中的具体错误
            try:
                all_docs = self.get_all_documents()
            except Exception as e:
                logger.error(f"Error during similarity search: {e}")
                return
            logger.debug(
                f"Search results type: {type(all_docs)}, length: {len(all_docs)}")
            logger.debug(f"Search results content: {all_docs}")

            if not all_docs:
                logger.warning("No documents found in similarity search.")
                return  # 提前退出，避免后续操作

            for i, doc in enumerate(all_docs):
                try:
                    logger.debug(f"Processing document {i+1}/{len(all_docs)}")

                    # 打印每个文档的详细信息以进行调试
                    logger.debug(f"Document {i+1} metadata: {doc.metadata}")
                    logger.debug(f"Document {i+1} content: {doc.page_content}")

                    # 检查 doc 是否包含所有必要的字段
                    if 'id' not in doc.metadata or 'character_name' not in doc.metadata or not hasattr(doc, 'page_content'):
                        logger.warning(
                            f"Document {i+1} is missing required fields.")
                        continue

                    print(f"Document {i+1}/{len(all_docs)}:")
                    print(f"Document ID: {doc.metadata['id']}")
                    print(
                        f"Character Name: {doc.metadata.get('character_name', 'N/A')}")
                    print(f"Content: {doc.page_content}")
                    print("-----")
                except KeyError as e:
                    logger.error(f"KeyError for document {i+1}: {e}")
                except IndexError as e:
                    logger.error(f"IndexError for document {i+1}: {e}")
                except Exception as e:
                    logger.error(f"Unexpected error for document {i+1}: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")


# 调用示例
if __name__ == "__main__":
    qwen_llm = QwenLlm(model="qwen-max")
    qwen_llm.print_all_documents()
