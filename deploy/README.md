# 商枢统一部署指南

## 启动平台

在项目根目录准备 `.env`，配置数据库、RabbitMQ 和令牌密钥后执行：

```bash
docker compose up --build -d
```

默认打开 `http://localhost:8080` 即可使用前端。API 文档位于 `http://localhost:8080/api/docs`。

Compose 启动七项服务：`gateway`、`frontend`、`backend_system_app`、`celery_worker`、`db`、`redis`、`rabbitmq`。数据库迁移由后端启动命令自动执行，网关在前后端通过健康检查后启动。

## 前后端如何连接

```text
浏览器 → Nginx 网关（HTTP_PORT，默认 8080）
          ├── /            → Next.js 前端 :3000
          ├── /api/        → FastAPI 后端 :8000（移除 /api 前缀）
          └── /ws/         → 后端 WebSocket :8000（保留路径）
```

前端请求使用同域名的 `/api`，WebSocket 根据浏览器当前地址自动选择 `ws` 或 `wss`。因此在服务器上使用域名或 IP 访问时，无需重新写入后端主机地址。

后端容器设置 `API_ROOT_PATH=/api`，使 Swagger 正确读取 `/api/openapi.json`，并使用 `/api` 作为接口调用前缀。单独运行 Python 后端时，该参数默认为空。

网关覆盖客户端传入的转发 IP，向后端传递实际连接地址；WebSocket 转发保留协议升级头。Docker DNS 定期刷新应用容器地址，更新前后端容器后无需手动修改代理 IP。

## 环境配置

| 变量 | 示例 / 用途 |
| --- | --- |
| `HTTP_PORT` | `8080`，唯一对外开放的端口 |
| `FRONTEND_URL` | `http://localhost:8080`，用于邮箱验证、密码重置链接和 CORS |
| `BASE_URL` | `http://localhost:8080/api`，对外 API 地址 |
| `STRIPE_PUBLISHABLE_KEY` | 自动作为前端构建参数 `NEXT_PUBLIC_STRIPE_KEY` |
| `DB_USER`、`DB_PASSWORD`、`DB_ROOT_PASSWORD`、`DB_NAME` | MySQL 初始化配置 |
| `RABBITMQ_USER`、`RABBITMQ_PASSWORD`、`RABBITMQ_URL` | 队列账号与连接字符串 |
| `EMAIL_USER`、`EMAIL_PASSWORD` | 邮箱服务凭据 |
| `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` | 支付接口和回调配置 |
| `LLM_PROVIDER`、`GROQ_API_KEY`、`GEMINI_API_KEY` | AI 服务配置 |

修改访问端口时，同步修改 `FRONTEND_URL` 和 `BASE_URL`。部署到服务器时，将其中的 `localhost` 换成实际域名或服务器 IP。

统一部署只使用根目录 `.env`。前端构建固定采用 `/api` 和同域名 WebSocket；Stripe 公钥在构建时写入浏览器资源，修改公钥后重新执行 `docker compose up --build -d`。

MySQL、Redis、RabbitMQ、前端和后端应用端口不直接映射到宿主机。需要检查数据库时，使用 `docker compose exec db mysql -u用户名 -p 数据库名`；需要查看队列和任务状态时，使用相应容器命令或日志。

## HTTPS 与域名

若服务器已有 Nginx、Caddy 等 HTTPS 入口，让它将整个域名转发到本机网关端口，并保留 WebSocket 升级头。此时可以使用回环绑定的覆盖配置：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

覆盖配置把网关绑定为 `127.0.0.1:8080`，供宿主机 HTTPS 入口访问。配置 `FRONTEND_URL=https://你的域名`、`BASE_URL=https://你的域名/api`。浏览器将自动使用 HTTPS API 和 WSS 通知。

## 演示数据

```bash
docker compose exec backend_system_app python -m scripts.seed_catalogue --products 2000
```

已有商品时，可使用 `--append` 追加。MySQL 数据持久化在 `mysql_data` 卷中。

## 日常管理

```bash
docker compose ps
docker compose logs --tail 100 backend_system_app frontend gateway celery_worker
docker compose up --build -d
docker compose restart gateway
docker compose down
```

`docker compose down` 保留数据卷，适合停止和再次启动平台。更换数据库初始化密码时，同时维护已有 MySQL 用户凭据，初始化变量仅在首次创建数据库时生效。

## 分别开发

前端位于 `Frontend-main`，开发时可使用 `npm run dev`。复制前端自己的 `.env.example` 为 `.env.local`，其中 HTTP 和 WebSocket 地址指向独立运行的 `http://localhost:8000` 后端。

后端使用你配置的本地 MySQL、Redis 和 RabbitMQ。此模式将 `FRONTEND_URL` 设为 `http://localhost:3000`，保持 `API_ROOT_PATH` 为空。

前端的统一部署镜像使用 Next.js 独立输出，构建完成后通过 `node server.js` 启动，前端静态资源和公共文件由同一容器提供。


## GitHub 持续集成

上传后默认运行代码检查、前端构建和后端测试。需要启用 EC2 自动部署时，在仓库 Variables 中设置 `ENABLE_EC2_DEPLOY=true`，通过 `EC2_APP_DIR` 指定服务器项目目录（默认 `/home/ubuntu/ShangShu`），并配置 `EC2_HOST`、`EC2_USER`、`EC2_SSH_KEY` 三项 Secrets。
