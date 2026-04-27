from pymilvus import connections, utility, Collection, CollectionSchema, FieldSchema, DataType
from app.core.config import get_settings

settings = get_settings()


def connect_milvus() -> None:
    connections.connect("default", host=settings.milvus_host, port=settings.milvus_port)


def kb_collection_name(kb_id: str) -> str:
    return "kb_" + kb_id.replace("-", "")


def create_kb_collection(kb_id: str) -> None:
    name = kb_collection_name(kb_id)
    if utility.has_collection(name):
        return
    fields = [
        FieldSchema("id", DataType.VARCHAR, max_length=64, is_primary=True),
        FieldSchema("chunk_pg_id", DataType.VARCHAR, max_length=64),
        FieldSchema("document_id", DataType.VARCHAR, max_length=64),
        FieldSchema("content", DataType.VARCHAR, max_length=4096),
        FieldSchema("is_enabled", DataType.BOOL),
        FieldSchema("embedding", DataType.FLOAT_VECTOR, dim=settings.embed_dim),
    ]
    schema = CollectionSchema(fields=fields)
    col = Collection(name=name, schema=schema)
    col.create_index(
        field_name="embedding",
        index_params={
            "index_type": "HNSW",
            "metric_type": "COSINE",
            "params": {"M": 16, "efConstruction": 200},
        },
    )
    col.load()


def drop_kb_collection(kb_id: str) -> None:
    name = kb_collection_name(kb_id)
    if utility.has_collection(name):
        utility.drop_collection(name)


def get_collection(kb_id: str) -> Collection:
    name = kb_collection_name(kb_id)
    col = Collection(name)
    col.load()
    return col
