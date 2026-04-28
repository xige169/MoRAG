from app.modules.documents import processor


def test_embedding_batches_do_not_exceed_dashscope_limit():
    chunks = [{"content": f"chunk-{i}"} for i in range(23)]

    batches = list(processor._chunk_embedding_batches(chunks))

    assert [len(batch) for batch in batches] == [10, 10, 3]


def test_embed_batch_uses_configured_vector_dimension(monkeypatch):
    calls = {}

    class FakeTextEmbedding:
        @staticmethod
        def call(**kwargs):
            calls.update(kwargs)

            class Response:
                status_code = 200
                output = {"embeddings": [{"embedding": [0.0] * 1536}]}

            return Response()

    monkeypatch.setattr(processor, "TextEmbedding", FakeTextEmbedding)

    import asyncio

    asyncio.run(processor._embed_batch(["hello"]))

    assert calls["dimension"] == processor.settings.embed_dim
