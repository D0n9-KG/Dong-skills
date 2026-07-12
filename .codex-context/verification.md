# 验证

## 当前任务：Dong Skills 语义状态治理修复
- `node --test tests/domains/assets-worktree.test.mjs`
  - Result: pass
  - Evidence: 9/9 tests passed；覆盖 asset-governance semantic state drift 与 raw footprint advisories。
  - Date: 2026-07-12.
- `node --test tests/domains/health-release.test.mjs`
  - Result: pass
  - Evidence: 23/23 tests passed；覆盖 health semantic warnings 不 fail 与 release-check maxBuffer。
  - Date: 2026-07-12.
- `node --test tests/domains/core.test.mjs`
  - Result: pass
  - Evidence: 24/24 tests passed。
  - Date: 2026-07-12.
- `node --test tests/domains/workflow-hooks.test.mjs`
  - Result: pass
  - Evidence: 92/92 tests passed。
  - Date: 2026-07-12.
- `node scripts/run-domain-tests.mjs`
  - Result: pass
  - Evidence: 219/219 tests across 11 domains passed。
  - Date: 2026-07-12.
- `node scripts/project-ops-health.mjs .`
  - Result: pass
  - Evidence: static configuration pass、runtime parity pass、Issues none；仅 hook liveness runtime-mismatch warning。
  - Date: 2026-07-12.
- `node scripts/asset-governance.mjs .`
  - Result: pass
  - Evidence: Blocking issues none；仅建议 verification command entries 10→8 和复核 on-demand state freshness。
  - Date: 2026-07-12.
- `node scripts/release-check.mjs .`
  - Result: pass
  - Evidence: health-check、context budget、Node/PowerShell syntax、domain-sharded tests、privacy scan、readability scan、large-file scan、runtime-artifact scan 全部通过。
  - Date: 2026-07-12.
- `git diff --check`
  - Result: pass。
  - Date: 2026-07-12.

## Review Evidence
- Scope: asset-governance、project-ops-health、release-check、状态治理技能文档、bootstrap 镜像、领域测试。
- Verdict: Ready for final re-run, commit, and push if the fresh release check remains green。
- Blocking findings: none in the completed verification set。
- Residual risks: semantic drift 规则是启发式 warning，不能替代人工判断；旧项目需要重新 bootstrap 才能拿到新规则。
## 当前任务：Recovery receipt 作用域修复
- `node --test tests/domains/workflow-hooks.test.mjs --test-name-pattern "compound read-only diagnostics|unscoped recovery eval receipt|recovery acknowledgements remain scoped|recovery receipt is invalidated|recovery receipt covers transitive"`
  - Result: pass
  - Evidence: workflow-hooks 93/93 pass；覆盖 unscoped recovery fallback、session scoped isolation、runtime hash invalidation、transitive runtime hash、compound read-only diagnostics。
  - Date: 2026-07-12.