import uuid

import anyio
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.chat import ChatMessage, ChatSession
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.modules.chat.schemas import SessionCreate
from app.modules.chat.service import validate_kb_access
from app.modules.feedback.service import _get_feedback_target


class FakeScalarResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class FakeResult:
    def __init__(self, rows=None, row=None):
        self.rows = rows or []
        self.row = row

    def scalars(self):
        return FakeScalarResult(self.rows)

    def one_or_none(self):
        return self.row


class FakeDb:
    def __init__(self, result):
        self.result = result

    async def execute(self, _query):
        return self.result


def test_session_create_rejects_empty_kb_list():
    with pytest.raises(ValidationError):
        SessionCreate(knowledge_base_ids=[])


def test_session_create_rejects_invalid_retrieval_config():
    with pytest.raises(ValidationError):
        SessionCreate(
            knowledge_base_ids=[uuid.uuid4()],
            retrieval_mode="hybrid",
            top_k=100,
            similarity_threshold=1.5,
        )


def test_validate_kb_access_rejects_foreign_kb_for_regular_user():
    user = User(id=uuid.uuid4(), username="u1", hashed_password="x", role="user")
    kb = KnowledgeBase(
        id=uuid.uuid4(),
        name="kb",
        owner_id=uuid.uuid4(),
        is_active=True,
    )
    db = FakeDb(FakeResult(rows=[kb]))

    with pytest.raises(HTTPException) as exc:
        anyio.run(validate_kb_access, [kb.id], user, db)

    assert exc.value.status_code == 403


def test_feedback_target_rejects_foreign_session_for_regular_user():
    user = User(id=uuid.uuid4(), username="u1", hashed_password="x", role="user")
    session = ChatSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        knowledge_base_ids=[uuid.uuid4()],
    )
    message = ChatMessage(
        id=uuid.uuid4(),
        session_id=session.id,
        role="assistant",
        content="answer",
        sources=[],
    )
    db = FakeDb(FakeResult(row=(message, session)))

    with pytest.raises(HTTPException) as exc:
        anyio.run(_get_feedback_target, message.id, user, db)

    assert exc.value.status_code == 403
