import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.auth.service import require_admin
from app.models.user import User
from app.modules.admin.schemas import (
    UserCreate, UserPatch, UserOut, AuditLogsResponse, StatsResponse
)
from app.modules.admin import service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_users(db)


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_user(body.model_dump(), db)


@router.patch("/users/{user_id}", response_model=UserOut)
async def patch_user(
    user_id: uuid.UUID,
    body: UserPatch,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.patch_user(user_id, body.model_dump(exclude_none=True), db)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_user(user_id, db)


@router.get("/audit-logs", response_model=AuditLogsResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: uuid.UUID | None = Query(None),
    rating: str | None = Query(None),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_audit_logs(page, page_size, db, user_id=user_id, rating=rating)


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_stats(db)
