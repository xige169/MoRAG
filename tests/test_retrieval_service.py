import pytest

from app.modules.retrieval import service


@pytest.mark.anyio
async def test_embed_query_uses_configured_vector_dimension(monkeypatch):
    calls = {}

    class FakeTextEmbedding:
        @staticmethod
        def call(**kwargs):
            calls.update(kwargs)

            class Response:
                status_code = 200
                output = {"embeddings": [{"embedding": [0.0] * 1536}]}

            return Response()

    monkeypatch.setattr(service, "TextEmbedding", FakeTextEmbedding)

    await service.embed_query("hello")

    assert calls["dimension"] == service.settings.embed_dim
