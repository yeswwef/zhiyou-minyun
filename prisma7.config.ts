/**
 * @module-note prisma7.config.ts
 * 项目构建配置：定义工具运行方式，不是业务请求入口。修改后需按对应工具要求重启或重新构建。
 */
// Prisma 7 配置文件（v7 起 datasource / seed 写在这里，不再写 package.json#prisma）
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
