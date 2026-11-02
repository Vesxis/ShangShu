# 商枢｜高并发电商交易平台

处理高并发的商城项目，后端使用 FastAPI 和 MySQL，前端位于本目录下的 [Frontend-main](Frontend-main/README.md)。支持账号注册与邮箱验证、商品浏览、购物车、余额结算、退款、管理后台、实时订单通知及 AI 搜索与导购。

平台支持人民币（CNY）支付，并提供演示充值入口，用于体验购物车、结算与退款。

## 从哪里开始阅读

| 文档 | 内容 |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 分层、事务、金额、库存、缓存和测试约定 |
| [CODEX.md](CODEX.md) | 开发命令、模块关系、业务流程与维护注意事项 |
| [前端说明](Frontend-main/README.md) | 页面、前端启动、环境变量与部署 |
| [前端开发指南](Frontend-main/CODEX.md) | 组件、状态管理、API 封装和样式约定 |

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Python 3.11、FastAPI | 异步 HTTP API |
| MySQL 8.0、SQLAlchemy 2、asyncmy | 数据持久化和异步查询 |
| Alembic | 数据库迁移 |
| Redis 7 | 缓存、限流、验证令牌和 AI 回答缓存 |
| RabbitMQ、Celery | 邮件任务队列 |
| PyJWT、bcrypt / passlib | 登录凭证与密码哈希 |
| Stripe | 支付及回调入账 |
| WebSocket | 管理员实时订单通知 |
| Groq / Google Gemini | 商品语义搜索、推荐、聊天和商品介绍 |
| Docker Compose | 前后端与基础服务统一编排 |
| Nginx 1.28 | 同域名入口、API 代理和 WebSocket 转发 |
| Next.js 16、React 19、TypeScript | 中文商城前端 |
| GitHub Actions | 代码检查、测试与部署流程配置 |

## 目录结构

```text
ShangShu/
├── app/                       # HTTP 路由、应用入口及健康检查
├── services/                  # 业务服务
│   └── ai/                    # AI 业务、提示词与模型服务适配
├── repositories/              # SQLAlchemy 查询
├── models/                    # ORM 模型
├── schemas/                   # 请求与响应 DTO
├── core/                      # 配置、枚举、异常和字段校验
├── database/                  # 会话与工作单元
├── utils/                     # 鉴权、限流、缓存、日志、WebSocket 管理
├── alembic/                   # 数据库迁移脚本
├── scripts/seed_catalogue.py   # 演示商品生成脚本
├── tests/                     # 后端测试
├── Frontend-main/             # 中文商城前端
├── celery_app.py               # 邮件后台任务
├── deploy/                    # 统一网关配置与部署指南
├── docker-compose.yml          # 前后端与基础服务统一编排
└── docker-compose.prod.yml     # 生产配置覆盖
```

请求主要遵循：`路由 → 服务 → UnitOfWork → 仓储 → 数据库`。工作单元负责提交与回滚；邮件、通知和缓存失效放在事务提交后执行。

## 主要功能

- **账号与权限**：JWT 访问令牌与刷新令牌、密码哈希、邮箱验证、找回及重置密码；支持普通用户、审核员、超级管理员。
- **商品与分类**：商品名称搜索、分类和价格组合筛选、分页、库存、图片和审核。商品状态为 `pending → accept / rejected`。
- **购物与订单**：购物车保存在前端浏览器；结算校验库存与余额，记录消费交易。退款按下单单价退回余额，并恢复库存。
- **并发处理**：余额修改使用行锁；库存通过带数量条件的原子更新扣减，多商品操作按商品编号排序。
- **Stripe 支付**：创建 PaymentIntent，经验证签名的回调完成入账；事件唯一记录用于防止重复入账。
- **评价**：同一用户对同一商品只能提交一条评价；删除权限由服务校验。
- **缓存与分页**：列表与统计通常缓存 60 秒；资源版本递增使旧缓存失效。列表分页上限为 200。
- **限流**：部分认证、支付及 AI 接口通过 Redis 对调用 IP 限流，当前为 60 秒内最多 5 次。
- **通知与邮件**：Celery + RabbitMQ 后台发邮件，WebSocket 向已连接的超级管理员广播订单付款通知。
- **AI**：根据给定目录搜索商品、根据购买历史推荐、回答商城问题、生成商品介绍。自然语言输出使用简体中文。
- **健康检查**：`GET /health` 检查 MySQL 和 Redis；异常时返回 503。
- **软删除**：用户通过 `is_active` 标记删除，保留记录并在相关查询中过滤。

## 一次部署前后端

项目使用 Docker Compose 同时启动 MySQL、Redis、RabbitMQ、后端 API、Celery、前端和 Nginx 网关。浏览器通过同一个地址访问整个平台。

### 1. 准备配置

在项目根目录执行一次：

```powershell
Copy-Item .env.example .env
```

编辑 `.env` 中的数据库密码、RabbitMQ 密码及 `SECRET_KEY`。RabbitMQ 连接字符串中的账号密码应与对应配置一致。

| 变量 | 作用 |
| --- | --- |
| `HTTP_PORT` | 对外访问端口，默认 `8080` |
| `FRONTEND_URL` | 浏览器访问平台的完整地址，默认 `http://localhost:8080`；邮件链接使用此地址 |
| `BASE_URL` | 对外 API 地址，默认 `http://localhost:8080/api` |
| `DB_USER`、`DB_PASSWORD`、`DB_ROOT_PASSWORD`、`DB_NAME` | MySQL 应用账号、应用密码、管理员密码及数据库名 |
| `SECRET_KEY` | JWT 签名密钥 |
| `RABBITMQ_USER`、`RABBITMQ_PASSWORD`、`RABBITMQ_URL` | 邮件队列连接配置 |
| `EMAIL_USER`、`EMAIL_PASSWORD` | 邮件服务账号；当前使用 Gmail SMTP |
| `STRIPE_SECRET_KEY`、`STRIPE_PUBLISHABLE_KEY`、`STRIPE_WEBHOOK_SECRET` | 支付服务密钥；公钥由 Compose 自动传给前端构建 |
| `LLM_PROVIDER`、`GROQ_API_KEY`、`GEMINI_API_KEY` | AI 服务提供方和密钥 |

部署时前端无需另建 `.env.local`，也无需填写后端域名。

### 2. 一条命令启动

```bash
docker compose up --build -d
```

后端自动执行数据库迁移；网关等待前后端健康检查通过后启动。

| 入口 | 地址 |
| --- | --- |
| 商枢首页 | `http://localhost:8080` |
| 商品目录 | `http://localhost:8080/products` |
| API 文档 | `http://localhost:8080/api/docs` |
| 备用 API 文档 | `http://localhost:8080/api/redoc` |
| 健康检查 | `http://localhost:8080/api/health` |
| 管理员实时通知 | 同域名下的 `/ws/admin` |

统一路由为：`/` → 前端，`/api/` → 后端，`/ws/` → 后端 WebSocket。数据库、缓存、消息队列和应用容器仅通过内部网络通信，对外只开放网关端口。

### 3. 创建演示商品

```bash
docker compose exec backend_system_app python -m scripts.seed_catalogue --products 2000
```

演示目录包含十个分类，使用固定随机种子生成中文商品；已有商品时使用 `--append` 追加。

### 4. 查看状态和更新

```bash
docker compose ps
docker compose logs -f backend_system_app frontend gateway
docker compose up --build -d
docker compose down
```

`docker compose down` 停止服务并保留 MySQL 数据卷。

### 5. 分别开发前后端

也可以分别运行 Python 后端与 `Frontend-main` 中的 `npm run dev`。前端本地配置见[前端说明](Frontend-main/README.md)。统一部署、域名和 HTTPS 配置见[部署指南](deploy/README.md)。

### 6. 本地调试支付回调

```bash
stripe listen --forward-to localhost:8080/api/payment/webhook
```

将监听得到的回调签名密钥填入 `.env`；支付密钥和邮箱、AI 密钥分别启用对应的外部服务。

## 角色与演示余额

| 原始值 | 中文角色 | 权限概览 |
| --- | --- | --- |
| `client` | 普通用户 | 操作自己的资源 |
| `moderator` | 审核员 | 审核商品；实际可访问操作以接口依赖为准 |
| `superadmin` | 超级管理员 | 管理用户、商品、分类及管理员通知 |

前端管理入口同时识别审核员和超级管理员，但部分管理数据接口只允许超级管理员；这是现有权限边界。

首位超级管理员需直接在数据库设置：

```sql
UPDATE clients SET role='superadmin' WHERE email='your@email.com';
```

`POST /client/{client_id}/deposit` 可直接增加自己的余额，便于演示结算；这不是支付凭证。若要经营真实商城，应另行调整充值、提现权限并设计真实支付流程。

## MySQL 存储与事务

- 使用 MySQL 8.0、InnoDB 和 `utf8mb4`，支持中文及表情字符。
- 应用通过 `mysql+asyncmy` 异步连接，Alembic 通过 `mysql+pymysql` 执行迁移。
- 金额使用 `DECIMAL(10, 2)`，余额修改沿用行锁，库存扣减采用带条件的原子更新。
- Stripe 事件以区分大小写的唯一主键去重，通过保存点处理重复投递，支付失败时事件记录随事务回滚。
- 商品目录使用条件聚合计算筛选后的数量，同时保留未受价格筛选影响的价格上限。
- MySQL 数据保存在独立的 `mysql_data` Docker 卷中。

## 数据模型

| 模型 | 含义 |
| --- | --- |
| `Client` | 用户、余额、角色、邮箱验证及软删除 |
| `Product` | 商品、审核状态、库存、分类 |
| `Order` | 用户订单及状态 |
| `OrderProduct` | 订单商品、数量及下单单价 |
| `Transaction` | 充值、提现、消费与退款记录 |
| `Category` | 商品分类 |
| `Review` | 商品评分与评价 |
| `ProcessedStripeEvent` | 已处理的 Stripe 事件，防止重复入账 |

## 测试与迁移

安装 `requirements-dev.txt` 中的开发依赖后运行：

```bash
ruff check .
pytest tests/ -v
alembic upgrade head
alembic revision --autogenerate -m "变更说明"
alembic downgrade -1
```

测试连接 MySQL，并删除、重建 `{DB_NAME}_test`。测试账号需具备该测试库的创建和删除权限；Redis 和邮件任务使用替身。

分别开发时，宿主机数据库、Redis 和 RabbitMQ 连接你提供的本地服务；统一 Compose 部署中的基础服务只开放内部网络。

## 部署服务

| 服务名 | 用途 |
| --- | --- |
| `gateway` | Nginx 统一入口，默认对外端口 `8080` |
| `frontend` | Next.js 前端，内部端口 `3000` |
| `backend_system_app` | FastAPI 后端，内部端口 `8000`，启动时执行数据库迁移 |
| `celery_worker` | 后台邮件任务 |
| `db` | MySQL 8.0，数据持久化到 `mysql_data` |
| `redis` | Redis 缓存、限流和验证令牌 |
| `rabbitmq` | Celery 消息代理 |

`.github/workflows/ci.yml` 包含前后端检查、MySQL 迁移测试和统一 Compose 更新命令。完整操作见[部署指南](deploy/README.md)。

## API 接口索引

下面的接口以当前路由源码为准。公开接口无需登录；用户接口仍受资源归属校验限制。完整请求结构可在运行后的 `/docs` 查看。

| 方法 | 路径 | 访问要求 | 说明 |
| --- | --- | --- | --- |
| GET | `/ai/search` | 登录用户 | 智能搜索商品 |
| GET | `/ai/recommendations` | 登录用户 | 获取个性化推荐 |
| POST | `/ai/chat` | 登录用户 | 咨询商城助手 |
| POST | `/ai/generate-description` | 超级管理员 | 生成中文商品介绍 |
| POST | `/auth/register` | 公开 | 注册账号 |
| POST | `/auth/client_login` | 公开 | 登录账号 |
| POST | `/auth/refresh` | 公开 | 刷新访问凭证 |
| POST | `/auth/change_password` | 登录用户 | 修改密码 |
| POST | `/auth/change_role/{client_id}` | 超级管理员 | 修改用户角色 |
| GET | `/auth/verify/{token}` | 公开 | 验证邮箱 |
| POST | `/auth/resend_verification` | 公开 | 重新发送验证邮件 |
| POST | `/auth/forgot_password` | 公开 | 申请重置密码 |
| POST | `/auth/reset_password` | 公开 | 重置密码 |
| POST | `/category/create` | 超级管理员 | 创建商品分类 |
| GET | `/category/all` | 公开 | 获取商品分类 |
| DELETE | `/category/{category_id}` | 超级管理员 | 删除商品分类 |
| GET | `/client/me` | 登录用户 | 查看我的资料 |
| GET | `/client/me/stats` | 登录用户 | 查看我的消费统计 |
| GET | `/client/me/orders` | 登录用户 | 查看我的订单 |
| POST | `/client/{client_id}/deposit` | 登录用户 | 充值演示余额 |
| POST | `/client/{client_id}/withdraw` | 登录用户 | 扣减账户余额 |
| GET | `/client/get_clients` | 超级管理员 | 获取用户列表 |
| GET | `/client/{client_id}` | 登录用户 | 查看用户资料 |
| PUT | `/client/{client_id}` | 登录用户 | 更新用户资料 |
| DELETE | `/client/{client_id}` | 登录用户 | 删除用户账号 |
| GET | `/client/{client_id}/orders/count` | 登录用户 | 统计用户订单数量 |
| POST | `/order/create_orders` | 登录用户 | 创建空订单 |
| GET | `/order/get_orders` | 超级管理员 | 获取订单列表 |
| GET | `/order/{order_id}/orders` | 登录用户 | 查看订单 |
| POST | `/order/{order_id}/products/{products_id}` | 登录用户 | 向订单添加商品 |
| PUT | `/order/order_update/{order_id}` | 登录用户 | 更新订单名称 |
| GET | `/order/order/{order_id}/total_price` | 登录用户 | 计算订单总金额 |
| PUT | `/order/{order_id}/status` | 超级管理员 | 更新订单状态 |
| POST | `/order/orders` | 登录用户 | 创建含商品的订单 |
| GET | `/order/order_with_products/{order_id}` | 登录用户 | 查看订单及商品明细 |
| DELETE | `/order/{order_id}/order/{product_id}/product` | 登录用户 | 从订单移除商品 |
| POST | `/order/{order_id}/checkout` | 登录用户 | 支付订单 |
| POST | `/order/{order_id}/refund` | 登录用户 | 取消订单并退款 |
| POST | `/payment/create` | 登录用户 | 创建 Stripe 支付 |
| POST | `/payment/webhook` | 公开 | 接收 Stripe 支付回调 |
| POST | `/product/` | 登录用户 | 创建商品 |
| GET | `/product/all` | 公开 | 获取已上架商品 |
| GET | `/product/search` | 公开 | 按名称搜索商品 |
| GET | `/product/filter` | 公开 | 按价格筛选商品 |
| GET | `/product/catalogue` | 公开 | 分页浏览商品目录 |
| GET | `/product/{product_id}` | 公开 | 查看商品详情 |
| PUT | `/product/{product_id}` | 超级管理员 | 更新商品 |
| DELETE | `/product/{product_id}` | 超级管理员 | 删除商品 |
| PATCH | `/product/{product_id}/moderate` | 审核员 / 超级管理员 | 审核商品上架状态 |
| GET | `/product/color/{product_color}` | 公开 | 按颜色查找商品 |
| GET | `/product/admin/all` | 超级管理员 | 获取所有状态的商品 |
| POST | `/review/` | 登录用户 | 提交商品评价 |
| GET | `/review/product/{product_id}` | 公开 | 查看商品评价列表 |
| GET | `/review/{review_id}` | 公开 | 查看评价详情 |
| DELETE | `/review/{review_id}` | 登录用户 | 删除评价 |
| GET | `/transaction/me/transactions` | 登录用户 | 查看我的交易记录 |
| GET | `/transaction/{transaction_id}` | 登录用户 | 查看交易详情 |
| GET | `/transaction/{client_id}/transactions` | 登录用户 | 获取用户交易记录 |
| WS | `/ws/admin` | 超级管理员 | 管理员实时订单通知 |
