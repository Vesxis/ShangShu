# 商枢｜高并发电商交易平台 · 前端

面向华人用户的简体中文商城界面，使用 Next.js 16、React 19 和 TypeScript。后端位于当前目录的上一级，详见[后端说明](../README.md)。

## 技术与结构

- 使用 App Router 组织页面，主要业务页面为客户端组件。
- 在 `lib/api.ts` 统一封装 API 类型、请求、登录令牌刷新与错误处理。
- `lib/theme.ts` 保存设计变量，`components/` 提供通用组件；页面主要采用内联样式。
- `globals.css` 引入 Tailwind，同时定义背景、焦点样式、动画及公共布局。
- Stripe.js 和 `@stripe/react-stripe-js` 提供银行卡付款组件。
- Docker 使用独立输出模式部署 Next.js 服务，可由 Caddy 等代理提供 HTTPS。

## 统一部署

在项目根目录配置 `.env` 后执行 `docker compose up --build -d`，前端、后端及基础服务同时启动。打开 `http://localhost:8080` 即可使用平台，API 文档位于 `/api/docs`。统一部署通过根目录 `STRIPE_PUBLISHABLE_KEY` 传入前端支付公钥，无需前端 `.env.local`。详见[部署指南](../deploy/README.md)。

## 本地单独开发

在本前端目录执行：

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`，后端应运行在 `http://localhost:8000`。

`.env.local` 示例：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_KEY=pk_test_...
```

未设置地址时，HTTP 使用同域名 `/api`，WebSocket 使用浏览器当前域名。本地单独开发时，使用上述 `.env.local` 指向本机 8000 端口。Stripe 公钥没有默认值，不配置时银行卡充值不可用，演示充值仍可用于体验。

`NEXT_PUBLIC_WS_URL` 独立设置，便于反向代理把 HTTP 放在 `/api` 下、WebSocket 放在 `/ws` 下。本地 API 没有 `/api` 前缀。

其他命令：

```bash
npm run lint
npx tsc --noEmit
npm run build
npm start
```

当前没有前端自动化测试套件；CI 配置了代码检查、类型检查和构建。

## 页面

| 路由 | 用途 |
| --- | --- |
| `/` | 商城首页 |
| `/login` | 登录，邮箱未验证时可重新发送验证链接 |
| `/register` | 注册与邮箱验证提示 |
| `/forgot-password` | 申请密码重置邮件 |
| `/reset-password` | 使用邮件凭证重置密码 |
| `/auth/verify/[token]` | 邮箱验证结果 |
| `/products` | 商品目录、名称搜索、分类和价格筛选、AI 搜索 |
| `/products/[id]` | 商品详情、库存与购买数量 |
| `/cart` | 购物车 |
| `/checkout` | 确认订单与余额支付 |
| `/profile` | 概览、订单、编辑资料、充值、账号安全、智能助手 |
| `/transactions` | 交易记录与分类汇总 |
| `/admin` | 商品、订单、分类和数据统计管理 |

## 功能说明

### 账号

注册后验证邮箱才能登录；支持重发验证邮件、找回密码、修改密码和删除账号。访问与刷新令牌保存在 `localStorage`，过期时尝试刷新令牌并重试请求。

### 商品和购物车

商品目录由后端分页和筛选，输入搜索词后延迟 300 毫秒发送请求。AI 搜索需要登录，结果直接替换商品网格，保留模型给出的顺序。

购物车以 `lib/cart.ts` 为唯一读写入口，使用 `useSyncExternalStore` 同步导航栏数量。商品图片来自管理员提供的 URL。

### 结算和订单

依次创建订单、添加商品、使用余额支付；失败时尝试取消草稿订单。已从商品列表消失的条目会被提示并跳过。个人中心可展开订单查看商品与数量。


### 充值与支付

银行卡充值使用 Stripe；页面和支付输入框设置为中文。另有明确标注的“演示充值”，直接增加测试余额，不发生真实扣款。

当前结算货币为美元（USD），使用 Stripe 支付渠道。

### 管理后台

支持创建、编辑、删除商品，审核上架，AI 生成商品介绍，处理订单，维护分类和查看统计。超级管理员可接收 WebSocket 订单通知。

前端识别审核员与超级管理员，但多项后台数据接口仅允许超级管理员；审核员不拥有全部管理能力。

## 中文化约定

- 页面默认 `lang="zh-CN"`，标题与描述使用中文；中文字体优先使用系统可用的苹方、微软雅黑等字体。
- 按钮、表单提示、空状态、弹窗、辅助标签和加载提示使用简体中文。
- `lib/labels.ts` 负责角色、状态、常见颜色、旧演示分类和交易描述的中文显示。
- 请求字段和状态值仍使用原始英文标识，避免破坏后端协议。
- 商品名称和介绍按数据库内容展示；后端演示脚本生成中文商品介绍。
- AI 回答语言由后端提示词控制，前端显示原始回复。
- 后端 `/docs` 的项目标题、分组和接口摘要为中文；Swagger UI 自带工具按钮仍可能显示英文。

## 目录

```text
app/
├── layout.tsx、globals.css        # 根布局、中文元数据、全局样式
├── page.tsx                      # 首页
├── login/、register/              # 登录与注册
├── forgot-password/、reset-password/
├── auth/verify/[token]/
├── products/                     # 目录和详情
├── cart/、checkout/、transactions/
├── profile/                      # 个人中心
└── admin/                        # 管理后台
components/
├── ui.tsx                        # 按钮、表单、卡片、提示、标签页等
└── nav.tsx                       # 导航、购物车按钮、页面容器
lib/
├── api.ts                        # API 类型、请求与令牌刷新
├── labels.ts                     # 中文显示映射
├── theme.ts                      # 样式设计变量
├── cart.ts                       # 购物车存储
├── useAuth.ts                    # 登录状态
└── formErrors.ts                 # 表单行内校验
```

## 镜像与代理

根目录 Compose 使用本目录的 Dockerfile 构建独立输出镜像。前端请求同域名 `/api`，实时通知连接同域名 `/ws/admin`；网关配置位于 `deploy/nginx.conf`。

`NEXT_PUBLIC_STRIPE_KEY` 在构建时写入浏览器资源，Compose 自动从根目录 `STRIPE_PUBLISHABLE_KEY` 传入。修改公钥后重新构建前端镜像。

单独使用前端镜像时，可通过构建参数 `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_WS_URL` 和 `NEXT_PUBLIC_STRIPE_KEY` 指定独立后端及支付公钥。统一部署保持 API 参数为 `/api`、WebSocket 参数为空。

## 开发约定

代码中不添加解释性注释，设计说明写入文档；保留 `eslint-disable-*` 等工具指令。不要在 `useEffect` 主体同步调用 `setState`；优先派生状态或使用外部存储订阅。商品图片为任意外部地址，当前使用 `img` 而非 `next/image`。


若 Windows 上默认 Turbopack 构建报告子进程连接错误，可使用项目版本支持的 Webpack 构建：

```bash
npm run build -- --webpack
```
