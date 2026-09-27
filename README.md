# 智游闽韵 · zhiyou-minyun（空壳）

福建文旅智能化平台的**空壳工程**：框架、路由、数据库链路全部就位，**没有任何业务功能**。
业务模块按需求逐个加，加之前先说明动哪些文件、为什么。

- 搭建依据：《智游闽韵-搭建步骤书-v1》
- 需求依据：《智游闽韵 功能需求规格说明书 v1》/《实施计划书》（均在上级目录 `docs/`）
- 📄 目录与依赖说明：[docs/项目结构与包说明.md](docs/项目结构与包说明.md)
- 🚀 启动步骤：[docs/空壳启动说明.md](docs/空壳启动说明.md)

## 现在有什么

```
app/
├─ page.tsx                  /              入口页（C 端 / B 端两个链接）
├─ (c)/layout.tsx + home/    /home          C 端外壳 + 首页占位
├─ b/layout.tsx + dashboard/ /b/dashboard   B 端外壳 + 看板占位
└─ api/health/route.ts       /api/health    健康检查（测 MySQL 是否连通）
lib/db.ts                                   Prisma 客户端（统一从这里引入）
prisma/schema.prisma                        4 组核心表：User / Resource+Tag / Favorite / ChatSession+ChatMessage
docker-compose.yml                          Qdrant 向量库（备用，还没接）
prisma7.config.ts                           Prisma 7 配置（连接串 / 迁移 / seed）
.vscode/                                    7 个任务 + F5 调试配置
```

## 技术栈（已装好的依赖）

Next.js 16 · TypeScript · Tailwind CSS 4 · Prisma 7 + MySQL 8 · driver adapter（`@prisma/adapter-mariadb`）

## 启动

```powershell
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run dev
```

打开 <http://localhost:3000>，再访问 <http://localhost:3000/api/health>，看到 `"db":"up"` 即链路打通。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（http://localhost:3000） |
| `npm run build` | 生产构建（会先跑 prisma generate） |
| `npm run typecheck` | 类型检查 |
| `npm run lint` | 代码规范检查 |
| `npm run db:migrate -- --name 说明` | 改完 schema 后建表 / 改表 |
| `npm run db:generate` | 重新生成 Prisma 客户端 |
| `npm run db:studio` | 可视化查看数据库（http://localhost:5555） |

## 后面按顺序加什么（等你点名）

C 端：AI 文化问答 → 资源中心 → 行程规划 → 多模态识景 → 票务预约 → 便民应急 → 社区 → 商品 → 非遗学习
B 端：商户登录鉴权 → 商品上架 → 订单核销 → 活动报名 → AI 内容生产 → 数字工作室
基建：登录会话 → 素材种子数据 → 向量库与 RAG → 模型接入 → 部署与监控

> 完整实现（8 模块 + 24 接口 + 44 条素材）已归档在 `..\_archive\zhiyou-minyun-full-20260926\`，
> 需要时照抄回来即可，不用从零写。
