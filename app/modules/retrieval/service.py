import time
import uuid
import dashscope
from dashscope import TextEmbedding
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.document import Document, DocumentChunk
from app.core.milvus_client import get_collection
from app.core.config import get_settings

settings = get_settings()
dashscope.api_key = settings.dashscope_api_key


async def embed_query(text: str) -> list[float]:
    resp = TextEmbedding.call(
        model=settings.embed_model,
        input=[text],
        dimension=settings.embed_dim,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Embedding error: {resp.message}")
    return resp.output["embeddings"][0]["embedding"]


async def retrieve(
    query: str,
    kb_ids: list[uuid.UUID],
    retrieval_mode: str,
    top_k: int,
    similarity_threshold: float,
    db: AsyncSession,
) -> tuple[list[dict], int]:
    start = time.monotonic()
    query_embedding = await embed_query(query)

    limit = top_k * 3 if retrieval_mode == "broad" else top_k * 2

    raw_results = []
    for kb_id in kb_ids:
        try:
            col = get_collection(str(kb_id))
            hits = col.search(
                data=[query_embedding],
                anns_field="embedding",
                param={"metric_type": "COSINE", "params": {"ef": 64}},
                limit=limit,
                expr="is_enabled == true",
                output_fields=["chunk_pg_id", "document_id", "content"],
            )
            for hit in hits[0]:
                if hit.score >= similarity_threshold:
                    raw_results.append({
                        "score": hit.score,
                        "milvus_id": hit.id,
                        "chunk_pg_id": hit.entity.get("chunk_pg_id"),
                        "document_id": hit.entity.get("document_id"),
                        "content": hit.entity.get("content", ""),
                    })
        except Exception:
            continue

    raw_results.sort(key=lambda x: x["score"], reverse=True)
    raw_results = raw_results[:top_k]

    if not raw_results:
        elapsed = int((time.monotonic() - start) * 1000)
        return [], elapsed

    # Enrich with PG metadata
    chunk_ids = []
    for r in raw_results:
        cpid = r.get("chunk_pg_id")
        if cpid:
            try:
                chunk_ids.append(uuid.UUID(cpid))
            except ValueError:
                pass

    chunk_map: dict[str, DocumentChunk] = {}
    if chunk_ids:
        result = await db.execute(
            select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids))
        )
        chunk_map = {str(c.id): c for c in result.scalars().all()}

    # Fetch document names
    doc_ids_set = {r["document_id"] for r in raw_results if r.get("document_id")}
    doc_map: dict[str, str] = {}
    if doc_ids_set:
        try:
            d_ids = [uuid.UUID(d) for d in doc_ids_set]
            result = await db.execute(
                select(Document).where(Document.id.in_(d_ids))
            )
            doc_map = {str(d.id): d.original_name for d in result.scalars().all()}
        except Exception:
            pass

    enriched = []
    for i, r in enumerate(raw_results):
        chunk = chunk_map.get(r.get("chunk_pg_id", ""))
        enriched.append({
            "index": i + 1,
            "chunk_id": r.get("chunk_pg_id"),
            "doc_id": r.get("document_id"),
            "doc_name": doc_map.get(r.get("document_id", ""), "Unknown"),
            "page_number": chunk.page_number if chunk else None,
            "snippet": (r["content"])[:300],
            "content": r["content"],
            "score": r["score"],
        })

    elapsed = int((time.monotonic() - start) * 1000)
    return enriched, elapsed
