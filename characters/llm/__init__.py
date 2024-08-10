import os
from functools import cache

from dotenv import load_dotenv

from characters.llm.base import LLM
from characters.logger import get_logger

logger = get_logger(__name__)


load_dotenv()


def get_llm(model) -> LLM:
    model = model or os.getenv("LLM_MODEL_USE", model)

    if model.startswith("qwen"):
        from characters.llm.qwen_llm import TongyiLlm
        logger.info(f'model:{model}')
        return TongyiLlm(model=model)

    if model.startswith("gpt"):
        from characters.llm.openai_llm import OpenaiLlm
        logger.info(f'model:{model}')
        return OpenaiLlm(model=model)
    elif model.startswith("claude"):
        from characters.llm.anthropic_llm import AnthropicLlm
        logger.info(f'model:{model}')
        return AnthropicLlm(model=model)
    elif "localhost" in model:
        # Currently use llama2-wrapper to run local llama models
        local_llm_url = os.getenv("LOCAL_LLM_URL", "")
        if local_llm_url:
            from characters.llm.local_llm import LocalLlm
            logger.info(f'model:{model}')
            return LocalLlm(url=local_llm_url)
        else:
            raise ValueError("LOCAL_LLM_URL not set")
    elif "llama" in model:
        # Currently use Anyscale to support llama models
        from characters.llm.anyscale_llm import AnysacleLlm
        logger.info(f'model:{model}')
        return AnysacleLlm(model=model)

    else:
        raise ValueError(f"Invalid llm model: {model}")
