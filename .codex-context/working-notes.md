# 工作记录

## 用途

- 保留当前稳定性调查的复现、根因、假设与下一验证，不保存隐藏推理或完整日志。

## 当前发现

- 旧 scoped recovery 文件会永久压制 unscoped fallback。
- unscoped recovery 未消费时可被多个 session 使用。
- PowerShell pipeline 的 `Select-Object` 未在只读白名单。
- 当前项目 hook 会误判另一个仓库的 patch/命令，真实宿主可能只暴露绝对命令路径。
- `tool_response={}` 被当成失败，导致实际状态 refresh 不入 receipt。

## 当前假设

- 原子 claim lock + scoped promotion + unscoped consumption 可同时解决死锁和隔离。
- 外部作用域必须依赖明确路径证据；不对无目标 opaque mutation 放行。
- unknown response 应允许 hash-based refresh，explicit failure 不允许。

## 已排除路径

- 不删除所有 scoped receipts 作为长期修复。
- 不让 unscoped receipt 对所有 session 永久有效。
- 不把所有 PowerShell pipeline 判为只读。
- 不通过关闭 hooks 或让研究任务进入 execution 来维护外部源码。

## 开放调查问题

- 完整 domain suite 是否存在顺序污染、超时或安装事务残留？
- 新外部路径规则是否存在混入当前 root 的绕过？
- installer 更新后真实 host 是否需要重启才能加载新 runtime？

## 下一步验证

- workflow-hooks 全量。
- domain runner 与 release-check。
- 关键测试重复 3 次。
- installer + downstream host simulation。

## 提升记录

- 当前属于 Dong Skills 源码修复，最终写入源码 backlog/solution，而不是研究项目 instinct。
