# 后端开发指南

本文供项目维护者及 Codex 使用。项目是异步 FastAPI 商城 API，使用 MySQL、Redis、RabbitMQ、Celery、Stripe 和 WebSocket。分层规则见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 常用命令

```bash
docker compose up --build        # 启动前后端及基础服务，需先配置 .env
pytest tests/                    # 运行测试，会重建专用测试数据库
ruff check .                     # 代码检查
alembic upgrade head             # 升级数据库结构
alembic revision --autogenerate -m "变更说明"
alembic downgrade -1             # 回退一次迁移
```

在宿主机运行时，把容器主机名改为本机地址：

```powershell
$env:DB_HOST="localhost"
$env:REDIS_URL="redis://localhost:6379"
$env:RABBITMQ_URL="amqp://实际账号:实际密码@localhost:5672//"
```

统一 Compose 部署的基础服务使用内部网络。分别开发时连接你配置的宿主机服务；RabbitMQ 账号需与环境配置一致。

## 模块关系

```mermaid
flowchart LR
    subgraph 浏览器
        UI[Next.js 中文商城<br/>商品 · 个人中心 · 管理后台]
    end
    subgraph 后端
        API[FastAPI<br/>路由 → 服务 → 工作单元 → 仓储]
        WORKER[Celery 邮件任务<br/>Gmail SMTP]
    end
    subgraph 数据服务
        PG[(MySQL 8.0)]
        REDIS[(Redis 7<br/>缓存 · 限流 · 令牌)]
        MQ[(RabbitMQ<br/>消息代理)]
    end
    subgraph 外部服务
        STRIPE[Stripe]
        LLM[Groq 或 Gemini]
    end
    UI -- HTTPS --> API
    UI -. 管理员实时通知 .-> API
    API --> PG
    API -- 读写缓存与版本 --> REDIS
    API -- 邮件任务 --> MQ --> WORKER
    API -- 创建支付 --> STRIPE
    STRIPE -- 支付回调 --> API
    API -- 搜索与导购 --> LLM
```

Redis 不充当 Celery 消息代理，也不保存邮件任务结果；除此之外，它还承担缓存、限流和验证令牌存储等职责。

## 请求分层

```text
HTTP
 ↓
app/router_*.py           参数 DTO、认证依赖、响应结构
 ↓
services/*.py             业务规则和 UnitOfWork 事务
 ↓
database/unit_of_work.py  一个会话及各仓储；退出时提交或回滚
 ↓
repositories/*.py         SQLAlchemy 查询
 ↓
MySQL
```

维护时遵守两条规则：

1. 事务由工作单元负责，服务不手动提交。
2. 邮件 `.delay()`、WebSocket 广播和缓存失效放在事务块之后；否则数据库回滚时外部通知已经发出。

### 结算完整流程

`POST /order/{order_id}/checkout`：

```text
路由：JWT 依赖加载当前用户，接收订单编号
 ↓
OrderService.checkout
 ├─ 进入 UnitOfWork
 │   ├─ 读取订单，校验归属与付款状态
 │   ├─ get_client_with_lock 锁定用户行
 │   ├─ 校验余额并扣减
 │   ├─ 按 product_id 排序处理商品
 │   │   ├─ 带库存条件原子扣减
 │   │   └─ 保存 price_at_purchase
 │   ├─ 写入 purchase 交易记录
 │   └─ 设置 completed 状态
 └─ 退出事务：提交；如异常则回滚并停止
 ↓
提交后：订单状态邮件、管理员邮件、WebSocket 广播、订单缓存失效
```

事务失败时不会进入上述提交后的操作。

## 数据模型

```text
Client ──< Order ──< OrderProduct >── Product >── Category
  │                   数量与下单单价       │
  ├──< Transaction                        │
  └──< Review >───────────────────────────┘
        唯一约束：(client_id, product_id)

client_products：用户与商品的关联表
ProcessedStripeEvent：以 event_id 为主键，防止重复入账
```

数据库连接分别使用 `asyncmy`（异步应用）和 `PyMySQL`（迁移），统一使用 `utf8mb4`。

金额在数据库中采用 `Numeric(10, 2)`，Python 中采用 `Decimal`，输出 DTO 为兼容 JSON 转换为 `float`。退款读取下单时的 `price_at_purchase`。

## 文件职责

| 路径 | 内容 |
| --- | --- |
| `app/router_*.py` | AI、认证、分类、用户、订单、支付、商品、评价、交易、WebSocket 路由 |
| `app/main.py` | 应用组装、CORS、健康检查、全局异常处理 |
| `services/` | 业务逻辑 |
| `repositories/` | 分类、用户、订单、商品、评价、Stripe 事件、交易查询 |
| `models/models.py` | ORM 模型 |
| `schemas/<resource>/` | 独立的输入、输出 DTO，使用 Pydantic v2 |
| `core/exceptions.py` | 统一业务异常和中文错误信息 |
| `core/enum.py` | `Role`、`OrderStatus`、`ProductStatus`、`TransactionType` |
| `utils/dependencies.py` | 当前用户 / 管理员 / 审核员、分页、IP 限流 |
| `utils/cache.py` | 带版本号的缓存键 |
| `utils/connection_manager.py` | 向已连接管理员广播通知 |

### 商品目录与分页

`GET /product/catalogue` 接收名称、`category_id`、价格范围和分页参数，返回 `{items, total, price_ceiling}`。

分页数据通过 `joinedload` 同时获取分类；聚合查询返回总量与价格上限。总量应用价格筛选，上限不应用价格筛选，避免拖动价格滑块时滑轨终点也随之移动。

分页参数来自 `Limit` 和 `Offset`，限制为 `1..200` 和非负整数，不合法输入返回 422。不要让公开接口无上限加载大量 ORM 对象。

## 认证与权限

使用 PyJWT。`POST /auth/client_login` 接收表单 `username`、`password`，返回访问与刷新令牌。邮箱未验证时拒绝登录，邮件通过 Celery 异步发送。

角色原值为 `client`、`moderator`、`superadmin`。用户资源通常仅允许本人或超级管理员访问；商品审核允许审核员或超级管理员。公开列表只展示 `accept` 商品。

商品介绍生成接口使用 `CurrentAdmin`，不是普通用户接口。前端管理页虽识别审核员，但部分列表接口只允许超级管理员，不能把前端入口识别当作完整权限支持。

## 缓存

列表和用户统计通常缓存 60 秒。键示例：`order:v3:list:limit=10:offset=0`。

使用 `cache.key(namespace, suffix)` 生成键，使用 `cache.invalidate(namespace)` 递增版本。命名空间包括 `order`、`product`、`client`、`category`、`review`，AI 中文回答使用 `ai:zh-CN`。旧版本键自然过期，不扫描整个 Redis。

## 外部集成

### Stripe

`POST /payment/create` 创建 PaymentIntent；`POST /payment/webhook` 处理 `payment_intent.succeeded`，入账并写入 `deposit` 交易。

每个事件 ID 写入 `processed_stripe_events`；保存点隔离 MySQL 1062 重复键错误，重复事件不再次充值。事件 ID 使用 `utf8mb4_bin` 排序规则区分大小写，事件插入与余额更新处于同一外层事务。

### Celery 和邮件

消息代理是 RabbitMQ，不设置任务结果后端。四项任务都在 `celery_app.py` 中，使用 Gmail SMTP，包含发送超时、退避重试；从认证和订单服务通过 `.delay()` 调用。若将任务移到其他模块，需要同步调整任务发现方式。

主题、正文为中文，邮件使用 UTF-8 编码。状态值在邮件中转换为中文，后台枚举不变。

### WebSocket

`WS /ws/admin?token={jwt}` 仅供超级管理员使用。订单结算后，`ConnectionManager` 向已连接管理员广播中文通知。

### AI 模型

`LLM_PROVIDER` 可选 `groq`（默认）和 `gemini`。`LLM_MODEL` 留空时使用对应提供方的默认模型；指定模型必须与提供方匹配。

| 文件 | 职责 |
| --- | --- |
| `provider.py` | `LLMProvider` 协议、`build_provider()` 工厂 |
| `transport.py` | 共享 HTTP 客户端、重试、超时 |
| `groq.py`、`gemini.py` | 各自请求和响应格式适配 |
| `prompts.py` | 系统提示词和搜索 JSON Schema |
| `ai_service.py` | 不依赖具体模型服务的业务逻辑 |

新增提供方需要实现 `complete()` 并注册到 `PROVIDERS`。测试可通过 `provider=` 注入替身。

关键设计：

| 决策 | 原因 |
| --- | --- |
| 保留共享 JSON Schema | Groq 严格模式需要 `additionalProperties: false`；Gemini 适配层转换类型并移除不支持的键 |
| 使用 REST 和现有 httpx | 统一管理超时、重试和请求，无需额外厂商 SDK |
| 每个进程复用 AsyncClient | 复用连接池，应用退出时在 `lifespan` 中关闭 |
| 关闭模型思考选项 | 当前任务侧重目录匹配与短回答，避免推理耗尽输出预算 |
| 拒绝截断回答 | 不将半句话或不完整 JSON 当作成功结果 |
| 不重试 429 | 避免请求内重试进一步消耗额度；408 和 5xx 按既有策略重试 |
| 搜索返回实际商品 | 模型只选目录 ID，服务过滤不存在的 ID |
| 缓存前解析搜索结果 | 无效回答不进入缓存 |
| 搜索、推荐缓存包含商品版本 | 商品修改后可读取新结果，不等待整段 TTL |
| 提示词使用精简目录行 | 无需返回 ORM 商品的场景减少额外加载 |
| 购买记录使用 DISTINCT 查询 | 只取已购商品名，避免遍历全部订单关系 |
| 自然语言输出使用简体中文 | 聊天、推荐和商品介绍面向中文用户 |
| 中文回答单独使用缓存命名空间 | 避免读取旧版英文缓存 |


## 其他业务规则

- 结算：订单未付款、余额充足，按商品编号顺序扣库存，每行保存下单价。
- 退款：针对已完成订单，按下单价退款、恢复库存、记录退款交易并设为已取消。
- 用户删除：设置 `is_active=false`，相关查询过滤停用用户。
- 演示充值：直接增加测试余额，用于体验结算流程。
- 中文化：展示文案用中文，接口路径、字段、枚举和数据库结构保留现有协议。

## 测试与持续集成

`tests/conftest.py` 的会话夹具删除并重建 `{DB_NAME}_test`。确认连接的是专用测试数据库，再运行测试。

常用夹具包括 `client`、`new_client`、`auth_headers` 和相关测试文件的 `admin_headers`。Redis 以 `FakeRedis` 替代，邮件以 `RecordingTask` 记录；否则会尝试建立真实 AMQP 连接或发送邮件。

通用 Redis 替身读操作总返回 `None`，不能证明缓存行为；缓存测试使用专门的有状态替身。

`.github/workflows/ci.yml` 包含代码检查、迁移升级 / 一致性检查 / 回退重升，以及 MySQL 测试。部署任务依赖检查通过，且仅在推送到 `main` 时运行，通过 SSH 在 EC2 更新代码并重建容器。

## 容器与常见问题

| 服务 | 用途 |
| --- | --- |
| `db` | MySQL 8.0，使用 `mysql_data` 卷 |
| `redis` | Redis 7 |
| `rabbitmq` | RabbitMQ，管理界面端口 15672 |
| `backend_system_app` | 数据库迁移、Uvicorn，默认端口 8000 |
| `celery_worker` | `celery -A celery_app worker` |

从宿主机运行后端时，设置 `DB_HOST=127.0.0.1`，端口使用 Compose 的映射端口。容器内后端和任务进程固定连接 `db:3306`。统一部署对外只开放 Nginx 网关端口，应用和基础服务无宿主机端口映射。

CORS 按 `settings.FRONTEND_URL` 配置，并非开放所有来源。前端换域名或端口后，需要同步环境配置。

## 前端位置

前端在当前目录下的 `Frontend-main/`，开发端口 3000。HTTP 接口在后端根路径，没有本地 `/api` 前缀；WebSocket 使用 `/ws/admin`。详见[前端 README](Frontend-main/README.md)。

## 前后端统一部署

`docker compose up --build -d` 同时构建前后端并启动基础服务。网关默认监听 8080：`/` 转到前端，`/api/` 移除前缀后转到 API，`/ws/` 转到实时通知。后端容器设置 `API_ROOT_PATH=/api`，单独运行后端时保持为空。部署参数和日常命令见[部署指南](deploy/README.md)。
