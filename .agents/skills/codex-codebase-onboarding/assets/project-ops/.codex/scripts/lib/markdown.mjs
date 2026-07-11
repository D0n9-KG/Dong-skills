import path from "node:path";
import { mtimeMs, readText } from "./core.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

const HEADING_ALIASES = {
  "Active Assumptions": ["当前假设"],
  "Active Plan": ["当前计划"],
  "Approval Status": ["审批状态"],
  "Approved Scope": ["已批准范围"],
  "Approved Scope / Spec": ["已批准范围 / 规格"],
  "Architecture Risks": ["架构风险"],
  "Architecture Watchpoints": ["架构关注点"],
  "Artifact Readiness": ["计划就绪度"],
  "Acceptance Criteria": ["验收标准"],
  "Archived Evidence": ["已归档证据"],
  "Blockers": ["阻塞项"],
  "Branch State": ["分支状态"],
  "Candidate Options": ["候选方案"],
  "Categories": ["分类"],
  "Checkpoint Cadence": ["存档节奏"],
  "Commands": ["命令"],
  "Commands Run": ["已运行命令"],
  "Conventions": ["约定"],
  "Created": ["已创建"],
  "Current Findings": ["当前发现"],
  "Current Hypothesis": ["当前假设"],
  "Current Phase": ["当前阶段"],
  "Current Step": ["当前步骤"],
  "Current Workspace": ["当前工作区"],
  "Decisions Made": ["已做决策"],
  "Design": ["设计"],
  "Documentation Risks": ["文档风险"],
  "Entry Points": ["入口点"],
  "Execution Approval": ["执行审批"],
  "Execution Mode": ["执行模式"],
  "Files Modified": ["已修改文件"],
  "Files Read But Not Changed": ["已读取但未修改文件"],
  "Files To Re-read First": ["优先重读文件"],
  "Git Checkpoint": ["Git 存档"],
  "Goal": ["目标"],
  "Goals": ["目标"],
  "Goal Mode Objective": ["Goal 模式目标"],
  "Important Paths": ["重要路径"],
  "Latest User Instruction": ["最新用户指令"],
  "Learned Instincts To Preserve": ["需要保留的经验沉淀"],
  "Latest commit": ["最新提交"],
  "Latest functional commit": ["最新功能提交"],
  "Loop Review": ["循环审查"],
  "Modified": ["已修改"],
  "Next Action": ["下一步动作"],
  "Next checkpoint": ["下次存档"],
  "Next Step": ["下一步"],
  "Next Verification Step": ["下一步验证"],
  "Non-Goals": ["非目标"],
  "Not Yet Verified": ["尚未验证"],
  "Objective": ["目标"],
  "Open Investigation Questions": ["开放调查问题"],
  "Open Questions": ["开放问题"],
  "Open Questions And Assumptions": ["开放问题与假设"],
  "Out Of Scope": ["范围外"],
  "Ownership And Cleanup": ["所有权与清理"],
  "Plan Status": ["计划状态"],
  "Primary Checkout": ["主检出区"],
  "Problem": ["问题"],
  "Product Evidence": ["产品证据"],
  "Promotion Notes": ["提升记录"],
  "Purpose": ["用途"],
  "Push state": ["推送状态"],
  "Raw Outputs": ["原始输出"],
  "Read / Inspected": ["已读取 / 已检查"],
  "Rejected Paths": ["已排除路径"],
  "Review Evidence": ["审查证据", "Review"],
  "Resume Instructions": ["恢复指令"],
  "Risks": ["风险"],
  "Runtime Constraints": ["运行约束"],
  "Safety / Destructive Risks": ["安全 / 破坏性风险"],
  "Spec Approval": ["规格审批"],
  "Stack": ["技术栈"],
  "Files included": ["已包含文件"],
  "Files intentionally left uncommitted": ["有意保留未提交的文件"],
  "Files left uncommitted": ["保留未提交的文件"],
  "Deferred reason": ["暂缓原因"],
  "Tasks": ["任务"],
  "Technical Risks": ["技术风险"],
  "Truth Hierarchy": ["事实优先级"],
  "Unknowns": ["未知项"],
  "User Decisions": ["用户决策"],
  "Verification": ["验证"],
  "Verification Evidence": ["验证证据"],
  "Where To Change Things": ["修改位置指南"],
  "Work Class / Risk Lane": ["工作类别 / 风险等级"]
};

export function headingAliases(heading) {
  return [heading, ...(HEADING_ALIASES[heading] || [])];
}

export function headingLabel(heading) {
  return headingAliases(heading).join(" or ");
}

function headingStartIndex(lines, heading) {
  const headings = headingAliases(heading);
  return lines.findIndex((line) => headings.some((candidate) => line.trim() === `## ${candidate}`));
}

export function hasHeading(markdown, heading) {
  return headingStartIndex(String(markdown || "").split(/\r?\n/), heading) !== -1;
}

export function hasAnyHeading(markdown, headings) {
  return headings.some((heading) => hasHeading(markdown, heading));
}

export function sectionContent(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = headingStartIndex(lines, heading);
  if (start === -1) return "";
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ")) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkpointField(checkpoint, labels) {
  for (const label of labels) {
    for (const candidate of headingAliases(label)) {
      const pattern = new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegex(candidate)}\\s*[:：]\\s*(.*)$`, "im");
      const match = checkpoint.match(pattern);
      if (match) return match[1].trim();
    }
  }
  return "";
}

export function validateGitCheckpointSection(checkpoint) {
  const fields = {
    latestCommit: checkpointField(checkpoint, ["Latest commit", "Latest functional commit"]),
    pushState: checkpointField(checkpoint, ["Push state"]),
    filesIncluded: checkpointField(checkpoint, ["Files included"]),
    filesLeft: checkpointField(checkpoint, ["Files intentionally left uncommitted", "Files left uncommitted"]),
    deferredReason: checkpointField(checkpoint, ["Deferred reason"]),
    nextCheckpoint: checkpointField(checkpoint, ["Next checkpoint"])
  };

  const missing = [];
  if (!meaningful(fields.pushState)) missing.push("Push state");
  if (!meaningful(fields.filesIncluded) && !meaningful(fields.filesLeft)) {
    missing.push("Files included or Files intentionally left uncommitted");
  }
  if (!meaningful(fields.latestCommit) && !meaningful(fields.deferredReason)) {
    missing.push("Latest commit or Deferred reason");
  }
  if (!meaningful(fields.nextCheckpoint)) missing.push("Next checkpoint");

  return { ok: missing.length === 0, missing, fields };
}

export function meaningful(text) {
  const compact = String(text || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^[-*]\s*/gm, "")
    .replace(/[.。]/g, "")
    .trim();
  if (/^(None yet|None known|None|Unknown|No formal plan yet|暂无正式计划|暂无已知风险|尚未检测|待定|暂无|无|未知)$/i.test(compact)) {
    return false;
  }

  const stripped = text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/None yet\.?/gi, "")
    .replace(/None known\.?/gi, "")
    .replace(/None\.?/gi, "")
    .replace(/Unknown\.?/gi, "")
    .replace(/No formal plan yet\.?/gi, "")
    .replace(/暂无正式计划/g, "")
    .replace(/暂无已知风险/g, "")
    .replace(/尚未检测/g, "")
    .replace(/待定/g, "")
    .replace(/暂无/g, "")
    .replace(/未知/g, "")
    .replace(/-/g, "")
    .trim();
  return stripped.length > 0;
}

export function markdownStatus(ctx, name, latest, label = name) {
  const file = path.join(ctx, name);
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  return {
    ok: !stale,
    stale,
    issue: stale ? `${label} is older than changed project files` : ""
  };
}

export function handoffStatus(ctx, latest) {
  const file = path.join(ctx, REQUIRED_FILES.handoff);
  const markdown = readText(file);
  const required = [
    "Objective",
    "Latest User Instruction",
    "Approved Scope / Spec",
    "Plan Status",
    "Files Modified",
    "Decisions Made",
    "Verification Evidence",
    "Git Checkpoint",
    "Next Action",
    "Files To Re-read First"
  ];
  const missing = required.filter((heading) => !meaningful(sectionContent(markdown, heading)));
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  return { ok: missing.length === 0 && !stale, missing, stale };
}

export function verificationStatus(ctx, latest) {
  const file = path.join(ctx, REQUIRED_FILES.verification);
  const markdown = readText(file);
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  const commands = sectionContent(markdown, "Commands Run");
  const gaps = sectionContent(markdown, "Not Yet Verified");
  const hasEvidence = meaningful(commands) || meaningful(gaps);
  return { ok: !stale && hasEvidence, stale, hasEvidence };
}
