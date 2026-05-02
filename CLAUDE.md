# 企业级多模态 RAG 知识库系统

## 项目概述

本系统是一套面向企业内部私有化部署的 RAG（检索增强生成）知识库问答平台。  
核心能力：多知识库管理、多格式文档解析、向量语义检索、流式问答（SSE）、原文溯源引用、反馈闭环与审计日志。

- **部署方式**：Docker Compose 单机私有化
- **用户规模**：日活 ~15 人，文档总量数十份
- **默认管理员账号**：`admin` / `admin123`（首次启动自动初始化）

---

## 技术栈

### 后端
| 层次 | 技术 |
|------|------|
| 框架 | Python 3.11 + FastAPI (async) |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| 数据库 | PostgreSQL 16 |
| 向量库 | Milvus Standalone v2.4 |
| LLM | 阿里云百炼 `qwen-plus`（DashScope SDK） |
| Embedding | 阿里云百炼 `text-embedding-v4`（1536 维） |
| 认证 | JWT（python-jose）+ bcrypt 密码哈希 |
| 文档解析 | PyMuPDF（PDF）/ python-docx / openpyxl / 原生文本 |
| 分块 | langchain-text-splitters `RecursiveCharacterTextSplitter` |
| 迁移 | Alembic |
| Conda 环境 | `agent`（Python 3.11） |

### 前端
| 层次 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 8 + @tailwindcss/vite（Tailwind v4） |
| 路由 | React Router v7 |
| 状态管理 | Zustand v5 |
| HTTP 客户端 | Axios（baseURL: `/api/v1`） |
| UI 组件 | Radix UI + class-variance-authority |
| 通知 | sonner |
| Markdown | react-markdown |

---

## 目录结构

```
E:\projects\RAG\
├── .env                          # 环境变量（不提交 Git）
├── .env.example                  # 环境变量模板
├── docker-compose.yml            # 完整服务编排
├── Dockerfile                    # API 服务镜像（continuumio/miniconda3）
├── requirements.txt              # Python 依赖
├── alembic.ini                   # Alembic 配置
├── pytest.ini                    # pytest 配置（asyncio_mode = auto）
├── nginx/
│   └── nginx.conf                # 反向代理 + SSE 长连接配置
├── alembic/
│   ├── env.py                    # 使用 sync_database_url，导入所有 ORM 模型
│   └── versions/                 # 迁移版本文件
├── app/
│   ├── main.py                   # FastAPI 应用入口，lifespan 初始化
│   ├── core/
│   │   ├── config.py             # pydantic-settings 统一配置，@lru_cache
│   │   ├── database.py           # SQLAlchemy async engine + get_db() 依赖
│   │   ├── milvus_client.py      # Milvus 连接、collection 创建/删除
│   │   └── security.py           # JWT 签发/解析、bcrypt 密码哈希
│   ├── models/
│   │   ├── base.py               # DeclarativeBase
│   │   ├── user.py               # User（id/username/email/role/is_active）
│   │   ├── knowledge_base.py     # KnowledgeBase
│   │   ├── document.py           # Document + DocumentChunk
│   │   ├── chat.py               # ChatSession + ChatMessage（JSONB sources）
│   │   └── feedback.py           # MessageFeedback（UniqueConstraint）
│   └── modules/
│       ├── auth/                 # 登录/刷新/me
│       ├── knowledge/            # 知识库 CRUD + Milvus collection 管理
│       ├── documents/            # 文档上传/管理/处理流水线
│       │   ├── processor.py      # 解析→分块→Embedding→Milvus→PG
│       │   └── parsers/          # pdf.py / docx.py / xlsx.py / text.py
│       ├── chat/                 # 会话管理 + SSE 流式问答
│       ├── retrieval/
│       │   ├── service.py        # 向量检索（Milvus COSINE + 阈值过滤）
│       │   └── prompt_builder.py # 提示词构建 + [N] 引用注入
│       ├── feedback/             # 消息评价（up/down）
│       └── admin/                # 用户管理 + 审计日志 + 统计
├── tests/
│   ├── conftest.py
│   └── test_auth.py
└── frontend/
    ├── package.json
    ├── vite.config.ts            # Vite + @tailwindcss/vite + 代理 /api→:8000
    ├── tsconfig.json
    ├── index.html                # 挂载 Google Fonts（Space Grotesk / DM Sans）
    └── src/
        ├── main.tsx              # 入口
        ├── App.tsx               # RouterProvider + Toaster + TooltipProvider
        ├── router.tsx            # 路由树 + RequireAuth + RequireAdmin 守卫
        ├── vite-env.d.ts
        ├── styles/globals.css    # Tailwind v4 @theme 暗色主题变量
        ├── types/index.ts        # 全局 TypeScript 接口定义
        ├── lib/utils.ts          # cn() / formatDate() / truncate()
        ├── services/             # API 调用层（axios）
        │   ├── api.ts            # axios 实例 + 401 拦截 + token 管理
        │   ├── auth.ts
        │   ├── knowledge.ts
        │   ├── documents.ts
        │   ├── chat.ts           # SSE 流式消息（fetch ReadableStream）
        │   ├── feedback.ts
        │   └── admin.ts
        ├── stores/               # Zustand 状态管理
        │   ├── authStore.ts      # 登录/登出/checkAuth
        │   ├── chatStore.ts      # 会话列表、SSE 流式消息、feedback
        │   └── knowledgeStore.ts # 知识库 + 文档管理
        ├── components/
        │   ├── ui/               # 基础组件（Button/Input/Dialog/Table 等）
        │   ├── layout/           # AppLayout + Sidebar（自适应）
        │   ├── chat/             # MessageList / MessageItem / ChatInput
        │   └── knowledge/        # StatusBadge / DocumentUpload
        └── pages/
            ├── LoginPage.tsx
            ├── ChatPage.tsx          # 含新建对话弹窗（选知识库+检索模式）
            ├── KnowledgePage.tsx     # 知识库卡片列表
            ├── KnowledgeDetailPage.tsx # 文档表格 + 切片预览 + 3s 轮询
            └── admin/
                ├── UsersPage.tsx
                ├── AuditPage.tsx     # 分页 + rating 筛选 + 详情弹窗
                └── StatsPage.tsx
```

---

## API 接口

> Base URL: `/api/v1`  
> 认证：除 `/auth/login` 外所有接口均需携带 `Authorization: Bearer <token>`  
> 管理员接口另需 `role=admin`

### 认证模块 `/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 用户名密码登录，返回 access_token + refresh_token |
| POST | `/auth/refresh` | 使用 refresh_token 换取新 access_token |
| GET  | `/auth/me` | 获取当前用户信息 |

### 知识库模块 `/knowledge-bases`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/knowledge-bases` | user | 列出知识库（user 只见自己的，admin 见全部） |
| POST   | `/knowledge-bases` | user | 创建知识库 |
| GET    | `/knowledge-bases/{kb_id}` | user | 获取详情（含 doc_count） |
| PUT    | `/knowledge-bases/{kb_id}` | owner/admin | 更新名称/描述 |
| DELETE | `/knowledge-bases/{kb_id}` | owner/admin | 删除（级联删除向量/切片/文档） |

### 文档模块 `/knowledge-bases/{kb_id}/documents`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST   | `…/documents` | user | 批量上传（multipart），自动触发后台处理 |
| GET    | `…/documents` | user | 列出文档（含 status） |
| GET    | `…/documents/{doc_id}` | user | 文档详情 |
| PATCH  | `…/documents/{doc_id}` | user | 重命名 / 启用 / 禁用 |
| DELETE | `…/documents/{doc_id}` | user | 删除文档 + 向量 |
| GET    | `…/documents/{doc_id}/chunks` | **admin** | 查看分块内容 |
| POST   | `…/documents/{doc_id}/reprocess` | **admin** | 重新处理失败文档 |

### 会话与问答 `/chat`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST   | `/chat/sessions` | 创建会话（指定知识库、检索模式、top_k 等） |
| GET    | `/chat/sessions` | 列出当前用户的会话 |
| GET    | `/chat/sessions/{session_id}` | 获取会话详情及配置 |
| PATCH  | `/chat/sessions/{session_id}` | 更新标题/系统提示/检索配置 |
| DELETE | `/chat/sessions/{session_id}` | 软删除会话 |
| GET    | `/chat/sessions/{session_id}/messages` | 获取历史消息列表 |
| POST   | `/chat/sessions/{session_id}/messages` | 发送消息（返回 SSE 流） |
| DELETE | `/chat/sessions/{session_id}/messages` | 清空会话历史 |

**SSE 事件格式**
```
data: {"type": "content", "delta": "根据第三条规定[1]，"}
data: {"type": "sources", "sources": [{...}]}
data: {"type": "done", "message_id": "uuid", "usage": {...}}
data: {"type": "no_context", "message": "未找到相关内容…"}
data: {"type": "error", "code": "...", "message": "..."}
```

### 反馈模块 `/feedback`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST  | `/feedback/messages/{message_id}` | 提交评价（up/down + 可选原因） |
| PATCH | `/feedback/messages/{message_id}` | 更新评价 |

### 管理模块 `/admin`（需 admin 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/admin/users` | 列出所有用户 |
| POST   | `/admin/users` | 创建用户 |
| PATCH  | `/admin/users/{user_id}` | 修改角色 / 激活状态 / 密码 |
| DELETE | `/admin/users/{user_id}` | 删除用户 |
| GET    | `/admin/audit-logs` | 问答审计日志（分页 + rating 筛选） |
| GET    | `/admin/stats` | 系统概览统计（用户数/文档数/满意度等） |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查，返回 `{"status": "ok"}` |
| GET | `/docs` | Swagger UI（FastAPI 自动生成） |
| GET | `/redoc` | ReDoc 文档 |

---

## 启动命令

### 环境准备

```bash
# 1. 复制并填写环境变量
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY、数据库密码、JWT SECRET_KEY 等

# 2. 在 conda 环境 agent 中安装依赖（本地开发）
conda activate agent
pip install -r requirements.txt
```

### 基础设施（Docker）

```bash
# 启动 PostgreSQL + Milvus（etcd + MinIO）
docker compose up -d postgres etcd minio milvus

# 等待 Milvus 就绪（约 30-60 秒）
docker compose logs -f milvus
```

### 数据库迁移

```bash
conda activate agent

# 首次建表
alembic upgrade head

# 新增迁移（修改模型后）
alembic revision --autogenerate -m "描述"
alembic upgrade head
```

### 后端开发服务器

```bash
conda activate agent
uvicorn app.main:app --reload --port 8000
# 访问 http://localhost:8000/docs
```

### 前端开发服务器

```bash
cd frontend
npm install          # 首次安装
npm run dev          # 启动 http://localhost:5173
```

### 完整 Docker Compose 启动

```bash
# 构建并启动全部服务（包含 API + Nginx）
docker compose up -d --build

# 查看日志
docker compose logs -f api

# 停止
docker compose down
```

服务地址：
- 前端（Nginx）: `http://localhost:80`
- API 文档: `http://localhost:8000/docs`
- Milvus: `localhost:19530`（gRPC/SDK 端口，不是 HTTP 页面，浏览器不能用 `http://localhost:19530/` 访问）
- PostgreSQL: `localhost:5432`（数据库协议端口，不是 HTTP 页面，浏览器不能用 `http://localhost:5432/` 访问）

服务连接方式：
- PostgreSQL 本地验证：`docker exec -it rag-postgres-1 psql -U raguser -d ragdb`
- Milvus 本地验证：`conda run -n agent python -c "from pymilvus import connections, utility; connections.connect('default', host='localhost', port='19530'); print(utility.list_collections())"`
- 如需网页管理界面，PostgreSQL 可额外部署 pgAdmin，Milvus 可额外部署 Attu；当前 compose 默认只暴露服务协议端口。

### 运行测试

```bash
conda activate agent
pytest tests/ -v
```

---

## RAG 流水线说明

### 文档处理流水线

```
上传文件 → 保存到 uploads/ → DB status=pending
  → BackgroundTask:
      1. status = processing
      2. CPU 密集型解析在 ProcessPoolExecutor 中运行（避免阻塞事件循环）
         PDF  → PyMuPDF（保留页码）
         DOCX → python-docx
         XLSX → openpyxl
         MD/TXT/CSV → 原生读取
      3. RecursiveCharacterTextSplitter（chunk_size=500, overlap=50）
      4. 批量 Embedding（每批最多 10 条 → DashScope text-embedding-v4，显式 dimension=1536）
      5. 写入 Milvus（HNSW COSINE 索引，dim=1536）
      6. 写入 PostgreSQL document_chunks 表
      7. status = ready, chunk_count = N
  → 失败 → status = failed, error_message = traceback
```

### 检索与生成流水线

```
用户提问
  → 历史消息拼接（最近 6 条，用于代词指代解析）
  → Query Embedding（DashScope text-embedding-v4，显式 dimension=1536）
  → Milvus COSINE 向量检索（过滤 is_enabled=true）
     - Precise 模式：top_k=5，threshold=0.72
     - Broad   模式：top_k=10，threshold=0.50
  → 空结果 → 推送 no_context 事件，不调用 LLM
  → 构建 Prompt（[N] 引用编号 + 历史消息 + 系统角色）
  → DashScope qwen-plus（stream=True, incremental_output=True）
  → SSE 逐 token 推送 content delta
  → 流结束 → 解析 [N] 引用 → 推送 sources + done 事件
  → 持久化 ChatMessage（content + sources JSONB）到 PostgreSQL
```

---

## Milvus Collection 命名规则

每个知识库对应一个独立的 Milvus Collection：

```python
collection_name = "kb_" + kb_id.replace("-", "")
# 示例：kb_550e8400e29b41d4a716446655440000
```

---

## 注意事项

### 依赖与兼容性

- **passlib 与 bcrypt 不兼容**：`bcrypt>=4.0` 删除了 `__about__` 属性，导致 passlib 报错。本项目直接使用 `import bcrypt`，调用 `bcrypt.hashpw` / `bcrypt.checkpw`，不依赖 passlib。
- **Tailwind v4 无 `tailwind.config.js`**：使用 `@tailwindcss/vite` 插件 + CSS `@theme` 指令配置主题，不使用 PostCSS config 文件。
- **`@radix-ui/react-alert-dialog` 需手动安装**：不在初始 package.json 中，已通过 `npm install @radix-ui/react-alert-dialog tslib` 补充安装。
- **Python 中文文档处理**：DashScope `text-embedding-v4` 原生支持中文语义向量，无需额外分词处理。PostgreSQL `to_tsvector('simple', content)` 对中文无效，已停用 FTS 路径，两种检索模式均使用纯向量检索。

### 开发环境

- 后端必须在 conda `agent` 环境（Python 3.11）中运行，不要使用系统 Python。
- 基础设施（PostgreSQL、Milvus）始终通过 Docker 运行；开发时 API 服务可直接在宿主机启动，不需要进容器。
- Windows 下 `docker-compose` 命令需要 Docker Desktop 运行中，Git Bash 中若找不到命令请直接在 PowerShell 中运行。

### 文档处理

- 支持格式：`.pdf` / `.docx` / `.xlsx` / `.md` / `.txt` / `.csv`
- 单文件最大：50 MB（由 `MAX_UPLOAD_SIZE_MB` 控制）
- 处理状态轮询：前端 `KnowledgeDetailPage` 每 3 秒轮询一次处于 `pending/processing` 状态的文档
- 禁用文档：将 Milvus 中对应向量的 `is_enabled` 字段过滤（`expr="is_enabled == true"`），重新启用立即生效，无需重新处理

### 安全

- `SECRET_KEY` 必须在生产环境替换为至少 32 位随机字符串
- `CORS allow_origins=["*"]` 仅适用于内网部署，生产环境应限定来源域名
- refresh_token 存储在 `localStorage`，access_token 过期（默认 60 分钟）后需重新登录（未实现自动刷新）
- 管理员接口通过 `require_admin` 依赖注入校验，普通用户访问返回 403

### 前端路由守卫

- `RequireAuth`：未登录跳转 `/login`
- `RequireAdmin`：非管理员跳转 `/chat`
- 首次加载执行 `checkAuth()`（调用 `/auth/me`），避免刷新后登录态丢失

### 数据库迁移

- `alembic/env.py` 使用 `sync_database_url`（psycopg2 驱动），与 FastAPI 运行时的 asyncpg 驱动相互独立，不要混用
- 删除知识库时级联删除 document_chunks 和 Milvus collection，顺序由 `knowledge/service.py` 中的 `delete_kb()` 保证
