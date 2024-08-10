from typing import Optional, List, Dict, Any
from uuid import uuid4

from langchain.schema import BaseMessage, HumanMessage, AIMessage, SystemMessage

from characters.llm.base import AsyncCallbackAudioHandler, AsyncCallbackTextHandler, LLM
from characters.logger import get_logger
from characters.utils import Character, timed
from characters.database.chroma import get_chroma

logger = get_logger(__name__)

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


class TongyiLlm(LLM):
    def __init__(self, model):
        self.config = {'model': 'qwen-max', 'model_server': 'dashscope'}
        self.db = get_chroma(model)

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

            # 将 history 和 character.llm_system_prompt 结合起来
            messages = []
            for msg in history:
                if isinstance(msg, SystemMessage):
                    # messages.append({"role": "system", "content": msg.content})
                    continue
                elif isinstance(msg, HumanMessage):
                    messages.append({"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    messages.append(
                        {"role": "assistant", "content": msg.content})

            logger.debug(f"History after adding user input: {history}")

            bot = RolePlay(
                function_list=[], llm=self.config, instruction=context)
            response = bot.run(user_input, messages)

            text = ''
            for chunk in response:
                text += chunk
                await callback.on_llm_new_token(chunk)  # 调用callback

                if audioCallback is not None:
                    await audioCallback.on_llm_new_token(chunk)  # 调用音频回调

            # Append the end identifier to the response text
            run_id = uuid4()
            text += f"[end={run_id}]"

            await callback.on_llm_end(text)
            logger.info(
                f"qwen response===========: {text}")
            if audioCallback is not None:
                await audioCallback.on_llm_end(text)  # 调用音频回调

            return text

        except Exception as e:
            logger.error(f"An error occurred in achat: {e}")
            raise

    def search_documents_by_sql(self, query, conn):
        import sqlite3
        conn = sqlite3.connect('./chroma.db/chroma.sqlite3')

        conn.close()
        cursor = conn.cursor()
        sql_query = "SELECT * FROM embedding_metadata WHERE string_value LIKE ?"
        cursor.execute(sql_query, ('%' + query + '%',))
        rows = cursor.fetchall()
        # 打印 SQL 查询结果
        print("SQL search results:")
        for row in rows:
            print(row)
        return rows

    def _generate_context(self, query: str, character: Character) -> str:
        logger.info(
            f"Generating context for query: {query} and character: {character.name}")

        # 打印查询的原始输入
        logger.debug(f"Original query: {query}")

        # 执行相似性搜索
        docs = self.db.similarity_search(query)

        # 打印找到的文档元数据
        logger.debug(f"Found documents metadata: {[d.metadata for d in docs]}")

        # 过滤文档并打印过滤后的文档内容
        docs = [d for d in docs if d.metadata["character_name"] == character.name]
        logger.info(
            f"Found {len(docs)} documents for character '{character.name}' with the following contents: {[d.page_content for d in docs]}")

        # 生成上下文并打印
        context = "\n".join([d.page_content for d in docs])
        logger.debug(f"Generated context: {context}")

        # # 添加系统提示
        full_context = f"{character.llm_system_prompt}\n{context}"
        logger.debug(f"Generated full context: {full_context}")

        return full_context
