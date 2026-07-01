# Spec

## 问题
用户已把 Codex 当前 shell 切到 PowerShell 7，但 Dong Skills 发布的 Windows hooks 仍通过 `powershell.exe` 入口运行。若简单把 hooks 全部改成 `pwsh`，旧机器或没有 PowerShell 7 的项目会直接失效；若完全保留旧入口，中文 Markdown、中文路径或中文输出在 Windows PowerShell 5.1 场景下仍容易出现乱码误判。

## 目标
- Windows hooks 在可用时优先走 PowerShell 7 / `pwsh`。
- 没有 `pwsh` 时 hooks 仍能通过 Windows PowerShell 5.1 回退运行。
- 保持 `-EncodedCommand`，避免 PowerShell 变量扩展和 quoting 问题。
- 明确 agent 在 Windows 上处理中文 Markdown 时必须使用 UTF-8 视角验证，不把 Windows PowerShell 5.1 的显示乱码误判为文件损坏。
- 根目录项目资产和 onboarding bootstrap 资产保持同步。

## 审批状态
用户要求继续优化 Dong Skills；本项属于已讨论清楚的兼容性修补，不需要新增产品 spec 审批。

## 事实优先级
- 最新用户指令。
- 本机验证结果：Codex 当前 shell 为 PowerShell 7，`pwsh` 可用。
- 当前 hooks 配置、health check 和测试结果。
- 旧状态文件和历史讨论。

## 工作类别 / 风险等级
Lane 1 / Lane 2：发布配置、bootstrap 镜像、健康检查、测试和治理文档更新；不改业务项目代码，不引入新依赖。

## 用户决策
- 当前 Dong Skills 保持 Codex 专用。
- 中文状态文档和用户可读 Markdown 应可靠支持中文。
- hooks 不应为了本机方便而牺牲旧环境兼容性。

## 非目标
- 不把所有 hooks 硬切为 `pwsh`。
- 不修改用户本机非 Dong Skills 的其他 skills。
- 不引入新的跨平台安装器。
- 不解决所有 PowerShell 5.1 乱码场景，只降低 hooks 和 Dong Skills 文档操作中的风险。

## 已批准范围
- 更新 `.codex/hooks.json` 和 bootstrap 镜像中的 `.codex/hooks.json`。
- 更新 health check，防止后续 release 回退到不优先 `pwsh` 的 Windows hook。
- 更新测试覆盖 hook 形状。
- 更新 AGENTS 和工具映射中的 Windows / UTF-8 操作纪律。

## 设计
- `commandWindows` 外层仍使用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand <outer>`。
- outer script:
  - `Get-Command pwsh -ErrorAction SilentlyContinue`
  - 若存在，执行 `& $pwsh.Source -NoProfile -EncodedCommand <inner>`。
  - 若不存在，直接执行旧逻辑：定位 Git root 并运行 `.codex/hooks/launch-project-ops.mjs`。
- inner script 是原本 hook launcher 逻辑的 encoded PowerShell 版本。
- health check 解码 outer script，检查 `Get-Command pwsh` 和 `} else {`，避免丢失优先 `pwsh` 或 fallback。

## 验收标准
- 发布的 `.codex/hooks.json` 和 onboarding bootstrap hook 配置都包含优先 `pwsh` 且有 fallback 的 Windows hook。
- health check 能拒绝缺少 `pwsh` 优先路径或缺少 fallback 的 Windows hook。
- 测试能解码 outer 和 inner `EncodedCommand` 并确认最终仍调用 `.codex/hooks/launch-project-ops.mjs`。
- AGENTS 和工具映射明确中文 UTF-8 验证纪律。
- 完整测试、release check、hook health check 和 diff check 通过。

## 开放问题
- 无。

## 下一步
运行完整验证后提交并推送。
