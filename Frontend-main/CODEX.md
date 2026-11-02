# 前端开发指南

本文为项目维护者及 Codex 提供开发说明。项目使用 Next.js 16、React 19 和 TypeScript，包含简体中文商城、个人中心与管理后台。

编写 Next.js 相关代码前，阅读 `node_modules/next/dist/docs/` 的相关指南，本项目版本的 API 与旧版本可能不同。

## 常用命令

```bash
npm run dev       # 本地开发，默认 http://localhost:3000
npm run build     # 生产构建
npm start         # 启动生产服务
npm run lint      # ESLint 检查
npx tsc --noEmit  # 类型检查
```

当前没有前端测试套件。CI 为 `main` 和 `dev` 的推送与拉取请求运行代码检查、类型检查和构建。

## 环境变量

复制 `.env.example` 为 `.env.local`。

| 变量 | 用途 | 本地示例 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | 后端 HTTP 地址 | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket 基础地址 | `http://localhost:8000` |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe 公钥 | `pk_test_...` |

HTTP 未设置时使用同域名 `/api`，WebSocket 未设置时使用当前浏览器域名；Stripe 公钥未设置时不启用银行卡组件。环境变量在构建时写入前端资源，部署修改后需重建。

WebSocket 地址独立设置，因为代理可能给 HTTP 加 `/api` 前缀，而让 WebSocket 直接使用 `/ws`。单独运行的本地后端不带 `/api`。统一 Compose 部署由 Nginx 提供 `/api` 前缀，并移除前缀后转发给后端。

## 架构

使用 App Router，业务页面主要为 `"use client"` 客户端组件，直接请求 FastAPI；根布局是可导出元数据的服务端组件。没有前端 API 路由。

页面位于 `app/`，动态路径包括 `products/[id]/page.tsx` 和 `auth/verify/[token]/page.tsx`。

### API 层

`lib/api.ts` 统一保存 API 类型与调用：

- 先声明类型，再声明传输逻辑，最后按领域封装接口函数。
- `authFetch<T>()` 附带 Bearer 令牌，`publicFetch<T>()` 不附带。
- 登录使用 OAuth2 表单，字段为 `username`、`password`；其他主体通常是 JSON。
- 错误包装为带状态码的 `ApiError`；非 JSON 错误保留 HTTP 状态信息。
- 后端校验信息缺少中文时，显示中文表单检查提示。

### 登录状态

JWT 放在 `localStorage`。`lib/useAuth.ts` 通过 `useSyncExternalStore` 暴露 `useIsLoggedIn()`，让同页组件及浏览器标签页同步登录状态。`saveTokens()`、`logout()` 后应调用 `notifyAuthChange()`。

访问令牌过期时共享一次刷新请求，成功后重试原请求，失败则清理登录状态。

### 购物车

`lib/cart.ts` 是 `localStorage` 中 `cart` 的唯一读写入口。使用 `useCart()` 读取、`writeCart()` 或 `clearCart()` 写入。

不要直接改写购物车存储；封装会发送变更事件。快照缓存已解析数组，避免每次读取生成新引用导致订阅循环更新。

## 样式和通用组件

当前采用深色背景与紫蓝色渐变装饰，实际颜色、圆角及布局以 `lib/theme.ts` 和 `globals.css` 为准。

| 文件 | 内容 |
| --- | --- |
| `lib/theme.ts` | 颜色、圆角、字号和布局宽度；页面不写裸十六进制颜色 |
| `components/ui.tsx` | 按钮、输入框、文本域、下拉框、字段、卡片、提示、徽标、加载器、空状态、统计、标签页和标题 |
| `components/nav.tsx` | 商城标识、导航、购物车 / 退出按钮、页面与认证容器 |
| `app/globals.css` | 重置、中文字体回退、焦点、动画、页面壳及表面效果 |
| `lib/labels.ts` | 角色、订单 / 商品状态、常见分类 / 颜色及交易描述的中文映射 |

布局仍主要使用内联样式，但设计变量来自公共文件。Tailwind 已安装和引入，未作为主要布局工具。页面不注入 `style` 标签。

## 代码约定

- 不新增解释性源码注释；设计原因写在文档中。保留 `eslint-disable-*`、`@ts-*` 等工具指令。
- 不在 `useEffect` 主体同步调用 `setState`。使用派生状态、渲染时约束或 `useSyncExternalStore`。
- 页面文案、校验提示和辅助标签使用简体中文。
- 不把接口状态值翻译后发给后端；保留 `create`、`accept`、`client` 等原值，仅在显示层转换。
- 币种仍为美元（USD），Stripe 组件语言设置为 `zh`，不可只修改符号就视作人民币支付。
- 任意商品名称和介绍来自数据库，不能假定已经翻译。

## 关键设计及原因

| 设计 | 原因 |
| --- | --- |
| 目录由后端筛选和分页 | 避免仅抓取前 200 条后在浏览器筛选造成漏项 |
| 搜索词延迟 300 毫秒提交 | 避免每敲一个字就请求一次 |
| 加载状态根据响应键派生 | 用 `result.key !== key` 识别请求中的状态，不在副作用中同步设置加载状态 |
| `maxPrice` 初始为 `null` | 表示不筛价格，滑块可随分类价格上限变化 |
| AI 搜索替换商品网格 | 后端返回真实商品列表，顾客可直接按普通商品操作；模型排序结果不再分页 |
| 游客只看到登录提示 | AI 搜索需要登录，避免游客直接触发 401 |
| 商品使用 `img` | 图片是管理员填写的任意 URL，避免开放 Next 图片代理 |
| 表单使用 `noValidate` | 禁用浏览器气泡，`lib/formErrors.ts` 读取相同约束并用中文行内提示 |
| 当前密码不做新密码长度限制 | 旧账号可能使用短密码，仍应允许验证后改密；只对新设密码限制 |
| `Card` 不内联覆盖背景与边框 | `.surface` 使用双层背景绘制渐变边框，内联边框会破坏效果 |
| 状态和角色通过映射函数显示 | 中文界面与后端英文协议分离，保持兼容 |
| 中文字体使用系统回退 | 字体可按操作系统选择，不依赖额外中文网络字体 |

## 重要文件

| 文件 | 用途 |
| --- | --- |
| `app/page.tsx` | 首页与视觉参考 |
| `app/layout.tsx` | 中文标题、描述、`lang="zh-CN"` |
| `app/admin/page.tsx` | 商品、订单、分类和统计 |
| `app/profile/page.tsx` | 账号、订单、充值、账号安全和智能助手 |
| `app/products/page.tsx` | 商品搜索、分类、价格与 AI 搜索 |
| `lib/formErrors.ts` | 按表单约束生成中文错误信息 |

## 后端联调

FastAPI 后端位于上一级，通过 Docker Compose 启动，默认端口 8000。认证、商品等路径为 `/auth/...`、`/product/...`，本地不带 `/api`。前端来源需与后端 `FRONTEND_URL` 一致。

管理入口识别审核员和超级管理员，但后端部分管理接口仅允许超级管理员。新增页面不能只依据前端角色判断替代后端鉴权。

若 Windows 上默认 Turbopack 构建报告子进程连接错误，可使用项目版本支持的 Webpack 构建：

```bash
npm run build -- --webpack
```

## 统一部署入口

在项目根目录执行 `docker compose up --build -d`。Compose 从根目录 `.env` 读取配置，前端 API 固定使用 `/api`，WebSocket 使用当前域名，支付公钥由 `STRIPE_PUBLISHABLE_KEY` 传入构建。网关同时代理前端、API 和 WebSocket，详见[部署指南](../deploy/README.md)。
