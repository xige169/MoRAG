from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.auth.router import router as auth_router
from app.modules.knowledge.router import router as knowledge_router
from app.modules.documents.router import router as documents_router
from app.modules.chat.router import router as chat_router
from app.modules.feedback.router import router as feedback_router
from app.modules.admin.router import router as admin_router

from app.core.database import AsyncSessionLocal
from app.modules.auth.service import create_initial_admin
from app.core.milvus_client import connect_milvus


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_milvus()
    async with AsyncSessionLocal() as db:
        await create_initial_admin(db)
    yield


app = FastAPI(
    title="企业级 RAG 知识库系统",
    version="1.0.0",
    description="多知识库、多模态文档检索增强生成系统",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(knowledge_router, prefix=API_PREFIX)
app.include_router(documents_router, prefix=API_PREFIX)
app.include_router(chat_router, prefix=API_PREFIX)
app.include_router(feedback_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": "1.0.0"}
