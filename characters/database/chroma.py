import os
from dotenv import load_dotenv

from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma

from characters.logger import get_logger
from langchain_community.embeddings import DashScopeEmbeddings


load_dotenv()
logger = get_logger(__name__)


def get_qwen_chroma():
    embeddings = DashScopeEmbeddings(
        model="text-embedding-v1", dashscope_api_key=os.getenv("QWEN_API_KEY"))

    chroma = Chroma(
        collection_name="qwen",
        embedding_function=embeddings,
        persist_directory="./chroma.db",
    )
    return chroma


def get_chroma(embedding: bool = True):
    if embedding:
        if os.getenv("QWEN_API_KEY"):
            return get_qwen_chroma()
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise Exception(
                "OPENAI_API_KEY is required to generate embeddings")
        if os.getenv("OPENAI_API_TYPE") == "azure":
            embedding_function = OpenAIEmbeddings(
                openai_api_key=openai_api_key,
                deployment=os.getenv(
                    "OPENAI_API_EMBEDDING_DEPLOYMENT_NAME", "text-embedding-ada-002"
                ),
                chunk_size=1,
            )
        else:
            embedding_function = OpenAIEmbeddings(
                openai_api_key=openai_api_key)
    else:
        embedding_function = None

    chroma = Chroma(
        collection_name="llm",
        embedding_function=embedding_function,
        persist_directory="./chroma.db",
    )
    return chroma
