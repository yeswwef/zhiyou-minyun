# 目的地资源中心功能包

该目录承载 C 端目的地资源中心的独立功能代码。

目录职责：

- `components`：资源列表、筛选、卡片、详情等界面组件
- `types`：资源、分类、筛选条件等 TypeScript 类型
- `constants`：资源分类、标签和默认配置
- `data`：开发阶段的演示数据，接入后端后可移除
- `repositories`：封装 API 或数据库数据访问
- `services`：搜索、筛选、详情查询等业务逻辑
- `hooks`：客户端状态和交互逻辑

依赖方向：页面层调用功能包，组件调用 hooks/services，services 调用 repositories。repositories 不依赖界面组件。
