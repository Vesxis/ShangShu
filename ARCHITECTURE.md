# 项目架构与开发约定

本文说明后端的分层、事务和数据一致性约定。系统关系图和结算调用过程见 [CODEX.md](CODEX.md)。

## 请求流程

```text
HTTP → 路由（router）→ 服务（service）→ UnitOfWork → 仓储（repository）→ MySQL
                          ↓
                       事务提交后：
                       Celery 邮件 · WebSocket 通知 · 缓存失效
```

新增业务应遵守分层：路由不直接操作仓储，服务通过工作单元访问数据库，仓储负责查询而不判断业务权限。

## 各层职责

### `app/router_*.py`：HTTP 接口

- 使用输入 DTO 校验请求，通过 `Annotated` 依赖取得当前用户或管理员。
- 调用服务方法，按 `response_model` 序列化响应。
- 不在路由中编写 SQL 或业务规则。支付回调等接口还需处理协议签名验证。
- 业务异常由服务抛出，异常继承 `HTTPException` 并携带状态码。

### `services/`：业务规则

- 负责资源归属、余额、库存、订单状态和权限判断。
- 服务方法主要采用 `@staticmethod`；数据库操作放在 `async with UnitOfWork() as uow` 中。纯令牌操作等无需访问数据库的方法除外。
- 不手动提交事务，由工作单元在正常退出时提交、异常时回滚。
- 邮件投递、WebSocket 广播和缓存失效放在事务块之后，避免数据库回滚后仍发出成功通知。
- 使用 `core/exceptions.py` 中的业务异常，如 `OrderNotFoundError`、`NotEnoughMoneyError`、`OutOfStockError`、`InsufficientPermissionsError`。

### `repositories/`：数据访问

- 封装 SQLAlchemy 查询，例如 `get`、`list`、`create`、`update`、`decrease_stock`。
- 会话由外部传入，仓储不提交或回滚事务。
- 不处理 HTTP 响应、业务权限或业务状态机。

### 其他目录

| 路径 | 职责 |
| --- | --- |
| `models/models.py` | ORM 表和关联关系 |
| `schemas/<resource>/input_dto.py`、`output_dto.py` | 分离请求与响应结构，避免直接暴露 ORM 对象 |
| `core/` | 配置、枚举、异常、Redis 客户端、共用字段校验 |
| `utils/` | 依赖注入、缓存、密码哈希、WebSocket 连接管理、日志 |
| `celery_app.py` | Celery 实例和四项邮件任务；任务在同一模块，工作进程无需额外 `include=` |

## 事务与并发

```python
async with UnitOfWork() as uow:  # 创建会话并挂载仓储
    ...  # 正常退出时提交，异常时回滚
```

每个 `async with` 是独立事务，连续两个块就是两个事务。

`get_client_with_lock` 使用 `SELECT ... FOR UPDATE` 锁定用户行，串行处理同一用户的余额修改。涉及多个商品时按 `product_id` 排序，使不同订单按相同顺序获取锁，降低死锁风险。

## 金额

数据库采用 `Numeric(10, 2)`，Python 内部采用 `Decimal`，避免浮点舍入误差。输出 DTO 在接口边界转换为 `float`，保留现有 JSON 格式。

`OrderProduct.price_at_purchase` 保存下单单价；退款读取此字段，不读取可能已经变动的 `Product.price`。

平台支持人民币（CNY）支付。

## 幂等与库存

Stripe 可能重复投递事件。处理过的事件 ID 写入 `processed_stripe_events`，通过唯一主键竞争处理权。插入放在保存点中，捕获 MySQL 1062 重复键错误并返回，保留外层支付事务。

库存使用带条件的原子更新：

```sql
UPDATE products SET quantity = quantity - :n
WHERE id = :id AND quantity >= :n;
```

未更新任何行表示库存不足。不要改成先读取库存、再独立写回。

## 缓存

列表和用户统计缓存通常保留 60 秒，键中包含资源命名空间的版本：

```text
order:v3:list:limit=10:offset=0
```

`cache.invalidate("order")` 对 `cache_version:order` 执行一次 `INCR`，后续读取使用新版本，旧缓存自然过期，无需扫描全部键。

Redis 还用于限流、邮箱验证令牌及 AI 回答缓存；Celery 消息代理是 RabbitMQ。

## 错误与语言

业务异常集中在 `core/exceptions.py`，保留状态码和类名，提示信息使用简体中文：

```python
raise OrderNotFoundError(order_id)       # 404：订单不存在
raise NotEnoughMoneyError(client_id)     # 400：余额不足
raise InsufficientPermissionsError(...) # 403：权限不足
```

FastAPI 自动将异常转换为响应。API 路径、JSON 字段名、枚举和数据库列名保留原值，前端对角色、状态和交易类型做中文显示映射。

## 测试

`pytest` 的会话夹具会删除并重建 `{DB_NAME}_test`，再根据 ORM 模型建表。运行前确认连接的是专用测试数据库。

测试以 `FakeRedis` 替代 Redis，以 `RecordingTask` 记录 Celery 调用，避免真正发邮件。通用 Redis 替身读取均返回 `None`，无法验证缓存语义；`tests/cache_tests.py` 使用有状态替身验证缓存。

CI 配置包含 `alembic upgrade head`、`alembic check`，以及 `downgrade base` 后重新升级的迁移检查。

## 统一部署拓扑

Docker Compose 同时启动前端、后端和基础服务。Nginx 是唯一对外入口：`/` 代理 Next.js，`/api/` 移除前缀后代理 FastAPI，`/ws/` 保留路径转发 WebSocket。前端使用同域名 API 和 WebSocket，后端通过 `root_path=/api` 生成正确的接口文档地址。配置详见[部署指南](deploy/README.md)。
