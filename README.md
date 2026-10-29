# 智游闽韵

面向福州文旅场景的一站式 AI 服务平台，覆盖游客端、商户端、平台治理端和景点服务端。项目把福州的文化旅游资源、AI 问答、行程规划、识景讲解、票务预约、社区互动、文旅商城和非遗学习整合到同一套系统中。

> 说明：仓库中的演示数据、图片和账号仅用于课程/竞赛展示，不代表真实商业数据。

## 团队信息

| 项目 | 内容 |
| --- | --- |
| 团队名称 | 期待开幕之时 |
| 团队编号 | 40069 |
| 所属院校 | 福建农林大学 |
| 组别 | B 组 |
| 成功组队人数 | 3 |
| 剩余队员名额 | 0 |
| 团队链接 | [查看团队主页](https://www.boxuegu.com/matchTrack/applyTeam/?id=10037&teamId=40069) |
| 代码仓库 | <https://github.com/yeswwef/zhiyou-minyun> |

## 功能概览

### 游客端（C 端）

| 模块 | 入口 | 说明 |
| --- | --- | --- |
| 首页 | `/home` | 福州文旅总览、推荐内容与快捷入口 |
| 文旅资源 | `/resources` | 景点、非遗、美食资源检索与详情 |
| AI 问答 | `/ask` | 基于福州知识库的 RAG 问答，支持多轮对话与引用来源 |
| 行程规划 | `/plan` | 按天数、偏好生成行程，支持地图展示与分享 |
| 识景讲解 | `/recognition` | 上传图片识别景点/非遗/美食并生成讲解 |
| 票务预约 | `/tickets` | 景区、博物馆、演出预约与核销 |
| 文旅社区 | `/community` | 游记发布、点赞、评论、收藏、关注 |
| 文旅商城 | `/shop` | 民宿、餐饮、非遗手作、伴手礼、研学体验 |
| 非遗学习 | `/learn` | 非遗作品展厅与线下体验课报名 |
| 便民应急 | `/help` | 公共厕所、停车场、充电桩、医疗点地图与一键求助 |
| 个人中心 | `/profile` | 订单、预约、行程、收藏、足迹、社区内容 |

### 商户端（B 端）

| 入口 | 说明 |
| --- | --- |
| `/b/dashboard` | 经营看板、客流趋势、游客画像 |
| `/b/products` | 商品管理 |
| `/b/orders` | 订单核销 |
| `/b/studio` | 非遗工作室/作品管理 |
| `/b/settings` | 商户资料设置 |

### 平台治理端（ADMIN）

| 入口 | 说明 |
| --- | --- |
| `/admin/dashboard` | 平台数据总览 |
| `/admin/users` | 用户与角色管理 |
| `/admin/content` | 内容治理 |
| `/admin/commerce` | 商城与交易治理 |
| `/admin/ai` | AI 能力与知识库配置 |
| `/admin/settings` | 平台设置 |

### 景点服务端（TICKET_ADMIN）

| 入口 | 说明 |
| --- | --- |
| `/admin/tickets` | 场馆与票务项目管理 |
| `/admin/bookings` | 预约订单与现场核销 |
| `/admin/emergency` | 应急求助工单处理 |

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 前端框架 | Next.js 16.3（App Router）、React 19、TypeScript |
| 样式 | Tailwind CSS 4、CSS Modules |
| 数据库 | MySQL 8、Prisma 7（`@prisma/adapter-mariadb`） |
| 缓存/并发 | Redis（票务缓存、限流、分布式锁；未配置时回退单进程内存） |
| 向量检索 | Qdrant（可选）或本地 `.data/rag` 向量索引 |
| AI | 千问兼容接口（LLM、VL、Embedding）、RAG 检索增强、联网检索 |
| 地图 | 高德 Web 服务 API + Web 端 JS API |
| 鉴权 | HMAC 签名 Cookie 会话、scrypt 密码哈希、角色权限 |
| 图表 | Recharts |

## 系统结构

```text
浏览器
  │
  ├─ Next.js App Router 页面（app/）
  │    ├─ app/(c)        游客端
  │    ├─ app/b          商户端
  │    └─ app/admin      平台治理端 / 景点服务端
  │
  ├─ Route Handlers（app/api/）
  │    ├─ 认证、资源、社区、商城、票务、行程
  │    ├─ AI 问答 / 识景 / RAG
  │    └─ 商户、平台治理、景点服务
  │
  ├─ Prisma 7 + MySQL    业务数据
  ├─ Redis               缓存、限流、并发锁
  ├─ Qdrant / 本地索引    RAG 向量检索
  └─ 高德 / 千问         地图与模型能力
```

### 角色模型

| 角色 | 说明 |
| --- | --- |
| `C` | 普通游客 |
| `B` | 商户 / 非遗传承人 |
| `ADMIN` | 平台管理员：治理、内容、交易、AI、系统 |
| `TICKET_ADMIN` | 景点管理员：场馆、票务、预约核销、应急服务 |

## 快速开始

### 1. 环境要求

- Node.js **>= 20.9**（Next.js 16 要求）
- MySQL **8.0+**
- npm（随 Node 安装）
- Redis 可选；不配置时自动回退到单进程内存保护
- Qdrant 可选；不配置时使用本地 `.data/rag` 索引
- Docker 可选，仅用于启动 Redis / Qdrant

### 2. 克隆项目

```bash
git clone https://github.com/yeswwef/zhiyou-minyun.git
cd zhiyou-minyun
```

### 3. 安装依赖

```bash
npm ci
```

如果没有 `package-lock.json` 或需要更新依赖，也可以使用：

```bash
npm install
```

完整依赖及版本见 [package.json](package.json) 和 [package-lock.json](package-lock.json)。

### 4. 配置环境变量

复制模板：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

然后至少填写：

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/zhiyou"
AUTH_SECRET="至少32字节的随机字符串"
```

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Prisma CLI 读取的是 `.env`；Next.js 同时支持 `.env` 和 `.env.local`。为避免迁移时读不到配置，建议把数据库配置写在 `.env`。

### 5. 创建数据库

```bash
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS zhiyou CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 6. 生成 Prisma Client 并执行迁移

```bash
npm run db:generate
npm run db:deploy
```

开发环境也可以使用：

```bash
npm run db:migrate
```

### 7. 写入演示数据

只写入 24 条文旅资源（最小数据集）：

```bash
npx prisma db seed
```

写入完整演示数据（资源、社区、商城、非遗、应急、商户与游客账号）：

```bash
# macOS / Linux
SEED_DEMO_COMMUNITY=true SEED_DEMO_MERCHANT=true npx prisma db seed

# Windows PowerShell
$env:SEED_DEMO_COMMUNITY="true"
$env:SEED_DEMO_MERCHANT="true"
npx prisma db seed
```

再写入场馆、票务、预约、平台管理员和景点管理员：

```bash
npm run db:seed:tickets
```

> `seed.ts` 默认只写 24 条资源；社区、商城、非遗、应急和商户/游客账号需要显式设置 `SEED_DEMO_COMMUNITY=true`、`SEED_DEMO_MERCHANT=true`。建议先跑完整 seed，再跑 `db:seed:tickets`，这样预约数据能关联到演示游客。

### 8. 启动开发服务器

```bash
npm run dev
```

打开：

- 首页：<http://localhost:3000>
- 健康检查：<http://localhost:3000/api/health>

健康检查返回 `db: "up"` 说明 Next.js 与 MySQL 已连通。

### 9. 可选：启动 Redis / Qdrant

```bash
docker compose up -d
```

注意：当前 `docker-compose.yml` 只包含 Redis 和 Qdrant，**不包含 MySQL**，MySQL 需要本机安装或单独启动。

## 环境变量

完整变量见 [.env.example](.env.example)。

### 必填 / 核心

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | MySQL 连接串 |
| `AUTH_SECRET` | 会话签名密钥；生产环境必须配置 |

### AI / RAG

| 变量 | 说明 |
| --- | --- |
| `DASHSCOPE_API_KEY` | 千问兼容接口密钥 |
| `DASHSCOPE_BASE_URL` | 模型接口地址 |
| `LLM_MODEL` | 主对话模型 |
| `VL_MODEL` | 识景视觉模型 |
| `EMBEDDING_MODEL` / `EMBEDDING_DIM` | 向量模型与维度 |
| `RAG_FAST_MODEL` / `RAG_AUDIT_MODEL` / `RAG_FOLLOWUP_MODEL` | 辅助环节模型 |
| `RAG_SOURCE_DIR` | 知识库源目录，默认 `../fuzhou_rag` |
| `RAG_DATA_DIR` | 本地索引目录，默认 `.data/rag` |
| `RAG_WEB_ENABLED` | 是否启用联网检索 |
| `QDRANT_URL` / `QDRANT_COLLECTION` | Qdrant 地址与集合名 |
| `VECTOR_BACKEND` | `auto` / `qdrant` / `local` |

### 地图

| 变量 | 说明 |
| --- | --- |
| `AMAP_WEB_KEY` | 高德 Web 服务 Key（POI、天气、静态图、路线） |
| `NEXT_PUBLIC_AMAP_JS_KEY` | 高德 Web 端 JS API Key（`/help` 地图） |
| `NEXT_PUBLIC_AMAP_SECURITY_CODE` | 高德 JS API 安全密钥 |

### 可选 / 演示数据

| 变量 | 说明 |
| --- | --- |
| `SEED_DEMO_COMMUNITY` | 设为 `true` 时 seed 写入社区、应急等演示数据 |
| `SEED_DEMO_MERCHANT` | 设为 `true` 时 seed 写入商城、非遗、商户与游客账号 |
| `REDIS_URL` | Redis 地址；不配置时回退内存 |
| `RAG_API_KEY` / `RAG_MODEL_BASE_URL` | RAG 独立密钥/接口 |
| `RAG_RERANK_URL` / `RAG_RERANK_MODEL` | 重排服务；留空使用 RRF |
| `RAG_LOG_LEVEL` | `info` / `debug` / `off` |
| `RAG_WEB_MODEL` / `RAG_WEB_TIMEOUT_MS` | 联网检索模型与超时 |

> 不要把 `.env`、`.env.local` 或真实密钥提交到 Git。

## RAG 知识库

AI 问答、识景讲解依赖福州本地知识库和向量索引。

1. 准备知识库源目录，例如项目同级的 `fuzhou_rag`：

```text
智游闽韵/
├─ zhiyou-minyun/
└─ fuzhou_rag/
```

2. 在 `.env` 中配置：

```env
RAG_SOURCE_DIR="../fuzhou_rag"
RAG_DATA_DIR=".data/rag"
```

3. 生成向量索引：

```bash
npm run rag:ingest -- --vectors
```

4. 可选验证：

```bash
npm run rag:test
npm run rag:eval
```

说明：

- `.data/rag` 和 `fuzhou_rag` 不在 Git 仓库内，需要自行准备。
- 没有知识库或没有配置模型密钥时，AI 问答/识景无法达到完整效果；其他业务模块仍可运行。
- 如果配置了 Qdrant，可将 `VECTOR_BACKEND` 设为 `qdrant`；否则使用本地索引。

## 演示账号

执行完整演示 seed（`SEED_DEMO_COMMUNITY=true`、`SEED_DEMO_MERCHANT=true`）并运行 `npm run db:seed:tickets` 后，可使用以下账号登录（密码均为 `demo123456`，以 seed 实际输出为准）：

| 账号 | 角色 | 说明 |
| --- | --- | --- |
| `demo_admin` | `ADMIN` | 平台管理员 |
| `demo_ticket` | `TICKET_ADMIN` | 景点管理员 |
| `demo_merchant` | `B` | 商户 |
| `demo_buyer_chen` | `C` | 游客 |
| `demo_buyer_lin` | `C` | 游客 |
| `demo_buyer_su` | `C` | 游客 |
| `demo_lin` / `demo_arong` | `C` | 社区演示用户 |

> 只跑默认的 `npx prisma db seed` 时只会写入 24 条资源，不会创建上述登录账号；`demo_admin` / `demo_ticket` 由 `npm run db:seed:tickets` 创建，其余账号需要两个演示数据开关。所有账号仅用于本地演示，不要用于生产环境。

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生成 Prisma Client 并构建生产包 |
| `npm run start` | 启动生产服务 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:deploy` | 应用已提交的数据库迁移 |
| `npm run db:migrate` | 开发环境创建/应用迁移 |
| `npm run db:push` | 直接同步 schema（仅开发调试） |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run db:seed:tickets` | 写入票务/场馆/管理员演示数据 |
| `npm run rag:ingest -- --vectors` | 构建 RAG 索引 |
| `npm run rag:test` | RAG 测试 |
| `npm run rag:eval` | RAG 评测 |

## 目录结构

```text
zhiyou-minyun/
├─ app/
│  ├─ (c)/                游客端页面
│  ├─ b/                  商户端页面
│  ├─ admin/              平台治理端 / 景点服务端
│  ├─ api/                Route Handlers
│  ├─ layout.tsx          根布局
│  └─ globals.css         全局样式
├─ features/              按业务域拆分的组件、样式与逻辑
├─ lib/                   数据库、鉴权、Redis、工具函数
├─ prisma/
│  ├─ schema.prisma       数据模型
│  ├─ migrations/         数据库迁移
│  ├─ seed.ts             演示数据
│  ├─ resources-data.ts   资源种子数据
│  └─ commerce-data.ts    商城/非遗种子数据
├─ public/
│  ├─ images/             静态图片资源
│  └─ uploads/            运行后上传目录（gitignore）
├─ scripts/               RAG 构建、评测、烟测脚本
├─ docs/                  项目文档
├─ prisma7.config.ts      Prisma 7 配置
├─ docker-compose.yml     Redis / Qdrant
└─ package.json
```

## 主要接口

| 分类 | 接口 |
| --- | --- |
| 认证 | `/api/auth/login`、`/api/auth/register`、`/api/auth/me`、`/api/auth/logout` |
| 资源 | `/api/resources` |
| AI 问答 | `/api/chat/answer`、`/api/chat/sessions`、`/api/chat/feedback` |
| 识景 | `/api/recognition` |
| 行程 | `/api/itinerary/plan`、`/api/itinerary/map`、`/api/itinerary/share` |
| 票务 | `/api/tickets`、`/api/bookings` |
| 社区 | `/api/community/posts`、评论、点赞、收藏、关注 |
| 商城 | `/api/shop/products`、`/api/orders` |
| 非遗 | `/api/works`、`/api/classes`、`/api/classes/[id]/enroll` |
| 便民 | `/api/help/facilities`、`/api/help/weather`、`/api/help/emergency` |
| 商户 | `/api/merchant/*` |
| 平台治理 | `/api/admin/*` |
| 健康检查 | `/api/health` |

## 常见问题

### `缺少 DATABASE_URL`

没有创建 `.env`，或者 Prisma CLI 读不到配置。复制 `.env.example` 为 `.env`，填写 `DATABASE_URL`。

### `Can't reach database server`

MySQL 未启动、端口不对、库不存在或账号密码错误。先确认：

```bash
mysql -uroot -p -e "SELECT 1;"
```

### 页面提示找不到 `generated/prisma`

执行：

```bash
npm run db:generate
```

### 地图空白或点位不显示

检查：

- `NEXT_PUBLIC_AMAP_JS_KEY` 是否填写
- `NEXT_PUBLIC_AMAP_SECURITY_CODE` 是否填写
- 高德控制台是否把 `localhost` 加入白名单
- 是否使用了正确的 Web 端 Key（不是 Web 服务 Key）

### AI 问答没有结果

检查：

- `DASHSCOPE_API_KEY` 是否配置
- `fuzhou_rag` 是否存在
- 是否执行过 `npm run rag:ingest -- --vectors`
- `.data/rag` 是否存在

### Redis 连接失败

Redis 是可选依赖。不启动 Redis 时，票务缓存和限流会回退到单进程内存；生产环境建议配置。

## 说明

- 本项目为课程/竞赛演示项目，演示数据与图片仅用于展示。
- 使用第三方地图、模型和图片素材时，请遵守对应平台的服务条款和版权要求。
- 生产部署前请替换 `AUTH_SECRET`、数据库密码和所有演示账号。
