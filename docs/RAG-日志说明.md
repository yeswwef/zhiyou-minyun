# RAG 控制台日志

运行 `npm run dev`，从问答页面提问，后端终端会输出 `[RAG]` 开头的单行 JSON 日志。同一次请求的 `requestId` 一致，使用 AsyncLocalStorage 隔离并发请求，不使用全局可变请求编号。

每条记录含时间、级别、事件和累计耗时；有开始/完成配对的模型、索引操作另含本阶段 `durationMs`。请求入口拒绝也有状态码；会话归属拒绝单独记录。正常完成后输出回答模式、引用数、向量命中/重排状态、首次正文及总耗时。

主要事件：request.start/validate/rejected/error/complete，question.received/route，history.load/save，index.load/cache/summary，context.resolve/resolved/clarify/expand/deduplicate，embedding，retrieval.start/complete/fallback，bm25.complete，dense.complete，rrf.complete，rerank，evidence.audit/result，generation，validation.quote_number/result，generation.retry，supplement，answer.fallback/complete，stream.open/first_text/disconnect/error。

`RAG_LOG_LEVEL` 默认 `info`，可选 `debug`、`off`。修改本地环境配置后重启服务。debug 额外记录脱敏截断的问题、还原问题、候选标题/分数及缺失方面，不记录完整文档、模型提示词、聊天历史、向量数组、密钥、授权头和数据库密码。脱敏不代表任意文本绝对安全，不要在生产环境长期启用 debug。

实时正文不逐 token 打日志；流结束统计事件数和累计发出字符数（替换事件可能使累计字符数大于最终正文长度）。首次正文指后端首次发送，不等于浏览器实际收到。客户端断开有记录，但当前模型请求可能仍继续至结束/超时，不能将断开日志解释成已取消上游调用。

日志仅输出控制台，尚未接日志平台或持久化轮转文件。独立评测脚本没有页面请求上下文，不自动打印这套页面请求日志。
