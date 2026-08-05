"""App setup. No statics here — nginx serves the SPA and proxies /api in."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .config import cors_origins
from .db import init_db, reset_engines


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await reset_engines()


app = FastAPI(title='JP Conjugation', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(router)
