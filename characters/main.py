import warnings

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from characters.audio.speech_to_text import get_speech_to_text
from characters.audio.text_to_speech import get_text_to_speech
from characters.character_catalog.catalog_manager import CatalogManager
from characters.restful_routes import router as restful_router
from characters.chat_routes import router as chat_router
from characters.utils import ConnectionManager
from characters.websocket_routes import router as websocket_router

import ssl
from aiohttp import TCPConnector

# Monkey Patching
original_sslcontext = ssl.create_default_context


def patched_sslcontext(*args, **kwargs):
    context = original_sslcontext(*args, **kwargs)
    # 允许 TLS in TLS
    return context


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Change to domains if you deploy this to production
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restful_router)
app.include_router(chat_router)
app.include_router(websocket_router)

# initializations
CatalogManager.initialize()
ConnectionManager.initialize()
get_text_to_speech()
get_speech_to_text()

# suppress deprecation warnings
warnings.filterwarnings("ignore", module="whisper")
