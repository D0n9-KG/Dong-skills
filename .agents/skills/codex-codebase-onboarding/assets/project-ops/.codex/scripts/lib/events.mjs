import fs from "node:fs";
import path from "node:path";
import { assetGovernanceStatus } from "./assets.mjs";
import { fileFresh, latestChangedMtime, mtimeMs, readText, shortList, writeJson, writeTextAtomic } from "./core.mjs";
import { changedPathsNeedVerification, gitChangedFiles, gitCheckpointStatus, gitDiffFilesResult, gitHeadResult, gitStatusFiles, gitStatusResult, isGovernancePath } from "./git.mjs";
import { handoffStatus, markdownStatus, meaningful, sectionContent, verificationStatus } from "./markdown.mjs";
import {
  appendLearningObservation,
  classifyLearningCue,
  extractPromptText,
  learningStatus,
  redactSensitiveText,
  sanitizeLearningExcerpt
} from "./learning.mjs";
import { sessionRecoveryContext } from "./recovery.mjs";
import {
  advanceDecisionReceiptStatus,
  decisionReceiptStatus,
  hookSessionKey,
  readRuntimeReceipt,
  recoveryReceiptStatus,
  removeAdvanceDecisionReceipt,
  removeDecisionReceipt,
  removeRecoveryReceipt,
  removeRuntimeReceipt,
  scopedRuntimeReceiptName,
  stableFingerprint,
  updateRuntimeReceipt,
  withRuntimeLock,
  writeDecisionReceipt,
  writeAdvanceDecisionReceipt,
  writeRecoveryReceipt,
  writeRuntimeReceipt
} from "./runtime.mjs";
import { activeWayfinderStatus, evaluateRecovery } from "./recovery-eval.mjs";
import { REQUIRED_FILES } from "./templates.mjs";
import { DECISION_TRANSITIONS, reopenWorkflowAfterProjectMutation, workflowContextHash, workflowStatus } from "./workflow.mjs";

const DISCUSSION_STATE_FILE = "discussion-state.json";
const CHANGE_REFRESH_FILES = [
  REQUIRED_FILES.artifacts,
  REQUIRED_FILES.current,
  REQUIRED_FILES.verification,
  REQUIRED_FILES.handoff
];
const ACTIVE_DISCUSSION_PHASES = new Set(["discovery", "wayfinding", "brainstorming", "spec", "planning", "debugging"]);
const ACTIVE_INVESTIGATION_PHASES = new Set(["discovery", "wayfinding", "brainstorming", "spec", "planning", "execution", "debugging"]);
const EXECUTION_DIRECTIVE_PHASES = new Set(["execution", "debugging", "verification", "review", "delivery", "handoff"]);
const EVIDENCE_REQUIRED_PHASES = new Set(["execution", "debugging", "verification", "review", "delivery"]);
const CHECKPOINT_REQUIRED_PHASES = new Set(["delivery", "handoff", "complete"]);

export function sessionStart(input, root, ctx) {
  removeRecoveryReceipt(ctx, "", { required: true });
  removeRecoveryReceipt(ctx, hookSessionKey(input), { required: true });
  removeDecisionReceipt(ctx, "", { required: true });
  removeRuntimeReceipt(ctx, stopContinuationReceiptName(input));
  writeJson(sessionRecoveryContext(root, ctx, "SessionStart"));
}

export function postCompact(input, root, ctx) {
  removeRecoveryReceipt(ctx, "", { required: true });
  removeRecoveryReceipt(ctx, hookSessionKey(input), { required: true });
  removeDecisionReceipt(ctx, "", { required: true });
  removeRuntimeReceipt(ctx, stopContinuationReceiptName(input));
  writeJson({ continue: true });
}

function allowStop(systemMessage = "") {
  writeJson(systemMessage ? { systemMessage } : {});
}

function blockStop(reason) {
  writeJson({
    decision: "block",
    reason
  });
}

function readJsonFile(file) {
  if (!fs.existsSync(file)) {
    return { ok: true, exists: false, value: null, error: "" };
  }
  try {
    return {
      ok: true,
      exists: true,
      value: JSON.parse(fs.readFileSync(file, "utf8")),
      error: ""
    };
  } catch (error) {
    return {
      ok: false,
      exists: true,
      value: null,
      error: error.message
    };
  }
}

function discussionStateFile(ctx) {
  return path.join(ctx, DISCUSSION_STATE_FILE);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function workflowStateFor(root, ctx) {
  return workflowStatus(root, ctx).state || {};
}

function discussionWorkflowActive(state) {
  return ACTIVE_DISCUSSION_PHASES.has(state.phase) ||
    ["living-draft", "pending-approval"].includes(state.spec_status) ||
    ["clarify-scope", "written-spec-approval", "execution-approval", "user-choice"].includes(state.decision_required);
}

function investigationWorkflowActive(state) {
  return ACTIVE_INVESTIGATION_PHASES.has(state.phase) ||
    ["living-draft", "pending-approval"].includes(state.spec_status);
}

function discussionRefreshFiles(root, ctx, state) {
  switch (state.phase) {
    case "discovery":
      return [REQUIRED_FILES.current, REQUIRED_FILES.questions, REQUIRED_FILES.handoff];
    case "wayfinding": {
      const wayfinder = activeWayfinderStatus(root, ctx);
      return unique([
        wayfinder.active ? wayfinder.reference : "",
        REQUIRED_FILES.workingNotes,
        REQUIRED_FILES.current,
        REQUIRED_FILES.handoff
      ]);
    }
    case "brainstorming":
    case "spec":
      return [
        REQUIRED_FILES.spec,
        REQUIRED_FILES.current,
        REQUIRED_FILES.decisions,
        REQUIRED_FILES.questions,
        REQUIRED_FILES.handoff
      ];
    case "planning":
      return [REQUIRED_FILES.plan, REQUIRED_FILES.current, REQUIRED_FILES.handoff];
    case "debugging":
      return [REQUIRED_FILES.workingNotes, REQUIRED_FILES.current, REQUIRED_FILES.handoff];
    default:
      return [REQUIRED_FILES.current, REQUIRED_FILES.handoff];
  }
}

function executionEvidenceRequired(state, files) {
  return EVIDENCE_REQUIRED_PHASES.has(state.phase) || changedPathsNeedVerification(files);
}

function checkpointReviewRequired(state, files) {
  return CHECKPOINT_REQUIRED_PHASES.has(state.phase) || executionEvidenceRequired(state, files);
}

function promptIsSubstantive(prompt) {
  return String(prompt || "").trim().length >= 2;
}

function promptIsBareContinuation(prompt) {
  return /^(?:继续(?:吧|执行)?|接着(?:做|来)?|往下(?:做)?|continue|go on|proceed)[。.!！\s]*$/i.test(String(prompt || "").trim());
}

function promptIsStatusInquiry(prompt) {
  const text = String(prompt || "").trim();
  if (/^(?:(?:现在|目前|当前)\s*)?(?:(?:进展|进度|状态|情况)(?:到哪(?:里|儿)?|如何|怎么样)?|做到哪(?:里|儿)?|到哪(?:里|儿)?|遇到什么问题|出了什么问题|为什么停了|what(?:'s| is) the status|where are we|what happened)(?:了|呢|吗)?[？?。.!！\s]*$/i.test(text)) {
    return true;
  }
  if (/(?:修复|修改|调整|更新|实现|添加|新增|删除|移除|重写|fix|change|update|implement|add|remove|delete)/i.test(text)) {
    return false;
  }
  const reviewCue = /(?:复核|核对|确认|检查|查看|看一下|review|check|confirm)/i.test(text);
  const observationCue = /(?:没有看到|没看到|看不到|未看到|是否|有没有|有无|是不是|正常|生效|触发|记录|coverage|覆盖)/i.test(text);
  const runtimeSubject = /(?:stop(?:\s*hooks?)?|hooks?|coverage|覆盖|liveness|freshness|运行态|状态|记录|触发)/i.test(text);
  return text.length <= 160 && reviewCue && observationCue && runtimeSubject;
}

function promptIsProjectOpsOnly(prompt) {
  const text = String(prompt || "").trim();
  const strongSubject = /(?:dong\s*-?\s*skills|codex\s+project\s+ops|project\s+ops)/i.test(text);
  const hookSubject = /(?:(?:stop|precompact|postcompact|subagent|userpromptsubmit|pretooluse|posttooluse)\s*hooks?|workflow-state|context-recovery|asset-governance|project-ops|hooks?)/i.test(text);
  const governanceCue = /(?:提醒|门禁|限制|干扰|辅助|治理|安装|更新|修复|关闭|开启|启用|停用|trust|coverage|liveness|freshness|runtime|dirty|状态|复核|检查|问题|原则)/i.test(text);
  const businessCue = /(?:研究|实验|论文|方法|模型|数据|评测|指标|baseline|业务|产品|页面|接口|功能|数据库|用户流程)/i.test(text);
  return (strongSubject || (hookSubject && governanceCue)) && !businessCue;
}

function promptLooksLikeQuestionOrReview(prompt) {
  const text = String(prompt || "").trim();
  return /[？?]\s*$/.test(text) ||
    /(?:是否|能否|可否|吗(?:[。.!！\s]|$))/.test(text) ||
    /(?:请|帮我|麻烦).{0,10}(?:确认|检查|评估|说明|解释|比较|review|check|confirm|evaluate)/i.test(text);
}

function promptChangesApprovedScope(prompt) {
  const text = String(prompt || "");
  return /(?:调整|修改|变更|扩大|缩小|提高|降低|新增|增加|删除|移除|取消).{0,12}(?:范围|需求|目标|验收标准|优先级|非目标)|(?:范围|需求|目标|验收标准|优先级|非目标).{0,12}(?:调整|修改|变更|扩大|缩小|提高|降低|新增|增加|删除|移除|取消)/i.test(text) ||
    /(?:api|接口|函数|方法|命令|cli|页面|组件|字段|格式|输出|返回|endpoint|function|command|page|component|field|format|output|return).{0,28}(?:改成|改为|换成|新增|增加|删除|移除|支持|禁用|不再|必须|只允许|change|switch|add|remove|delete|support|disable|must)/i.test(text) ||
    /(?:这轮|本轮|当前|现在|暂时).{0,16}(?:不用|不需要|不做|不实现|不支持|不考虑)|(?:不用|不需要|不做|不实现|不支持|不考虑).{0,16}(?:这轮|本轮|当前|现在|暂时|了)/i.test(text) ||
    /(?:先|暂时).{0,8}(?:不做|不实现|不支持|不考虑)|(?:先)?只做|仅做/i.test(text) ||
    /(?:放到|留到|推迟到|延后到).{0,20}(?:下一轮|下轮|下个|后续|以后)|(?:下一轮|下轮|下个|后续|以后).{0,20}(?:再做|再实现|再支持|再考虑)/i.test(text) ||
    /(?:优先|先做|先完成).{0,32}(?:以后再|后面再|下一轮再|下轮再|稍后再|暂缓|延后|放到)/i.test(text) ||
    /(?:only|defer|deferred|postpone|postponed|out of scope|not in this (?:iteration|release|milestone))/i.test(text);
}

function promptIsLearningOnly(prompt, cue) {
  if (!cue || promptChangesApprovedScope(prompt)) return false;
  const text = String(prompt || "");
  const futurePreference = /(?:以后|今后|下次|往后|记住|from now on|in the future|next time|always|never)/i.test(text);
  const codexProcessPreference =
    /(?:验证.{0,20}声称|声称.{0,20}(?:完成|修复)|不要假设|别假设|先.{0,12}(?:测试|验证)|回复|回答|提交|审查|计划|文档|记忆|verify.{0,20}claim|claim.{0,20}(?:complete|fixed)|do not assume|test first|response|commit|review|plan|docs|memory)/i.test(text);
  const projectObject =
    /(?:api|接口|函数|方法|命令|cli|页面|组件|字段|格式|json|xml|数据库|数据表|endpoint|function|command|page|component|field|format|database)/i.test(text);
  return futurePreference && codexProcessPreference && !projectObject;
}

function executionDirectiveRefreshFiles(state, scopeChange) {
  const files = {
    execution: [REQUIRED_FILES.plan, REQUIRED_FILES.current, REQUIRED_FILES.handoff],
    debugging: [REQUIRED_FILES.workingNotes, REQUIRED_FILES.current, REQUIRED_FILES.handoff],
    verification: [REQUIRED_FILES.verification, REQUIRED_FILES.current, REQUIRED_FILES.handoff],
    review: [REQUIRED_FILES.verification, REQUIRED_FILES.current, REQUIRED_FILES.handoff],
    delivery: [REQUIRED_FILES.current, REQUIRED_FILES.handoff],
    handoff: [REQUIRED_FILES.current, REQUIRED_FILES.handoff]
  }[state.phase] || [REQUIRED_FILES.current, REQUIRED_FILES.handoff];
  return unique(scopeChange ? [REQUIRED_FILES.spec, REQUIRED_FILES.plan, ...files] : files);
}

const RECEIPT_REQUIRED_EVENTS = new Set(Object.values(DECISION_TRANSITIONS).flat());

function decisionEvidenceHash(root, ctx, state, decision) {
  const names = {
    "written-spec-approval": [REQUIRED_FILES.spec],
    "execution-approval": [REQUIRED_FILES.plan],
    "verification-gap-acceptance": [REQUIRED_FILES.verification],
    "verification-failure-choice": [REQUIRED_FILES.verification],
    "user-choice": [REQUIRED_FILES.current, REQUIRED_FILES.handoff]
  }[decision] || [REQUIRED_FILES.current];
  return stableFingerprint({
    task_id: state.task_id,
    task_generation: String(state.task_generation),
    decision,
    files: names.map((name) => ({ name, content: readText(path.join(ctx, name)) }))
  });
}

function promptRejectsDecision(prompt) {
  return /(?:不批准|不要批准|别批准|暂不批准|先不批准|先不要|不同意|尚未同意|未同意|不能确认|无法确认|拒绝|不接受|暂不接受|不要继续|暂不执行|先别执行|不要开始|先别开始|需要修改|仍需修改|还需修改|先修改|调整后|not approve|do not approve|cannot confirm|do not accept|reject|do not proceed|do not start|not yet execute)/i.test(prompt);
}

function promptRequestsVerificationRetry(prompt) {
  return /(?:不接受|拒绝).{0,24}(?:缺口|gap)|(?:缺口|gap).{0,24}(?:不接受|拒绝)|(?:继续修复|修复后再|重试|retry|fix)/i.test(prompt);
}

function promptRequestsPlanThenExecute(prompt) {
  const text = String(prompt || "").trim();
  if (!text || promptRetractsPlanThenExecute(text)) return false;
  return /plan-then-execute|(?:先|首先|先做|先写|制定|完成).{0,40}(?:计划|plan).{0,80}(?:再|然后|随后|后|then|and).{0,40}(?:执行|实现|execute|implement)|(?:计划|plan).{0,40}(?:后直接|然后|then|and).{0,40}(?:执行|实现|execute|implement)/i.test(text);
}

function promptRetractsPlanThenExecute(prompt) {
  const text = String(prompt || "").trim();
  return /(?:不要|别|先别|暂不|不再|停止).{0,24}(?:执行|实现|execute|implement)|(?:只要|只写|只做).{0,16}(?:计划|plan)|plan\s+only/i.test(text);
}

function promptRetractsSpecSkip(prompt) {
  const text = String(prompt || "").trim();
  return /(?:不要|不能|不应|不该).{0,12}(?:跳过|略过|省略).{0,24}(?:brainstorm(?:ing)?|头脑风暴|需求澄清|规格讨论|方案讨论)|(?:do not|don't|must not|should not).{0,24}(?:skip|bypass).{0,24}(?:brainstorm(?:ing)?|spec discussion)/i.test(text);
}

function promptRequestsSpecSkip(prompt) {
  const text = String(prompt || "").trim();
  if (!text || promptRetractsSpecSkip(text)) return false;
  return /(?:跳过|略过|省略|无需|不用|不需要).{0,24}(?:brainstorm(?:ing)?|头脑风暴|需求澄清|规格讨论|方案讨论)|(?:brainstorm(?:ing)?|头脑风暴|需求澄清|规格讨论|方案讨论).{0,24}(?:跳过|略过|省略|无需|不用|不需要)|(?:skip|bypass).{0,24}(?:brainstorm(?:ing)?|spec discussion)/i.test(text);
}

function planThenExecuteRecorded(ctx) {
  const markdown = readText(path.join(ctx, REQUIRED_FILES.plan));
  const approval = sectionContent(markdown, "Execution Approval");
  const mode = sectionContent(markdown, "Execution Mode");
  return /plan-then-execute|先计划.*执行|计划后执行/i.test(approval) &&
    /traditional|task-by-task|逐项|传统/i.test(mode);
}

function userDecisionFromPrompt(prompt, state) {
  const text = String(prompt || "").trim();
  const decision = state.decision_required;
  if (!DECISION_TRANSITIONS[decision] || !text) return null;
  if (promptLooksLikeQuestionOrReview(text)) return null;
  if (["verification-gap-acceptance", "verification-failure-choice"].includes(decision) &&
      promptRequestsVerificationRetry(text)) {
    return { event: "verification-retry", decision };
  }
  if (promptRejectsDecision(text)) return null;
  const bareAffirmative = /^(?:可以|同意|批准|确认|好的|好|yes|approved|approve|go ahead)[。.!！\s]*$/i.test(text);
  if (decision === "written-spec-approval") {
    const explicitSpecSkip =
      /(?:跳过|无需|不需要).{0,10}(?:书面)?规格|(?:书面)?规格.{0,10}(?:跳过|无需|不需要)|skip.{0,10}(?:written\s+)?spec/i.test(text);
    const negatedSpecSkip =
      /(?:不要|别|暂不|先不|先别).{0,10}(?:跳过|省略).{0,10}(?:书面)?规格|(?:书面)?规格.{0,10}(?:不要|别|暂不|先不|先别).{0,10}(?:跳过|省略)/i.test(text);
    const explicitSpecApproval =
      /(?:我|我们)?(?:批准|同意|接受|确认通过).{0,12}(?:这份|当前|该)?(?:书面)?规格|(?:这份|当前|该)?(?:书面)?规格.{0,12}(?:批准|通过|没问题|可以了)|(?:approve|accept).{0,16}(?:written\s+)?spec/i.test(text);
    if (explicitSpecSkip && !negatedSpecSkip) return { event: "spec-skipped", decision };
    if (bareAffirmative || explicitSpecApproval) return { event: "spec-approved", decision };
  }
  if (decision === "execution-approval") {
    const goalMode = /(?:codex\s*goal|goal\s*mode|目标模式)/i;
    const goalNegated =
      /(?:不要|不用|不使用|别用|暂不|不选).{0,12}(?:codex\s*goal|goal\s*mode|目标模式)|(?:codex\s*goal|goal\s*mode|目标模式).{0,12}(?:不要|不用|不使用|别用|暂不|不选)/i.test(text);
    const traditionalMode = /(?:传统(?:方式|模式)?|正常执行|按计划执行|task-by-task)/i.test(text);
    const traditionalApproved =
      /(?:可以|同意|批准|确认|接受|开始|继续).{0,20}(?:按|用)?(?:传统(?:方式|模式)?|正常执行|按计划执行|task-by-task)|(?:传统(?:方式|模式)?|正常执行|按计划执行|task-by-task).{0,20}(?:执行|开始|批准|同意|可以)/i.test(text);
    const goalApproved =
      /(?:使用|选择|批准|同意|进入|启动|按).{0,16}(?:codex\s*goal|goal\s*mode|目标模式)|(?:codex\s*goal|goal\s*mode|目标模式).{0,16}(?:执行|开始|启动|批准|同意|可以)/i.test(text);
    if (traditionalMode && (traditionalApproved || goalNegated)) {
      return { event: "execution-approved-traditional", decision };
    }
    if (goalMode.test(text) && !goalNegated && goalApproved) {
      return { event: "execution-approved-goal", decision };
    }
  }
  if (decision === "verification-gap-acceptance" &&
      /(?:接受|同意|确认).*(?:缺口|gap)|(?:缺口|gap).*(?:接受|同意|确认)/i.test(text)) {
    return { event: "verification-gap-accepted", decision };
  }
  if (decision === "verification-failure-choice") {
    if (/(?:接受|同意).*(?:缺口|gap)|(?:缺口|gap).*(?:接受|同意)/i.test(text)) {
      return { event: "verification-gap-accepted", decision };
    }
  }
  if (decision === "user-choice" && /(?:恢复|继续|resume)/i.test(text)) {
    return { event: "resume", decision };
  }
  return null;
}

function discussionRequiredTarget(root, ctx, name) {
  const normalized = String(name || "").trim();
  const nested = /[\\/]/.test(normalized);
  const target = nested ? path.resolve(root, normalized) : path.resolve(ctx, normalized);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

function writeDiscussionMarker(root, ctx, input, patch) {
  const file = discussionStateFile(ctx);
  return withRuntimeLock(ctx, "discussion-state", () => {
    const previous = readJsonFile(file).value || {};
    const preservePreviousRequirements =
      previous.status === "dirty" &&
      previous.source &&
      patch.source &&
      previous.source !== patch.source;
    const requiredFiles = unique([
      ...(preservePreviousRequirements && Array.isArray(previous.required_files) ? previous.required_files : []),
      ...(patch.required_files || [])
    ]);
    const baselineHashes = {};
    for (const name of requiredFiles) {
      const target = discussionRequiredTarget(root, ctx, name);
      baselineHashes[name] = target && fs.existsSync(target)
        ? stableFingerprint(fs.readFileSync(target))
        : "missing";
    }
    const now = new Date().toISOString();
    const marker = {
      status: patch.status || "dirty",
      updated_at: now,
      source: patch.source,
      reason: patch.reason,
      phase: patch.phase,
      spec_status: patch.spec_status,
      decision_required: patch.decision_required,
      prompt_excerpt: patch.prompt_excerpt || previous.prompt_excerpt || undefined,
      tool_name: patch.tool_name || previous.tool_name || undefined,
      enforce_before_mutation: Boolean(
        patch.enforce_before_mutation ||
        (previous.status === "dirty" && previous.enforce_before_mutation)
      ),
      requires_scope_reopen: Boolean(
        patch.requires_scope_reopen ||
        (previous.status === "dirty" && previous.requires_scope_reopen)
      ),
      scope_reopened_at: patch.scope_reopened_at || previous.scope_reopened_at || undefined,
      cwd_relative: input?.cwd ? path.relative(root, path.resolve(input.cwd)).replace(/\\/g, "/") || "." : previous.cwd_relative || ".",
      required_files: requiredFiles,
      baseline_hashes: baselineHashes,
      next_action: [
        "Refresh the listed files with confirmed user decisions, current question, and externalized investigation findings.",
        "Do not store hidden chain-of-thought; write checked facts, rejected paths, current hypothesis, conclusion, and next verification step."
      ].join(" ")
    };
    writeTextAtomic(file, `${JSON.stringify(marker, null, 2)}\n`);
    return marker;
  });
}

function acknowledgeScopeReopen(ctx) {
  const file = discussionStateFile(ctx);
  return withRuntimeLock(ctx, "discussion-state", () => {
    const parsed = readJsonFile(file);
    if (!parsed.ok || !parsed.exists || !parsed.value?.requires_scope_reopen) return;
    writeTextAtomic(file, `${JSON.stringify({
      ...parsed.value,
      requires_scope_reopen: false,
      scope_reopened_at: new Date().toISOString()
    }, null, 2)}\n`);
  });
}

function toolOriginatedPrompt(input) {
  const tool = String(input?.tool_name || input?.toolName || input?.tool_use_id || input?.toolUseId || "").trim();
  const agent = String(input?.agent_id || input?.agentId || input?.parent_agent_id || input?.parentAgentId || "").trim();
  const source = String(input?.source || "").trim();
  return Boolean(tool || agent || /subagent|child-agent|delegated-agent/i.test(source));
}

export function userPromptSubmit(input, root, ctx) {
  if (toolOriginatedPrompt(input)) return;
  const prompt = extractPromptText(input);
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const messages = [];
  const sessionKey = hookSessionKey(input);
  const cue = classifyLearningCue(prompt);
  let executionDirectiveRecorded = false;
  if (promptRequestsPlanThenExecute(prompt)) {
    writeAdvanceDecisionReceipt(
      root,
      ctx,
      state,
      "execution-approval",
      ["execution-approved-traditional"]
    );
    messages.push("Codex Project Ops recorded plan-then-execute intent for Traditional task-by-task execution; it is bound to the target task and does not authorize Goal mode.");
  } else if (promptRetractsPlanThenExecute(prompt)) {
    removeAdvanceDecisionReceipt(ctx, "execution-approval", { required: true });
    messages.push("Codex Project Ops removed the earlier plan-then-execute intent.");
  }
  if (promptRequestsSpecSkip(prompt)) {
    writeAdvanceDecisionReceipt(
      root,
      ctx,
      state,
      "written-spec-approval",
      ["spec-skipped"]
    );
    messages.push("Codex Project Ops recorded explicit skip-brainstorming intent for spec-skipped; it is bound to the target task and does not approve execution.");
  } else if (promptRetractsSpecSkip(prompt)) {
    removeAdvanceDecisionReceipt(ctx, "written-spec-approval", { required: true });
    messages.push("Codex Project Ops removed the earlier skip-brainstorming intent.");
  }
  if (promptIsSubstantive(prompt) && DECISION_TRANSITIONS[state.decision_required]) {
    removeDecisionReceipt(ctx, sessionKey, { required: true });
  }
  const decision = userDecisionFromPrompt(prompt, state);

  if (decision) {
    writeDecisionReceipt(
      root,
      ctx,
      state,
      sessionKey,
      decision.decision,
      [decision.event],
      decisionEvidenceHash(root, ctx, state, decision.decision)
    );
    messages.push(`Codex Project Ops recorded user approval for ${decision.event}; the receipt is bound to this task, session, and current evidence.`);
  }

  if (promptIsSubstantive(prompt) && state.phase === "complete") {
    writeDiscussionMarker(root, ctx, input, {
      status: "pending-new-task",
      source: "UserPromptSubmit",
      reason: "first substantive prompt after a completed workflow",
      phase: state.phase,
      spec_status: state.spec_status,
      decision_required: state.decision_required,
      prompt_excerpt: sanitizeLearningExcerpt(prompt),
      required_files: [
        REQUIRED_FILES.current,
        REQUIRED_FILES.spec,
        REQUIRED_FILES.plan,
        REQUIRED_FILES.handoff
      ]
    });
    messages.push([
      "Codex Project Ops recorded a pending new task.",
      "Run workflow-state transition new-task before discovery or mutation so prior approvals and completion evidence cannot leak into the new task."
    ].join(" "));
  }

  if (promptIsSubstantive(prompt) &&
      !promptIsBareContinuation(prompt) &&
      !promptIsStatusInquiry(prompt) &&
      !promptIsProjectOpsOnly(prompt) &&
      !promptIsLearningOnly(prompt, cue) &&
      state.decision_required === "none" &&
      EXECUTION_DIRECTIVE_PHASES.has(state.phase)) {
    const scopeChange = promptChangesApprovedScope(prompt);
    const requiredFiles = executionDirectiveRefreshFiles(state, scopeChange);
    writeDiscussionMarker(root, ctx, input, {
      source: "UserPromptSubmit",
      reason: scopeChange
        ? "latest user prompt changes the approved scope or execution contract"
        : "latest user prompt changes execution guidance",
      phase: state.phase,
      spec_status: state.spec_status,
      decision_required: state.decision_required,
      prompt_excerpt: sanitizeLearningExcerpt(prompt),
      required_files: requiredFiles,
      enforce_before_mutation: scopeChange,
      requires_scope_reopen: scopeChange
    });
    executionDirectiveRecorded = true;
    messages.push(scopeChange
      ? "Codex Project Ops recorded an execution-time scope change. Reopen scope with workflow-state transition brainstorming-start, then refresh the listed state files before further project mutations."
      : `Codex Project Ops recorded updated execution guidance. Refresh the phase-relevant records before further project mutations: ${requiredFiles.join(", ")}.`);
  }

  if (promptIsSubstantive(prompt) &&
      !promptIsBareContinuation(prompt) &&
      !promptIsStatusInquiry(prompt) &&
      !promptIsProjectOpsOnly(prompt) &&
      !executionDirectiveRecorded &&
      discussionWorkflowActive(state)) {
    const requiredFiles = discussionRefreshFiles(root, ctx, state);
    writeDiscussionMarker(root, ctx, input, {
      source: "UserPromptSubmit",
      reason: "latest user prompt may change discussion/spec state",
      phase: state.phase,
      spec_status: state.spec_status,
      decision_required: state.decision_required,
      prompt_excerpt: sanitizeLearningExcerpt(prompt),
      required_files: requiredFiles
    });
    messages.push([
      "Codex Project Ops marked discussion state dirty.",
      `Before stopping or compacting, refresh the phase-relevant records: ${requiredFiles.join(", ")}.`
    ].join(" "));
  }

  if (cue) {
    const saved = appendLearningObservation(root, ctx, input, cue, prompt);
    if (saved) {
      messages.push([
        "Codex Project Ops captured a raw learning observation.",
        "Do not treat it as active memory yet.",
        "Before compaction or stopping, evaluate it with codex-learning-memory and refresh learned-instincts.md."
      ].join(" "));
    }
  }

  if (!messages.length) return;

  writeJson({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: messages.join("\n")
    }
  });
}

function toolName(input) {
  return String(input?.tool_name || input?.toolName || input?.tool || input?.name || input?.matcher || "").trim();
}

function normalizedToolName(input) {
  return toolName(input).toLowerCase();
}

function toolInputText(input) {
  const candidates = [
    input?.tool_input,
    input?.toolInput,
    input?.input,
    input?.arguments,
    input?.payload
  ];
  return candidates
    .map((candidate) => typeof candidate === "string" ? candidate : JSON.stringify(candidate || {}))
    .join(" ");
}

function shellCommandText(input) {
  const payload = input?.tool_input || input?.toolInput || input?.input || input?.arguments || input?.payload || {};
  return typeof payload === "string"
    ? payload.trim()
    : String(payload.command || payload.cmd || payload.script || "").trim();
}

function controlPlaneOperation(input, root) {
  const name = normalizedToolName(input);
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) return null;
  const command = shellCommandText(input);
  if (!command) return null;
  if (/\$\(|<\(|>\(/.test(command)) return null;

  const syntax = shellSyntax(command);
  if (syntax.redirections.length > 0) return null;
  if (syntax.segments.length > 1) {
    const operations = syntax.segments.map((segment) =>
      readOnlyShellSegment(segment) ? { kind: "read-only" } : singleControlPlaneOperation(segment, root));
    if (operations.some((operation) => !operation)) {
      return null;
    }
    const activeOperations = operations.filter((operation) => operation.kind !== "read-only");
    if (activeOperations.length === 0) return { kind: "read-only", compound: true };
    const forbidden = activeOperations.find((operation) => operation.kind === "forbidden");
    if (forbidden) return { ...forbidden, compound: true };
    if (activeOperations.length === 1) return { ...activeOperations[0], compound: true };
    if (activeOperations.every((operation) => operation.kind === "recovery")) {
      return { kind: "recovery", compound: true };
    }
    return { kind: "forbidden", command: "compound" };
  }

  return singleControlPlaneOperation(command, root);
}

function singleControlPlaneOperation(command, root) {
  if (!command || /[;&|`\r\n]/.test(command)) return null;

  const match = command.match(/^\s*node(?:\.exe)?\s+(?:"([^"]+)"|'([^']+)'|(\S+))(?:\s+(.*))?\s*$/i);
  if (!match) return null;
  const script = String(match[1] || match[2] || match[3] || "");
  const absoluteScript = path.isAbsolute(script) ? path.resolve(script) : path.resolve(root, script);
  const allowedScripts = new Set([
    path.resolve(root, ".codex", "hooks", "project-ops.mjs"),
    path.resolve(root, ".codex", "scripts", "context-recovery-eval.mjs"),
    path.resolve(root, ".codex", "scripts", "asset-governance.mjs"),
    path.resolve(root, ".codex", "scripts", "project-ops-health.mjs"),
    path.resolve(root, ".codex", "scripts", "workflow-state.mjs"),
    path.resolve(root, "scripts", "context-recovery-eval.mjs"),
    path.resolve(root, "scripts", "asset-governance.mjs"),
    path.resolve(root, "scripts", "project-ops-health.mjs"),
    path.resolve(root, "scripts", "workflow-state.mjs")
  ]);
  if (!allowedScripts.has(absoluteScript)) return null;
  const basename = path.basename(absoluteScript).toLowerCase();
  const args = String(match[4] || "").trim();

  if (basename === "project-ops.mjs") {
    if (/^context-recovery-eval(?:\s|$)/i.test(args)) return { kind: "recovery" };
    if (/^health-check(?:\s|$)/i.test(args)) return { kind: "read-only" };
    const assetGovernance = args.match(/^asset-governance(?:\s+(.*))?$/i);
    if (assetGovernance) return assetGovernanceOperation(String(assetGovernance[1] || ""));
    const workflow = args.match(/^workflow-state(?:\s+(.*))?$/i);
    if (!workflow) return null;
    return workflowStateOperation(String(workflow[1] || ""));
  }
  if (basename === "context-recovery-eval.mjs") return { kind: "recovery" };
  if (basename === "asset-governance.mjs") return assetGovernanceOperation(args);
  if (basename === "project-ops-health.mjs") return { kind: "read-only" };
  if (basename === "workflow-state.mjs") return workflowStateOperation(args);
  return null;
}

function assetGovernanceOperation(args) {
  const tokens = String(args || "").trim().split(/\s+/).filter(Boolean);
  return { kind: tokens.includes("--apply") ? "repair" : "read-only", command: "asset-governance" };
}

function workflowStateOperation(args) {
  const tokens = String(args || "").trim().split(/\s+/).filter(Boolean);
  const command = String(tokens[0] || "help").toLowerCase();
  if (["status", "get", "check", "next", "recover", "help", "--help", "-h"].includes(command)) {
    return { kind: "read-only", command };
  }
  if (command === "hash") {
    return { kind: tokens.includes("--write") ? "repair" : "read-only", command };
  }
  if (command === "transition") {
    return { kind: "transition", command, event: String(tokens[1] || "") };
  }
  if (["init", "migrate"].includes(command)) return { kind: "repair", command };
  return { kind: "forbidden", command };
}

function explicitToolTargets(input) {
  const payload = input?.tool_input || input?.toolInput || input?.input || input?.arguments || input?.payload || {};
  const targets = [];
  const patchTexts = [];

  if (typeof payload === "string") {
    patchTexts.push(payload);
  } else if (payload && typeof payload === "object") {
    for (const key of [
      "file_path",
      "filePath",
      "path",
      "target",
      "target_path",
      "targetPath",
      "destination",
      "destination_path",
      "destinationPath"
    ]) {
      if (typeof payload[key] === "string") targets.push(payload[key]);
    }
    for (const key of ["patch", "command", "input"]) {
      if (typeof payload[key] === "string" && payload[key].includes("***")) {
        patchTexts.push(payload[key]);
      }
    }
  }

  for (const text of patchTexts) {
    for (const match of text.matchAll(/^\*\*\*\s+(?:Add|Update|Delete|Move to)\s+File:\s*(.+?)\s*$/gmi)) {
      targets.push(match[1]);
    }
  }
  return unique(targets.map((target) => String(target).trim()).filter(Boolean));
}

function explicitToolWorkdir(input) {
  const direct = String(
    input?.workdir || input?.working_directory || input?.workingDirectory || ""
  ).trim();
  if (direct) return direct;
  const payload = input?.tool_input || input?.toolInput || input?.input || input?.arguments || input?.payload || {};
  if (!payload || typeof payload !== "object") return "";
  return String(payload.workdir || payload.cwd || payload.working_directory || payload.workingDirectory || "").trim();
}

function shellAbsolutePaths(command) {
  const paths = [];
  for (const match of String(command || "").matchAll(
    /(?:"([a-z]:[\\/][^"]+)"|'([a-z]:[\\/][^']+)'|([a-z]:[\\/][^\s;|]+))/gi
  )) {
    paths.push(match[1] || match[2] || match[3]);
  }
  return unique(paths);
}

function pathOutsideProject(target, root, base = root) {
  const cleaned = String(target || "").replace(/^["']|["']$/g, "");
  if (!cleaned) return false;
  const absolute = path.isAbsolute(cleaned) ? path.resolve(cleaned) : path.resolve(base, cleaned);
  const relative = path.relative(root, absolute).replace(/\\/g, "/");
  return Boolean(relative && (relative.startsWith("../") || path.isAbsolute(relative)));
}

function toolExplicitlyOutsideProject(input, root) {
  const name = normalizedToolName(input);
  const targets = explicitToolTargets(input);
  if (targets.length > 0 && targets.every((target) => pathOutsideProject(target, root))) {
    return true;
  }
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) return false;
  const commandText = shellCommandText(input);
  const absolutePaths = shellAbsolutePaths(commandText);
  if (absolutePaths.some((target) => !pathOutsideProject(target, root))) return false;
  const workdir = explicitToolWorkdir(input);
  if (!workdir || !pathOutsideProject(workdir, root)) return false;
  const command = commandText.replace(/\\/g, "/").toLowerCase();
  const normalizedRoot = path.resolve(root).replace(/\\/g, "/").toLowerCase();
  if (command.includes(normalizedRoot)) return false;
  const mutation = shellFileMutation(input);
  if (mutation.mutates) {
    if (mutation.opaque || mutation.targets.length === 0) return false;
    return mutation.targets.every((target) => pathOutsideProject(target, root, workdir));
  }
  if (["read-only", "verification"].includes(shellCommandClass(input))) return true;
  const externalControl = controlPlaneOperation(input, path.resolve(workdir));
  return Boolean(externalControl && externalControl.kind !== "forbidden");
}

function shellPathArguments(segment) {
  const targets = [];
  for (const match of String(segment || "").matchAll(
    /-(?:LiteralPath|Path|FilePath|Destination|DestinationPath|Target|TargetPath)\s+(?:"([^"]+)"|'([^']+)'|([^\s;|]+))/gi
  )) {
    targets.push(match[1] || match[2] || match[3]);
  }
  const positional = String(segment || "").match(
    /^\s*(?:set-content|add-content|clear-content|out-file|remove-item|move-item|copy-item|rename-item|new-item|sc|ac|clc|ni|ri|mi|cpi|rni|rm|mv|cp|touch|mkdir|rmdir|tee|truncate)\s+(?:"([^"]+)"|'([^']+)'|([^\s;|]+))/i
  );
  if (positional) targets.push(positional[1] || positional[2] || positional[3]);
  for (const match of String(segment || "").matchAll(/\bgit\s+(?:restore|switch)\s+(?:"([^"]+)"|'([^']+)'|([^\s;|]+))/gi)) {
    const target = match[1] || match[2] || match[3];
    if (target && !target.startsWith("-")) targets.push(target);
  }
  for (const match of String(segment || "").matchAll(/\bgit\s+checkout\s+(?:--\s+)?(?:"([^"]+)"|'([^']+)'|([^\s;|]+))/gi)) {
    const target = match[1] || match[2] || match[3];
    if (target && !target.startsWith("-")) targets.push(target);
  }
  return targets;
}

function mutatingShellSegment(segment) {
  const text = String(segment || "");
  return /^(?:set-content|add-content|clear-content|out-file|remove-item|move-item|copy-item|rename-item|new-item|sc|ac|clc|ni|ri|mi|cpi|rni)\b/i.test(text) ||
    /^\[System\.IO\.(?:File|Directory)\]::(?:WriteAllText|WriteAllBytes|AppendAllText|Create|Delete|Move|Copy|CreateDirectory|Delete)\b/i.test(text) ||
    /^(?:rm|mv|cp|touch|mkdir|rmdir|tee|truncate)\b/i.test(text) ||
    /^sed\s+-i\b/i.test(text) ||
    /^git\s+(?:apply|restore|checkout|switch)\b/i.test(text) ||
    /^node(?:\.exe)?\s+(?:--eval|-e)\b[\s\S]*\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|copyFile(?:Sync)?|rename(?:Sync)?|unlink(?:Sync)?|rmSync|mkdirSync|rmdirSync)\s*\(/i.test(text) ||
    /^python(?:\.exe)?\s+-c\b[\s\S]*(?:\bopen\s*\([^)]*["'][wa+]|write_(?:text|bytes)\s*\(|unlink\s*\(|rename\s*\(|mkdir\s*\(|rmdir\s*\(|shutil\.(?:copy|copyfile|copytree|move|rmtree))/i.test(text);
}

function shellFileMutation(input) {
  const name = normalizedToolName(input);
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) {
    return { mutates: false, targets: [], opaque: false };
  }
  const command = shellCommandText(input);
  const syntax = shellSyntax(command);
  const mutatingSegments = syntax.segments.filter((segment) => mutatingShellSegment(segment));
  if (mutatingSegments.length === 0 && syntax.redirections.length === 0) {
    return { mutates: false, targets: [], opaque: false };
  }

  const targets = [];
  for (const segment of mutatingSegments) targets.push(...shellPathArguments(segment));
  targets.push(...syntax.redirections);
  return {
    mutates: true,
    targets: unique(targets.map((target) => String(target || "").trim()).filter(Boolean)),
    opaque: targets.length === 0
  };
}

function projectRelativeTarget(target, root) {
  const cleaned = String(target || "").replace(/^["']|["']$/g, "");
  const absolute = path.isAbsolute(cleaned) ? path.resolve(cleaned) : path.resolve(root, cleaned);
  const relative = path.relative(root, absolute).replace(/\\/g, "/");
  if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) return "";
  return relative;
}

function governanceArtifactPath(relative) {
  const normalized = String(relative || "").toLowerCase();
  if (normalized === ".codex-context/raw" ||
      normalized.startsWith(".codex-context/raw/")) {
    return false;
  }
  return normalized.startsWith(".codex-context/") ||
    normalized === "strategy.md" ||
    normalized.startsWith("docs/codex/plans/") ||
    normalized.startsWith("docs/codex/specs/") ||
    normalized.startsWith("docs/codex/wayfinder/");
}

function indexedActiveWayfinderOnlyChange(root, ctx, state, files) {
  if (state?.phase !== "wayfinding") return false;
  const changed = unique(files)
    .filter((file) => !isGovernancePath(file))
    .map((file) => String(file).replace(/\\/g, "/"));
  if (changed.length !== 1) return false;

  const wayfinder = activeWayfinderStatus(root, ctx);
  if (!wayfinder.active || !wayfinder.reference) return false;
  const reference = String(wayfinder.reference).replace(/\\/g, "/");
  if (changed[0].toLowerCase() !== reference.toLowerCase()) return false;

  const artifactIndex = readText(path.join(ctx, REQUIRED_FILES.artifacts))
    .replace(/\\/g, "/")
    .toLowerCase();
  return artifactIndex.includes(reference.toLowerCase());
}

function governanceRepairMutation(input, root) {
  const name = normalizedToolName(input);
  if (/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) {
    const shellMutation = shellFileMutation(input);
    return shellMutation.mutates &&
      !shellMutation.opaque &&
      shellMutation.targets.length > 0 &&
      shellMutation.targets.every((target) => governanceArtifactPath(projectRelativeTarget(target, root)));
  }
  if (!/apply_patch/.test(name) && !explicitWriteToolName(name)) {
    return false;
  }
  const targets = explicitToolTargets(input);
  if (targets.length === 0) return false;
  return targets.every((target) => governanceArtifactPath(projectRelativeTarget(target, root)));
}

function protectedWorkflowStateMutation(input, root) {
  const targets = explicitToolTargets(input);
  if (targets.some((target) => {
    const cleaned = target.replace(/^["']|["']$/g, "");
    const absolute = path.isAbsolute(cleaned) ? path.resolve(cleaned) : path.resolve(root, cleaned);
    return path.relative(root, absolute).replace(/\\/g, "/") === ".codex-context/workflow-state.yaml";
  })) {
    return true;
  }
  const name = normalizedToolName(input);
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) return false;
  const shellMutation = shellFileMutation(input);
  if (shellMutation.targets.some((target) => {
    const relative = projectRelativeTarget(target, root);
    return relative === ".codex-context/workflow-state.yaml";
  })) {
    return true;
  }
  if (!shellMutation.opaque) return false;
  return shellSyntax(shellCommandText(input)).segments
    .filter((segment) => mutatingShellSegment(segment))
    .some((segment) =>
      /(?:^|[\s"'`(])\.codex-context[\\/]workflow-state\.yaml(?:[\s"',)`]|$)/i.test(segment));
}

function shellSyntax(command) {
  const text = String(command || "");
  const segments = [];
  const redirections = [];
  let start = 0;
  let quote = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if ((char === "\\" || char === "`") && quote === '"') {
        index += 1;
      } else if (char === quote) {
        if (quote === "'" && text[index + 1] === "'") index += 1;
        else quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") {
      const tail = text.slice(index + (text[index + 1] === ">" ? 2 : 1));
      const target = tail.match(/^\s*(?:"([^"]+)"|'([^']+)'|([^\s;|]+))/);
      if (target) {
        const destination = target[1] || target[2] || target[3];
        if (!/^(?:\$null|nul|\/dev\/null|&[012])$/i.test(destination)) {
          redirections.push(destination);
        }
      }
      continue;
    }
    const paired = (char === "&" && text[index + 1] === "&") ||
      (char === "|" && text[index + 1] === "|");
    if (char === ";" || char === "|" || char === "\r" || char === "\n" || paired) {
      segments.push(text.slice(start, index).trim());
      if (paired) index += 1;
      start = index + 1;
    }
  }
  segments.push(text.slice(start).trim());
  return {
    segments: segments.filter(Boolean),
    redirections: unique(redirections.filter(Boolean))
  };
}

function shellSegments(command) {
  return shellSyntax(command).segments;
}

function readOnlyShellSegment(segment) {
  if (/\$\(|<\(|>\(|[{}]|(?:^|\s)&(?:\s|$)/.test(segment)) return false;
  if (/^git\s+remote\s*$/i.test(segment) ||
      /^git\s+remote\s+(?:-v|--verbose|show|get-url)(?:\s|$)/i.test(segment)) {
    return true;
  }
  return /^(?:git\s+(?:status|diff|log|show|rev-parse|ls-files)|git\s+branch\s+(?:--show-current|--list|-l)|git\s+worktree\s+list|rg|grep|findstr|select-string|get-content|get-childitem|get-filehash|select-object|sort-object|measure-object|format-table|format-list|out-string|cat|type|ls|dir|tree|head|tail|wc)(?:\s|$)/i.test(segment);
}

function verificationShellSegment(segment) {
  return /^(?:node(?:\.exe)?\s+(?:--test|--check|(?:\.?[\\/])?scripts[\\/](?:run-domain-tests|release-check)\.mjs)|npm(?:\.cmd)?\s+(?:test|run\s+(?:test|lint|typecheck|check|build|format:check|format-check))|npx(?:\.cmd)?\s+(?:eslint|tsc|prettier\s+--check)|pnpm\s+(?:test|lint|typecheck|check|build)|yarn\s+(?:test|lint|typecheck|check|build)|pytest|python(?:\.exe)?\s+-m\s+pytest|go\s+test|cargo\s+(?:test|check|clippy|build)|dotnet\s+(?:test|build)|mvn\s+(?:test|verify)|gradle\s+(?:test|check|build)|\.\/gradlew\s+(?:test|check|build))(?:\s|$)/i.test(segment);
}

function shellCommandClass(input) {
  const command = shellCommandText(input);
  if (!command || shellFileMutation(input).mutates) return "";
  const segments = shellSegments(command);
  if (!segments.length) return "";
  if (segments.every((segment) => readOnlyShellSegment(segment))) return "read-only";
  if (segments.every((segment) => readOnlyShellSegment(segment) || verificationShellSegment(segment)) &&
      segments.some((segment) => verificationShellSegment(segment))) {
    return "verification";
  }
  return "";
}

function mutationToolUseId(input) {
  return String(input?.tool_use_id || input?.toolUseId || "").trim();
}

function explicitWriteToolName(name) {
  return /(^|[._:])(?:add|append|apply|clear|commit|copy|create|dispatch|edit|insert|install|invoke|merge|move|patch|publish|push|rename|replace|save|send|set|submit|trigger|update|upload|upsert|write)(?:$|[._:])/i.test(name) ||
    /(^|[._:])(?:add|append|copy|create|edit|move|patch|rename|replace|save|update|upload|write)(?:file|files|document|documents|path|paths|record|records|resource|resources)(?:$|[._:])/i.test(name);
}

function explicitDestructiveToolName(name) {
  return /(^|[._:])(?:delete|remove|reset|drop|truncate|destroy|purge|prune)(?:$|[._:])/i.test(name) ||
    /(^|[._:])(?:delete|remove|truncate|destroy|purge)(?:file|files|document|documents|path|paths|record|records|resource|resources)(?:$|[._:])/i.test(name);
}

function mutationIntentReceiptName(input) {
  const sessionKey = hookSessionKey(input);
  const toolUseId = mutationToolUseId(input);
  const scope = toolUseId ? `${sessionKey}\u0000${toolUseId}` : sessionKey;
  return scopedRuntimeReceiptName("mutation-intent", scope);
}

function writeMutationIntent(root, ctx, input, state, controlClass, head) {
  const toolUseId = mutationToolUseId(input);
  const status = gitStatusResult(root);
  const preStatusFiles = status.ok ? status.files : [];
  return writeRuntimeReceipt(ctx, mutationIntentReceiptName(input), {
    schema: "dong-skills.mutation-intent.v1",
    task_id: state.task_id || "missing",
    task_generation: String(state.task_generation || "missing"),
    tool_use_id_hash: toolUseId ? stableFingerprint(toolUseId) : "",
    control_class: controlClass,
    pre_head: head || "",
    pre_status_files: preStatusFiles,
    pre_project_fingerprint: projectChangeFingerprint(
      root,
      preStatusFiles.filter((file) => !isGovernancePath(file))
    ),
    baseline_hashes: refreshFileHashes(ctx),
    created_at: new Date().toISOString()
  });
}

function mutationIntentStatus(root, ctx, input, state) {
  const receipt = readRuntimeReceipt(ctx, mutationIntentReceiptName(input));
  if (!receipt.ok) {
    return { ok: false, exists: true, files: [], issue: `mutation intent is invalid: ${receipt.error}`, value: null };
  }
  if (!receipt.exists) {
    return { ok: true, exists: false, files: [], issue: "", value: null };
  }

  const value = receipt.value || {};
  if (value.task_id !== state.task_id ||
      String(value.task_generation) !== String(state.task_generation)) {
    return {
      ok: false,
      exists: true,
      files: [],
      issue: "mutation intent belongs to a different workflow task",
      value
    };
  }
  const toolUseId = mutationToolUseId(input);
  if (value.tool_use_id_hash && toolUseId &&
      value.tool_use_id_hash !== stableFingerprint(toolUseId)) {
    return {
      ok: false,
      exists: true,
      files: [],
      issue: "mutation intent does not match the current tool invocation",
      value
    };
  }

  const head = gitHeadResult(root);
  if (!head.ok) {
    return {
      ok: false,
      exists: true,
      files: [],
      issue: `Git HEAD unavailable after mutation: ${head.error || "unknown error"}`,
      value
    };
  }
  const diff = gitDiffFilesResult(root, value.pre_head || "", head.head || "");
  if (!diff.ok) {
    return {
      ok: false,
      exists: true,
      files: [],
      issue: `Committed mutation diff unavailable: ${diff.error || "unknown error"}`,
      value
    };
  }
  return { ok: true, exists: true, files: diff.files, issue: "", value };
}

function removeMutationIntent(ctx, input) {
  removeRuntimeReceipt(ctx, mutationIntentReceiptName(input));
}

function toolExecutionStatus(input) {
  const response = input?.tool_response || input?.toolResponse || input?.tool_result || input?.toolResult;
  if (!response || typeof response !== "object") return { known: false, ok: false };
  const status = String(response.status || response.state || "").toLowerCase();
  const exitCode = response.exit_code ?? response.exitCode ?? response.code;
  const successStatus = ["ok", "success", "succeeded", "complete", "completed"].includes(status);
  const failureStatus = ["error", "failed", "failure"].includes(status);
  const known = response.is_error !== undefined || response.isError !== undefined ||
    response.ok !== undefined || response.success !== undefined || successStatus || failureStatus || exitCode !== undefined;
  if (!known) return { known: false, ok: false };
  const failed = response.is_error === true ||
    response.isError === true ||
    response.ok === false ||
    response.success === false ||
    failureStatus ||
    (exitCode !== undefined && Number(exitCode) !== 0);
  return { known: true, ok: !failed };
}

function toolControlClass(input, root = "") {
  const name = normalizedToolName(input);
  if (!name) return "unknown";
  const controlPlane = root ? controlPlaneOperation(input, root) : null;
  if (controlPlane?.kind === "transition") return "workflow-transition";
  if (controlPlane?.kind === "forbidden") return "workflow-admin";
  if (controlPlane) return "control-plane";

  if (/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) {
    const command = shellCommandText(input);
    if (/\$\(\s*(?:rm|remove-item|ri|del|rmdir|drop|truncate)\b/i.test(command)) {
      return "destructive";
    }
    if (shellSegments(command).some((segment) =>
      /^(?:rm|remove-item|ri|del|rmdir|drop|truncate)\b|^git\s+(?:reset|clean)\b/i.test(segment))) {
      return "destructive";
    }
    const shellClass = shellCommandClass(input);
    if (shellClass) return shellClass;
    if (shellFileMutation(input).mutates ||
        /\bgit\s+(?:add|commit|merge|rebase|cherry-pick|push|pull|fetch|tag|stash|switch|checkout|restore|apply)\b/i.test(command) ||
        /\bgit\s+worktree\s+(?:add|remove|move|prune|lock|unlock)\b/i.test(command) ||
        /\bgit\s+branch\s+(?:-[dDmM]|--delete|--move|--copy|--edit-description)\b/i.test(command) ||
        /\b(?:npm|pnpm|yarn)\s+(?:install|add|remove|publish)\b/i.test(command)) {
      return "mutating";
    }
    return "opaque";
  }

  if (explicitDestructiveToolName(name)) {
    return "destructive";
  }
  if (/apply_patch/.test(name) || explicitWriteToolName(name)) {
    return "mutating";
  }
  if (/^(?:mcp__|ext__)/.test(name) &&
      /(^|__|_)(?:execute|restart|run|start|stop)(?:_|$)/.test(name)) {
    return "mutating";
  }
  if (/(^|[._:])(?:describe|fetch|find|get|glob|grep|inspect|list|lookup|open|query|read|resolve|search|show|status|view)(?:$|[._:])/.test(name)) {
    return "read-only";
  }
  if (/^(?:mcp__|ext__)/.test(name)) return "external";
  return "unknown";
}

function denyPreToolUse(reason) {
  writeJson({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  });
}

export function preToolUse(input, root, ctx) {
  if (toolExplicitlyOutsideProject(input, root)) return;
  const controlClass = toolControlClass(input, root);
  if (["mutating", "destructive", "opaque"].includes(controlClass) &&
      protectedWorkflowStateMutation(input, root)) {
    denyPreToolUse("Direct edits to .codex-context/workflow-state.yaml are not allowed. Use a validated workflow-state transition.");
    return;
  }
  if (controlClass === "workflow-admin") {
    denyPreToolUse("Arbitrary workflow-state mutation is not allowed. Use a validated workflow-state transition.");
    return;
  }
  if (controlClass === "control-plane") return;
  if (controlClass === "workflow-transition") {
    const workflow = workflowStatus(root, ctx);
    const state = workflow.state || {};
    const operation = controlPlaneOperation(input, root);
    if (!workflow.ok) {
      denyPreToolUse(`Workflow state is not valid: ${workflow.issues.join("; ")}`);
      return;
    }
    if (operation?.event === "new-task") {
      if (state.phase === "complete") return;
      denyPreToolUse("workflow-state transition new-task is allowed only after the previous workflow is complete.");
      return;
    }
    const sessionKey = hookSessionKey(input);
    const recovery = recoveryReceiptStatus(root, ctx, state, sessionKey);
    if (!recovery.ok) {
      denyPreToolUse(`Context recovery gate: ${recovery.reason}. Run context-recovery-eval before changing workflow state.`);
      return;
    }
    if (state.decision_required && state.decision_required !== "none") {
      const allowed = new Set(DECISION_TRANSITIONS[state.decision_required] || []);
      if (!allowed?.has(operation?.event)) {
        denyPreToolUse(`A user decision is still required: ${state.decision_required}. Use only its validated resolution transition.`);
        return;
      }
      let receipt = decisionReceiptStatus(
        root,
        ctx,
        state,
        sessionKey,
        state.decision_required,
        operation?.event,
        decisionEvidenceHash(root, ctx, state, state.decision_required)
      );
      if (!receipt.ok &&
          state.decision_required === "execution-approval" &&
          operation?.event === "execution-approved-traditional" &&
          planThenExecuteRecorded(ctx)) {
        receipt = advanceDecisionReceiptStatus(
          root,
          ctx,
          state,
          state.decision_required,
          operation.event
        );
      }
      if (!receipt.ok &&
          state.decision_required === "written-spec-approval" &&
          operation?.event === "spec-skipped") {
        receipt = advanceDecisionReceiptStatus(
          root,
          ctx,
          state,
          state.decision_required,
          operation.event
        );
      }
      if (!receipt.ok) {
        denyPreToolUse(`A matching user decision receipt is required: ${receipt.reason}.`);
        return;
      }
    } else if (RECEIPT_REQUIRED_EVENTS.has(operation?.event)) {
      if (operation?.event === "spec-skipped") {
        const receipt = advanceDecisionReceiptStatus(
          root,
          ctx,
          state,
          "written-spec-approval",
          operation.event
        );
        if (receipt.ok) return;
        denyPreToolUse(`Transition ${operation.event} requires explicit skip-brainstorming intent: ${receipt.reason}.`);
        return;
      }
      denyPreToolUse(`Transition ${operation.event} requires a pending user decision and matching user decision receipt.`);
      return;
    }
    return;
  }
  if (controlClass === "verification") {
    if (!mutationToolUseId(input)) {
      denyPreToolUse("Verification shell tracking requires tool_use_id; the hook payload is incomplete.");
      return;
    }
    const state = workflowStateFor(root, ctx);
    const head = gitHeadResult(root);
    if (head.ok) writeMutationIntent(root, ctx, input, state, controlClass, head.head);
    return;
  }
  if (["external", "unknown"].includes(controlClass)) {
    const toolUseId = mutationToolUseId(input);
    const state = workflowStateFor(root, ctx);
    const head = gitHeadResult(root);
    if (toolUseId && head.ok) writeMutationIntent(root, ctx, input, state, controlClass, head.head);
    return;
  }
  if (!["mutating", "destructive", "opaque"].includes(controlClass)) return;
  if (!mutationToolUseId(input)) {
    denyPreToolUse("Project mutation tracking requires tool_use_id; the hook payload is incomplete.");
    return;
  }
  if (governanceRepairMutation(input, root)) {
    const repairState = workflowStateFor(root, ctx);
    const repairHead = gitHeadResult(root);
    writeMutationIntent(root, ctx, input, repairState, controlClass, repairHead.ok ? repairHead.head : "");
    return;
  }

  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  if (!workflow.ok) {
    denyPreToolUse(`Workflow state is not valid: ${workflow.issues.join("; ")}`);
    return;
  }
  if (state.phase === "complete") {
    denyPreToolUse("The previous workflow is complete. Start a new task before modifying the project.");
    return;
  }
  if (state.decision_required && state.decision_required !== "none") {
    denyPreToolUse(`A user decision is still required: ${state.decision_required}.`);
    return;
  }
  const recovery = recoveryReceiptStatus(root, ctx, state, hookSessionKey(input));
  if (!recovery.ok) {
    denyPreToolUse(`Context recovery gate: ${recovery.reason}. Run context-recovery-eval and resolve every failed probe before modifying the project.`);
    return;
  }
  const discussion = discussionStateStatus(root, ctx, workflow);
  if (discussion.marker?.enforce_before_mutation) {
    if (discussion.marker.requires_scope_reopen &&
        ["execution", "debugging", "verification", "review", "delivery", "handoff"].includes(state.phase)) {
      denyPreToolUse("The latest user directive changes approved scope. Run workflow-state transition brainstorming-start before further project mutations.");
      return;
    }
    if (!discussion.ok) {
      denyPreToolUse(`The latest user directive is not externalized yet: ${discussion.issues.join("; ")}.`);
      return;
    }
  }
  if (["discovery", "wayfinding", "brainstorming", "spec", "planning"].includes(state.phase)) {
    const laneLabel = `Lane ${String(state.work_lane || "lane-1").slice(-1)}`;
    denyPreToolUse(`${laneLabel} project modifications require the execution phase and explicit execution approval.`);
    return;
  }
  if (["execution", "debugging", "verification", "review", "delivery", "handoff"].includes(state.phase) &&
      !["approved", "skipped", "mechanical-exception"].includes(state.spec_status)) {
    denyPreToolUse(`The ${state.phase} phase requires approved scope before modification.`);
    return;
  }
  if (["execution", "debugging", "verification", "review", "delivery", "handoff"].includes(state.phase) &&
      !["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(state.execution_approval)) {
    denyPreToolUse(`The ${state.phase} phase requires explicit execution approval before modification.`);
    return;
  }
  if (state.work_lane === "lane-3" &&
      !["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(state.execution_approval)) {
    denyPreToolUse("Lane 3 modifications require explicit execution approval.");
    return;
  }

  const status = gitStatusResult(root);
  if (!status.ok) {
    denyPreToolUse(`Git status is unavailable before mutation: ${status.error || "unknown error"}.`);
    return;
  }
  const head = gitHeadResult(root);
  if (!head.ok) {
    denyPreToolUse(`Git HEAD is unavailable before mutation: ${head.error || "unknown error"}.`);
    return;
  }
  writeMutationIntent(root, ctx, input, state, controlClass, head.head);
}

function subagentReceiptName(agentId) {
  return `subagent-${stableFingerprint(String(agentId || "unknown")).slice(0, 16)}`;
}

function subagentSummaryIssues(summary) {
  if (summary.length < 20) {
    return ["subagent must return a concise result summary with evidence or findings, risks or open gaps, and a parent next action"];
  }

  const contracts = [
    {
      label: "Evidence or findings",
      pattern: /(?:^|\n)[^\r\n]*(?:evidence|证据|验证结果|findings|发现|inspected|reviewed|verified|reproduced|found|confirmed|checked|读取|检查|验证|复现|确认)[^\r\n]{4,}/im
    },
    {
      label: "Risks or open gaps",
      pattern: /(?:^|\n)[^\r\n]*(?:risks?|风险|未解决问题|remaining risks?|open gaps?|gaps?|limitations?|限制|缺口|no unresolved|none found|no blocking|remaining risk|risk remains|未发现|无阻塞|仍有风险)[^\r\n]{4,}/im
    },
    {
      label: "Parent next action",
      pattern: /(?:^|\n)[^\r\n]*(?:next action|next step|下一步|建议|recommended action|parent should|父任务|主任务|recommend|should)[^\r\n]{4,}/im
    }
  ];
  const missing = contracts
    .filter((contract) => !contract.pattern.test(summary))
    .map((contract) => contract.label);
  return missing.length
    ? [`subagent result summary must include usable ${missing.join(", ")}; fixed headings are recommended but not required`]
    : [];
}

export function subagentStart(input, root, ctx) {
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const agentId = String(input?.agent_id || input?.agentId || "unknown");
  writeRuntimeReceipt(ctx, subagentReceiptName(agentId), {
    schema: "dong-skills.subagent-lifecycle.v1",
    agent_id_hash: stableFingerprint(agentId),
    agent_type: String(input?.agent_type || input?.agentType || "unknown"),
    task_id: state.task_id || "missing",
    task_generation: String(state.task_generation || "missing"),
    phase: state.phase || "missing",
    work_lane: state.work_lane || "lane-1",
    started_at: new Date().toISOString()
  });

  writeJson({
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: [
        `Parent task_id=${state.task_id || "missing"} generation=${state.task_generation || "missing"}.`,
        `Parent phase=${state.phase || "missing"} work_lane=${state.work_lane || "lane-1"}.`,
        "Stay within the delegated investigation or review scope.",
        "Do not advance the parent workflow phase, approve decisions, edit parent state files, or claim parent completion.",
        "This hook validates lifecycle identity and result-summary quality; it does not enforce file-level delegated scope.",
        "Return a concise result summary that includes evidence or findings, risks or open gaps, and a parent next action. Fixed headings are recommended but not required."
      ].join("\n")
    }
  });
}

export function subagentStop(input, root, ctx) {
  const agentId = String(input?.agent_id || input?.agentId || "unknown");
  const name = subagentReceiptName(agentId);
  const start = readRuntimeReceipt(ctx, name);
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const summary = String(input?.last_assistant_message || input?.lastAssistantMessage || "").trim();
  const issues = [];

  if (!start.ok || !start.exists) {
    issues.push("subagent start scope receipt is missing or invalid");
  } else {
    const scope = start.value || {};
    if (scope.task_id !== state.task_id ||
        String(scope.task_generation) !== String(state.task_generation)) {
      issues.push("subagent result no longer matches the parent task identity");
    }
    if (scope.phase !== state.phase) {
      issues.push(`parent workflow phase changed from ${scope.phase} to ${state.phase}`);
    }
  }
  issues.push(...subagentSummaryIssues(summary));

  writeRuntimeReceipt(ctx, `${name}-result`, {
    schema: "dong-skills.subagent-result.v1",
    agent_id_hash: stableFingerprint(agentId),
    task_id: state.task_id || "missing",
    task_generation: String(state.task_generation || "missing"),
    phase: state.phase || "missing",
    summary_hash: stableFingerprint(summary),
    summary_length: summary.length,
    issues,
    usable_as_completion_evidence: issues.length === 0,
    completed_at: new Date().toISOString()
  });
  allowStop(issues.length
    ? `Subagent result quality warning: ${issues.join("; ")}. Do not use it as completion or verification evidence without independent parent review.`
    : "Subagent result is usable after parent review. Externalize only accepted evidence, risks, and next action when they materially affect project state.");
}

function fileContentHash(file) {
  try {
    return stableFingerprint(fs.readFileSync(file).toString("base64"));
  } catch {
    return "missing";
  }
}

function projectChangeFingerprint(root, files) {
  return stableFingerprint(files
    .map((file) => ({
      file: String(file).replace(/\\/g, "/"),
      hash: fileContentHash(path.join(root, file))
    }))
    .sort((a, b) => a.file.localeCompare(b.file)));
}

function changeReceiptStatus(root, ctx, files, state) {
  const receipt = readRuntimeReceipt(ctx, "change-state");
  if (!receipt.ok) {
    return {
      active: false,
      exists: true,
      issue: `change-state receipt is invalid: ${receipt.error}`,
      value: null
    };
  }
  if (!receipt.exists) {
    return { active: false, exists: false, issue: "", value: null };
  }
  if (receipt.value?.task_id !== state.task_id ||
      String(receipt.value?.task_generation) !== String(state.task_generation)) {
    return {
      active: false,
      exists: true,
      issue: "change-state receipt belongs to a different workflow task",
      value: receipt.value
    };
  }
  const fingerprint = projectChangeFingerprint(root, files);
  if (receipt.value?.project_fingerprint !== fingerprint) {
    return {
      active: false,
      exists: true,
      issue: "change-state receipt does not match the current project changes",
      value: receipt.value
    };
  }
  return { active: true, exists: true, issue: "", value: receipt.value };
}

function receiptHasRefresh(receipt, ctx, name) {
  if (!receipt) return false;
  const current = fileContentHash(path.join(ctx, name));
  return receipt.refreshed_hashes?.[name] === current;
}

function refreshFileHashes(ctx) {
  return Object.fromEntries(
    CHANGE_REFRESH_FILES.map((name) => [name, fileContentHash(path.join(ctx, name))])
  );
}

function writeArtifactReminder(root, ctx, changed, latest) {
  const reason = [
    "Codex Project Ops: non-context files changed, but .codex-context/artifact-index.md is not fresh.",
    hookStatusText(root, ctx, latest, changed, { assets: false, checkpoint: false, eventName: "PostToolUse" }),
    `Changed files: ${shortList(changed)}.`,
    "Update artifact-index.md with created/modified/read files and why they matter before continuing.",
    "Also update current-state.md if phase, assumption, or next action changed."
  ].join("\n");

  writeJson({
    systemMessage: reason,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: reason
    }
  });
}

export function postToolUse(input, root, ctx) {
  if (toolExplicitlyOutsideProject(input, root)) return;
  const controlClass = toolControlClass(input, root);
  const operation = controlPlaneOperation(input, root);

  if (controlClass === "workflow-transition") {
    if (toolExecutionStatus(input).ok && RECEIPT_REQUIRED_EVENTS.has(operation?.event)) {
      removeDecisionReceipt(ctx, hookSessionKey(input));
    }
    if (toolExecutionStatus(input).ok &&
        ["execution-approved-traditional", "execution-approved-goal", "spec-skipped"].includes(operation?.event)) {
      removeAdvanceDecisionReceipt(
        ctx,
        operation?.event === "spec-skipped" ? "written-spec-approval" : "execution-approval"
      );
    }
    if (toolExecutionStatus(input).ok &&
        ["brainstorming-start", "spec-living"].includes(operation?.event)) {
      acknowledgeScopeReopen(ctx);
    }
    return;
  }

  if (controlClass === "control-plane") {
    if (operation?.kind === "recovery" && toolExecutionStatus(input).ok) {
      const evaluation = evaluateRecovery(root, ctx);
      const workflow = workflowStatus(root, ctx);
      if (evaluation.ok && workflow.ok) {
        writeRecoveryReceipt(root, ctx, workflow.state, hookSessionKey(input));
      }
    }
    return;
  }
  if (controlClass === "read-only") {
    return;
  }

  if (["external", "unknown"].includes(controlClass) && !mutationToolUseId(input)) {
    return;
  }

  const state = workflowStateFor(root, ctx);
  const intent = ["mutating", "destructive", "opaque", "verification", "external", "unknown"].includes(controlClass)
    ? mutationIntentStatus(root, ctx, input, state)
    : { ok: true, exists: false, files: [], issue: "", value: null };
  const statusResult = gitStatusResult(root);
  if (!statusResult.ok) {
    if (["mutating", "destructive", "opaque", "verification", "external", "unknown"].includes(controlClass)) {
      const reason = `Codex Project Ops could not inspect project changes after a mutation. Git status unavailable: ${statusResult.error || "unknown error"}.`;
      writeJson({
        systemMessage: reason,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: reason
        }
      });
    }
    return;
  }

  if (!intent.ok) {
    const reason = `Codex Project Ops could not validate the mutation intent: ${intent.issue}.`;
    writeJson({
      systemMessage: reason,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: reason
      }
    });
    return;
  }
  const beforeFiles = Array.isArray(intent.value?.pre_status_files) ? intent.value.pre_status_files : [];
  const beforeProjectFiles = beforeFiles.filter((file) => !isGovernancePath(file));
  const afterProjectFiles = statusResult.files.filter((file) => !isGovernancePath(file));
  const statusUnchanged = JSON.stringify([...beforeProjectFiles].sort()) === JSON.stringify([...afterProjectFiles].sort());
  const fingerprintUnchanged = intent.value?.pre_project_fingerprint ===
    projectChangeFingerprint(root, afterProjectFiles);
  const invocationChanged = intent.files.some((file) => !isGovernancePath(file)) ||
    !statusUnchanged ||
    !fingerprintUnchanged;
  if (controlClass === "verification" && !invocationChanged) {
    removeMutationIntent(ctx, input);
    return;
  }
  if (["external", "unknown"].includes(controlClass)) {
    if (!intent.exists) {
      return;
    }
    if (!invocationChanged) {
      removeMutationIntent(ctx, input);
      return;
    }
  }

  const pendingChange = readRuntimeReceipt(ctx, "change-state");
  const pendingChangeValue = pendingChange.ok ? pendingChange.value : null;
  const pendingChangeFiles = pendingChangeValue?.task_id === state.task_id &&
    String(pendingChangeValue?.task_generation) === String(state.task_generation) &&
    Array.isArray(pendingChangeValue?.changed_files)
    ? pendingChangeValue.changed_files
    : [];

  const changed = unique([
    ...statusResult.files,
    ...intent.files,
    ...pendingChangeFiles
  ]).filter((file) => !isGovernancePath(file));
  if (changed.length === 0) {
    removeMutationIntent(ctx, input);
    return;
  }

  const latest = latestChangedMtime(root, changed);
  const indexedWayfinderOnly = indexedActiveWayfinderOnlyChange(root, ctx, state, changed);
  if (["mutating", "destructive", "opaque", "verification", "external", "unknown"].includes(controlClass)) {
    if (invocationChanged &&
        ["verification", "review", "delivery", "handoff"].includes(state.phase)) {
      reopenWorkflowAfterProjectMutation(root, ctx, state.phase);
    }
    const fingerprint = projectChangeFingerprint(root, changed);
    const execution = toolExecutionStatus(input);
    const currentHashes = refreshFileHashes(ctx);
    const baselineHashes = intent.value?.baseline_hashes || {};
    const refreshedTouched = (!execution.known || execution.ok)
      ? CHANGE_REFRESH_FILES.filter((name) =>
        baselineHashes[name] !== undefined && currentHashes[name] !== baselineHashes[name])
      : [];
    const nextValue = updateRuntimeReceipt(ctx, "change-state", (existing) => {
      const existingValue = existing.ok ? existing.value : null;
      const sameTask = existingValue?.task_id === state.task_id &&
        String(existingValue?.task_generation) === String(state.task_generation);
      if (sameTask && existingValue?.project_fingerprint === fingerprint) {
        const refreshedHashes = {
          ...(existingValue.refreshed_hashes || {})
        };
        for (const name of refreshedTouched) {
          refreshedHashes[name] = currentHashes[name];
        }
        return {
          ...existingValue,
          refreshed_hashes: refreshedHashes,
          updated_at: new Date().toISOString()
        };
      }

      const refreshedHashes = {};
      for (const name of refreshedTouched) refreshedHashes[name] = currentHashes[name];
      return {
        schema: "dong-skills.change-state.v1",
        task_id: state.task_id || "missing",
        task_generation: String(state.task_generation || "missing"),
        project_fingerprint: fingerprint,
        changed_files: changed,
        baseline_hashes: Object.keys(baselineHashes).length ? baselineHashes : currentHashes,
        refreshed_hashes: refreshedHashes,
        updated_at: new Date().toISOString()
      };
    });
    removeMutationIntent(ctx, input);
    if (receiptHasRefresh(nextValue, ctx, REQUIRED_FILES.artifacts) || indexedWayfinderOnly) {
      return;
    }

    writeArtifactReminder(root, ctx, changed, latest);
    return;
  }

  if (indexedWayfinderOnly || fileFresh(ctx, REQUIRED_FILES.artifacts, latest)) return;
  writeArtifactReminder(root, ctx, changed, latest);
}

function compactTrigger(input) {
  const candidates = [
    input?.trigger,
    input?.compaction_trigger,
    input?.compactionTrigger,
    input?.compact_trigger,
    input?.compactTrigger,
    input?.matcher,
    input?.source,
    input?.reason,
    input?.event?.trigger,
    input?.event?.compaction_trigger,
    input?.event?.compactionTrigger
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").toLowerCase();
    if (normalized === "manual" || normalized.includes("manual")) return "manual";
    if (normalized === "auto" || normalized.includes("automatic")) return "auto";
  }

  return "auto";
}

function markdownList(items, fallback = "- None reported.") {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item}`).join("\n");
}

function latestFileByMtime(root, files) {
  let latest = null;
  for (const file of files) {
    try {
      const stat = fs.statSync(path.join(root, file));
      if (!stat.isFile()) continue;
      const mtime = stat.mtimeMs;
      if (!latest || mtime > latest.mtime) latest = { file, mtime };
    } catch {
      // Deleted files may not have filesystem mtimes.
    }
  }
  return latest?.file || "";
}

function hookStatusText(root, ctx, latest = 0, files = [], options = {}) {
  const workflow = options.workflow || workflowStatus(root, ctx);
  const learning = options.learning === false ? null : (options.learning || learningStatus(ctx));
  const assets = options.assets === false ? null : (options.assets || assetGovernanceStatus(root, ctx));
  const checkpoint = options.checkpoint === false
    ? null
    : (options.checkpoint || gitCheckpointStatus(root, ctx, latest, files));
  const discussion = options.discussion === false ? null : (options.discussion || discussionStateStatus(root, ctx, workflow));
  const state = workflow.state || {};
  const consistencyIssues = workflow.consistency?.issues?.length || 0;
  const latestFile = latestFileByMtime(root, files.filter((file) => !isGovernancePath(file))) || latestFileByMtime(root, files);
  const lines = [
    "Hook status:",
    `- Event: ${options.eventName || "unknown"}`,
    `- Actual Git root: ${root}`,
    `- Workflow: phase=${state.phase || "missing"} next_skill=${state.next_skill || "missing"} decision_required=${state.decision_required || "missing"} issues=${workflow.issues.length} consistency_issues=${consistencyIssues}`,
    learning
      ? `- Learning: ${learning.ok ? "ok" : "pending-review"} issues=${learning.issues.length}`
      : "- Learning: not checked in this hook",
    assets
      ? `- Assets: ${assets.ok ? "ok" : "review-required"} issues=${assets.issues.length} advisories=${assets.advisories.length}`
      : "- Assets: not checked in this hook",
    discussion
      ? `- Discussion: ${discussion.ok ? "ok" : "needs-state-refresh"} issues=${discussion.issues.length}`
      : "- Discussion: not checked in this hook",
    checkpoint
      ? `- Checkpoint: ${checkpoint.ok ? "ok" : "review-required"}`
      : "- Checkpoint: not checked in this hook"
  ];
  if (latestFile) lines.push(`- Latest changed file: ${latestFile}`);
  return lines.join("\n");
}

function discussionStateStatus(root, ctx, workflow = null) {
  const file = discussionStateFile(ctx);
  if (!fs.existsSync(file)) {
    return {
      ok: true,
      issues: [],
      latest: 0,
      marker: null,
      requiredFiles: [],
      summary: "Discussion state ok: no dirty marker."
    };
  }

  const parsed = readJsonFile(file);
  if (!parsed.ok) {
    const issue = `${DISCUSSION_STATE_FILE} is invalid: ${parsed.error}. Repair or remove the corrupt discussion marker`;
    return {
      ok: false,
      issues: [issue],
      latest: mtimeMs(file),
      marker: null,
      requiredFiles: [],
      summary: `Discussion state needs repair: ${issue}. Repair or remove the corrupt discussion marker.`
    };
  }
  const marker = parsed.value || {};
  if (marker.status !== "dirty") {
    return {
      ok: true,
      issues: [],
      latest: mtimeMs(file),
      marker,
      requiredFiles: [],
      summary: "Discussion state ok: marker is not dirty."
    };
  }

  const state = workflow?.state || workflowStateFor(root, ctx);
  if (!marker.enforce_before_mutation &&
      !discussionWorkflowActive(state) &&
      !investigationWorkflowActive(state)) {
    return {
      ok: true,
      issues: [],
      latest: mtimeMs(file),
      marker,
      requiredFiles: [],
      summary: `Discussion state ok: inactive phase ${state.phase || "missing"}.`
    };
  }

  const latest = Math.max(mtimeMs(file), Date.parse(marker.updated_at || "") || 0);
  const requiredFiles = unique(Array.isArray(marker.required_files) ? marker.required_files : []);
  const baselineHashes = marker.baseline_hashes && typeof marker.baseline_hashes === "object"
    ? marker.baseline_hashes
    : null;
  const issues = [];

  for (const name of requiredFiles) {
    const target = discussionRequiredTarget(root, ctx, name);
    if (!target) {
      issues.push(`${name} escapes the project root`);
      continue;
    }
    const currentHash = fs.existsSync(target) ? stableFingerprint(fs.readFileSync(target)) : "missing";
    if (baselineHashes && Object.prototype.hasOwnProperty.call(baselineHashes, name)) {
      if (currentHash === baselineHashes[name]) {
        issues.push(`${name} content has not changed since the latest discussion or investigation marker`);
      }
    } else if (latest && mtimeMs(target) < latest - 1000) {
      issues.push(`${name} is older than latest discussion or investigation marker`);
    }
  }

  if (requiredFiles.includes(REQUIRED_FILES.workingNotes)) {
    const notes = readText(path.join(ctx, REQUIRED_FILES.workingNotes));
    const useful = ["Current Findings", "Current Hypothesis", "Rejected Paths", "Open Investigation Questions", "Next Verification Step"]
      .some((heading) => meaningful(sectionContent(notes, heading)));
    if (!useful) {
      issues.push("working-notes.md has no externalized investigation findings, hypothesis, rejected paths, open questions, or next verification step");
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    latest,
    marker,
    requiredFiles,
    summary: issues.length
      ? `Discussion state needs refresh: ${issues.join("; ")}.`
      : "Discussion state ok: required files are fresh."
  };
}

function stripHandoffTitle(markdown) {
  return String(markdown || "")
    .trim()
    .replace(/^# (?:Handoff Summary|Handoff 摘要)[ \t]*\r?\n+/i, "")
    .trim();
}

function hasMeaningfulHandoff(markdown) {
  return ["Objective", "Latest User Instruction", "Next Action"]
    .some((heading) => meaningful(sectionContent(markdown, heading)));
}

function emergencyFallbackSections(statusFiles) {
  return `## 目标
自动压缩前的应急恢复快照。

## 最新用户指令
自动压缩即将运行，但 Codex Project Ops 状态仍有未解决的 freshness 问题。

## 已批准范围 / 规格
写入这个应急 handoff 后允许自动压缩。恢复后先检查列出的文件，并刷新正常项目状态，再继续实质工作。

## 计划状态
Emergency PreCompact fallback。这不是正常里程碑 handoff。

## 已修改文件
${markdownList(statusFiles)}

## 已读取但未修改文件
- 没有可用的旧 handoff 内容。

## 已做决策
- 为避免上下文压力下静默硬停，允许自动压缩继续。
- 手动压缩前仍应刷新项目状态。

## 开放问题与假设
- 假设：保留可恢复 handoff 比在没有可靠聊天反馈时阻止自动压缩更安全。
- 开放问题：恢复后确认是否有项目特定状态文件需要更完整更新。

## 风险
- 这个应急 handoff 可能不如主动 handoff 完整。
- 上方 issues 中列出的部分状态文件在压缩后可能仍然过期。

## 验证证据
- 应急 PreCompact 路径中未验证。恢复后检查 \`.codex-context/verification.md\`。

## Git 存档
- 最新提交: automatic PreCompact 期间未检查
- 推送状态: automatic PreCompact 期间未检查
- 已包含文件: automatic PreCompact 期间无
- 有意保留未提交的文件: ${statusFiles.length ? shortList(statusFiles, 20) : "none reported"}
- 暂缓原因: 为避免静默阻塞，写入应急 handoff 后允许自动压缩继续
- 下次存档: 恢复后如果需要归档工作，运行 codex-git-checkpoint

## 需要保留的经验沉淀
- 恢复后检查 \`.codex-context/learned-instincts.md\` 和待审查 raw observations。

## 下一步动作
压缩后重读这个 handoff，检查未解决 issues，然后按需刷新 current-state.md、plan-progress.md、artifact-index.md、verification.md、learned-instincts.md 和 Git 存档。`;
}

function writeEmergencyPreCompactHandoff(root, ctx, changed, statusFiles, issues, trigger) {
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const handoffFile = path.join(ctx, REQUIRED_FILES.handoff);
  const rawDir = path.join(ctx, "raw");
  const rawFile = path.join(rawDir, `precompact-auto-${safeTimestamp}.md`);
  const previousHandoff = readText(handoffFile).trim();
  fs.mkdirSync(rawDir, { recursive: true });

  writeTextAtomic(rawFile, redactSensitiveText([
    "# PreCompact Auto Emergency Snapshot",
    "",
    `Created: ${timestamp}`,
    `Trigger: ${trigger}`,
    "",
    "## Changed Project Files",
    markdownList(changed),
    "",
    "## Git Status Files",
    markdownList(statusFiles),
    "",
    "## Issues",
    markdownList(issues),
    "",
    "## Discussion Marker",
    readText(discussionStateFile(ctx)) || "No discussion marker.",
    "",
    "## Working Notes",
    readText(path.join(ctx, REQUIRED_FILES.workingNotes)) || "No working notes.",
    "",
    "## Previous Handoff",
    previousHandoff || "No previous handoff content."
  ].join("\n")));

  const reread = [
    ".codex-context/handoff-summary.md",
    ".codex-context/workflow-state.yaml",
    ".codex-context/current-state.md",
    ".codex-context/project-map.md",
    ".codex-context/spec.md",
    ".codex-context/decisions.md",
    ".codex-context/open-questions.md",
    ".codex-context/working-notes.md",
    ".codex-context/discussion-state.json",
    ".codex-context/plan-progress.md",
    ".codex-context/artifact-index.md",
    ".codex-context/learned-instincts.md",
    ...statusFiles.slice(0, 8)
  ];
  const uniqueReread = [...new Set(reread)].filter(Boolean);
  const rawRel = path.relative(root, rawFile).replace(/\\/g, "/");
  let preservedHandoff = stripHandoffTitle(previousHandoff);
  const noticeMarker = "## PreCompact Emergency Notice";
  const noticeSeparator = "\n---\n\n";
  while (preservedHandoff.startsWith(noticeMarker)) {
    const separatorIndex = preservedHandoff.indexOf(noticeSeparator);
    if (separatorIndex === -1) break;
    preservedHandoff = preservedHandoff.slice(separatorIndex + noticeSeparator.length).trim();
  }
  const continuation = hasMeaningfulHandoff(previousHandoff)
    ? preservedHandoff
    : emergencyFallbackSections(statusFiles);

  writeTextAtomic(handoffFile, redactSensitiveText(`# Handoff 摘要

## PreCompact Emergency Notice
- Created: ${timestamp}
- Trigger: ${trigger}
- Raw snapshot: \`${rawRel}\`
- Previous handoff: 已保留在这个应急 notice 下方。
- Recovery rule: 先解决 PreCompact issues，再从下方保留的 handoff sections 继续。

## PreCompact Issues
${markdownList(issues)}

## PreCompact Files To Re-read First
${markdownList(uniqueReread)}

---

${continuation}
`));

  return rawRel;
}

export function preCompact(input, root, ctx) {
  const statusResult = gitStatusResult(root);
  const statusFiles = statusResult.files;
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const changed = statusFiles.filter((file) => !isGovernancePath(file));
  const indexedWayfinderOnly = indexedActiveWayfinderOnlyChange(root, ctx, state, changed);
  const latest = latestChangedMtime(root, [...new Set([...changed, ...statusFiles])]);
  const issues = [];

  if (!statusResult.ok) {
    issues.push(`Git status unavailable: ${statusResult.error || "unknown error"}`);
  }

  for (const [key, label] of [
    [REQUIRED_FILES.current, "current-state.md"],
    [REQUIRED_FILES.plan, "plan-progress.md"],
    [REQUIRED_FILES.artifacts, "artifact-index.md"]
  ]) {
    if (indexedWayfinderOnly &&
        [REQUIRED_FILES.plan, REQUIRED_FILES.artifacts].includes(key)) {
      continue;
    }
    const status = markdownStatus(ctx, key, latest, label);
    if (!status.ok) issues.push(status.issue);
  }

  const handoff = handoffStatus(ctx, latest);
  if (!handoff.ok) {
    if (handoff.stale) issues.push("handoff-summary.md is older than changed project files");
    if (handoff.missing.length) issues.push(`handoff-summary.md missing: ${handoff.missing.join(", ")}`);
  }

  const learning = learningStatus(ctx);
  issues.push(...learning.issues);

  const checkpointFiles = [...new Set([...changed, ...statusFiles])];
  const checkpoint = gitCheckpointStatus(root, ctx, latest, checkpointFiles);
  if (!checkpoint.ok) issues.push(checkpoint.summary);
  issues.push(...workflow.issues);
  const discussion = discussionStateStatus(root, ctx, workflow);
  issues.push(...discussion.issues);
  const assets = assetGovernanceStatus(root, ctx);
  issues.push(...assets.issues);

  if (issues.length === 0) return;

  const trigger = compactTrigger(input);
  if (trigger === "auto") {
    const rawRel = writeEmergencyPreCompactHandoff(root, ctx, changed, statusFiles, issues, trigger);
    const message = [
      "Codex Project Ops allowed automatic compaction after preserving the existing handoff with an emergency notice.",
      hookStatusText(root, ctx, Math.max(latest, discussion.latest), [...new Set([...changed, ...statusFiles])], { learning, checkpoint, assets, workflow, discussion, eventName: "PreCompact" }),
      "Recovery file: .codex-context/handoff-summary.md.",
      "Lifecycle note: this emergency notice is temporary; after recovery, run asset-governance --apply or refresh a normal handoff to archive the notice.",
      `Previous handoff snapshot: ${rawRel}.`,
      `Issues captured: ${issues.join("; ")}.`
    ].join("\n");

    writeJson({
      continue: true,
      systemMessage: message
    });
    return;
  }

  writeJson({
    continue: false,
    stopReason: "codex-project-ops-handoff-not-ready",
    systemMessage: [
      "Codex Project Ops blocked compaction.",
      hookStatusText(root, ctx, Math.max(latest, discussion.latest), [...new Set([...changed, ...statusFiles])], { learning, checkpoint, assets, workflow, discussion, eventName: "PreCompact" }),
      `Issues: ${issues.join("; ")}.`,
      "Refresh current-state.md, plan-progress.md, artifact-index.md, spec.md, decisions.md, open-questions.md, working-notes.md, handoff-summary.md, Git Checkpoint, and learned-instincts.md as applicable. Then compact again."
    ].join("\n")
  });
}

export function stop(input, root, ctx) {
  const statusResult = gitStatusResult(root);
  const statusFiles = statusResult.files;
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const intent = mutationIntentStatus(root, ctx, input, state);
  const pendingChange = readRuntimeReceipt(ctx, "change-state");
  const pendingChangeValue = pendingChange.ok ? pendingChange.value : null;
  const pendingChangeFiles = pendingChangeValue?.task_id === state.task_id &&
    String(pendingChangeValue?.task_generation) === String(state.task_generation) &&
    Array.isArray(pendingChangeValue?.changed_files)
    ? pendingChangeValue.changed_files
    : [];
  const changed = unique([
    ...statusFiles,
    ...(intent.ok ? intent.files : []),
    ...pendingChangeFiles
  ]).filter((file) => !isGovernancePath(file));
  const indexedWayfinderOnly = indexedActiveWayfinderOnlyChange(root, ctx, state, changed);
  const learning = learningStatus(ctx);
  const allStatusFiles = [...new Set([...changed, ...statusFiles])];
  const latest = latestChangedMtime(root, changed);
  const assets = assetGovernanceStatus(root, ctx);
  const evidenceRequired = executionEvidenceRequired(state, allStatusFiles);
  const checkpointRequired = checkpointReviewRequired(state, allStatusFiles);
  const changeState = changed.length > 0
    ? changeReceiptStatus(root, ctx, changed, state)
    : { active: false, exists: false, issue: "", value: null };
  const checkpointEvidenceLatest = changeState.active &&
    receiptHasRefresh(changeState.value, ctx, REQUIRED_FILES.handoff)
    ? 0
    : latest;
  const checkpoint = checkpointRequired
    ? gitCheckpointStatus(root, ctx, checkpointEvidenceLatest, checkpointEvidenceLatest ? changed : [])
    : null;
  const discussion = discussionStateStatus(root, ctx, workflow);
  const statusLatest = Math.max(latest, discussion.latest);

  if (statusResult.ok && changed.length === 0 && (!checkpointRequired || checkpoint.ok) && assets.ok && workflow.ok && discussion.ok) {
    workflowContextHash(root, ctx, true);
    removeRuntimeReceipt(ctx, stopContinuationReceiptName(input));
    removeRuntimeReceipt(ctx, "change-state");
    allowStop();
    return;
  }

  const issues = [];

  if (!statusResult.ok) {
    issues.push(`Git status unavailable: ${statusResult.error || "unknown error"}`);
  }
  if (!intent.ok) issues.push(intent.issue);
  if (changeState.issue) issues.push(changeState.issue);

  if (changed.length > 0) {
    for (const [key, label] of [
      [REQUIRED_FILES.current, "current-state.md"],
      [REQUIRED_FILES.artifacts, "artifact-index.md"]
    ]) {
      if (key === REQUIRED_FILES.artifacts && indexedWayfinderOnly) continue;
      if (changeState.active && !receiptHasRefresh(changeState.value, ctx, key)) {
        issues.push(`${label} has not been refreshed after the latest project mutation`);
        continue;
      }
      const status = markdownStatus(ctx, key, changeState.active ? 0 : latest, label);
      if (!status.ok) issues.push(status.issue);
    }

    if (evidenceRequired) {
      if (changeState.active && !receiptHasRefresh(changeState.value, ctx, REQUIRED_FILES.verification)) {
        issues.push("verification.md has not been refreshed after the latest project mutation");
      }
      const verification = verificationStatus(ctx, changeState.active ? 0 : latest);
      if (verification.stale) issues.push("verification.md is older than changed files");
      if (!verification.hasEvidence) issues.push("verification.md has neither command evidence nor explicit unverified gaps");

      if (changeState.active && !receiptHasRefresh(changeState.value, ctx, REQUIRED_FILES.handoff)) {
        issues.push("handoff-summary.md has not been refreshed after the latest project mutation");
      }
      const handoff = handoffStatus(ctx, changeState.active ? 0 : latest);
      if (!handoff.ok) {
        if (handoff.stale) issues.push("handoff-summary.md is older than changed files");
        if (handoff.missing.length) issues.push(`handoff-summary.md missing: ${handoff.missing.join(", ")}`);
      }
    }
  }

  if (checkpointRequired && !checkpoint.ok) issues.push(checkpoint.summary);
  issues.push(...assets.issues);
  issues.push(...workflow.issues);
  issues.push(...discussion.issues);

  if (issues.length === 0) {
    workflowContextHash(root, ctx, true);
    removeRuntimeReceipt(ctx, stopContinuationReceiptName(input));
    removeRuntimeReceipt(ctx, "change-state");
    allowStop();
    return;
  }

  const fingerprint = stableFingerprint(issues);
  const continuation = updateRuntimeReceipt(ctx, stopContinuationReceiptName(input), (previous) => {
    const previousValue = previous.ok ? previous.value : null;
    const sameTask = previousValue?.task_id === state.task_id &&
      String(previousValue?.task_generation) === String(state.task_generation);
    const sameIssue = sameTask && previousValue?.fingerprint === fingerprint;
    const previousCount = sameIssue ? Number(previousValue?.count || 0) : 0;
    const exhausted = Boolean(sameIssue && previousCount >= 2);
    return {
      schema: "dong-skills.stop-continuation.v1",
      task_id: state.task_id || "missing",
      task_generation: String(state.task_generation || "missing"),
      fingerprint,
      count: exhausted ? previousCount : previousCount + 1,
      same_issue: sameIssue,
      exhausted,
      issues,
      updated_at: new Date().toISOString()
    };
  });

  if (continuation.exhausted) {
    allowStop(`Codex Project Ops issues remain unresolved after the bounded Stop continuations: ${shortList(issues, 8)}. The final response must disclose these gaps and must not claim verified completion.`);
    return;
  }

  const systemMessage = [
    continuation.same_issue
      ? "Project issues are still unresolved after Stop continuation."
      : "Before stopping, refresh Codex Project Ops state.",
    hookStatusText(root, ctx, statusLatest, allStatusFiles, { learning, checkpoint: checkpointRequired ? checkpoint : false, assets, workflow, discussion, eventName: "Stop" }),
    changed.length ? `Changed files: ${shortList(changed)}.` : "No non-context files changed.",
    `Issues: ${issues.join("; ")}.`,
    "Update only the files named by the current issues. If verification was not run, record the explicit gap instead of claiming success."
  ].join("\n");

  blockStop(systemMessage);
}

function stopContinuationReceiptName(input) {
  return scopedRuntimeReceiptName("stop-continuation", hookSessionKey(input));
}
