import fs from "node:fs";
import path from "node:path";
import { readText } from "./core.mjs";
import { hasHeading, meaningful, sectionContent } from "./markdown.mjs";
import { writeRecoveryReceipt } from "./runtime.mjs";
import { REQUIRED_FILES } from "./templates.mjs";
import { workflowStatus } from "./workflow.mjs";

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function firstMeaningfulSection(markdown, headings) {
  for (const heading of headings) {
    const body = sectionContent(markdown, heading);
    if (meaningful(body)) return body;
  }
  return "";
}

function meaningfulDocumentBody(markdown) {
  const body = String(markdown || "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*#{1,6}\s+/.test(line))
    .join("\n");
  return meaningful(body);
}

function normalizeWayfinderReference(value) {
  let reference = String(value || "").trim();
  if (reference.startsWith("`") && reference.endsWith("`")) {
    reference = reference.slice(1, -1).trim();
  }
  if (/^(?:none|not active|inactive|closed|无|暂无|未启用|已完成)[。.]?$/i.test(reference)) {
    return "";
  }
  const markdownLink = reference.match(/^\[[^\]]+\]\(([^)]+)\)$/);
  if (markdownLink) reference = markdownLink[1].trim();
  return reference;
}

function activeWayfinderReference(ctx) {
  const sources = [
    readText(path.join(ctx, REQUIRED_FILES.current)),
    readText(path.join(ctx, REQUIRED_FILES.handoff))
  ];
  for (const source of sources) {
    const match = source.match(/(?:^|\n)\s*(?:[-*]\s*)?(?:Active Wayfinder|当前 Wayfinder)\s*:\s*`?([^`\r\n]+)`?/i);
    if (match) return normalizeWayfinderReference(match[1]);
  }
  return "";
}

export function activeWayfinderStatus(root, ctx) {
  const reference = activeWayfinderReference(ctx);
  if (!reference) {
    return { active: false, ok: true, reference: "", file: "", markdown: "", issues: [] };
  }

  const file = path.resolve(root, reference);
  const issues = [];
  if (!isInside(root, file)) issues.push(`active Wayfinder path escapes project root: ${reference}`);
  if (!fs.existsSync(file)) issues.push(`active Wayfinder file is missing: ${reference}`);
  const markdown = issues.length === 0 ? readText(file) : "";
  if (issues.length === 0 && !meaningful(markdown)) {
    issues.push(`active Wayfinder file is empty: ${reference}`);
  } else {
    const sections = {};
    for (const heading of ["Destination", "Decisions So Far", "Frontier", "Fog", "Out Of Scope"]) {
      if (!hasHeading(markdown, heading)) {
        issues.push(`active Wayfinder missing heading: ${heading}`);
      } else {
        sections[heading] = sectionContent(markdown, heading);
      }
    }
    for (const heading of ["Destination", "Decisions So Far", "Out Of Scope"]) {
      if (hasHeading(markdown, heading) && !meaningful(sections[heading])) {
        issues.push(`active Wayfinder section is empty: ${heading}`);
      }
    }
    if (hasHeading(markdown, "Frontier") && hasHeading(markdown, "Fog") &&
        !meaningful(sections.Frontier) && !meaningful(sections.Fog)) {
      issues.push("active Wayfinder requires meaningful Frontier or Fog content");
    }
  }
  return {
    active: true,
    ok: issues.length === 0,
    reference,
    file,
    markdown,
    issues
  };
}

function clippedSection(markdown, heading, max = 280) {
  const body = sectionContent(markdown, heading).trim();
  if (!body) return "";
  const clipped = body.length > max ? `${body.slice(0, max - 3)}...` : body;
  return `## ${heading}\n${clipped}`;
}

export function activeWayfinderSummary(root, ctx, max = 1500) {
  const status = activeWayfinderStatus(root, ctx);
  if (!status.active) return "";
  if (!status.ok) {
    return [
      "Active Wayfinder summary:",
      `Path: ${status.reference}`,
      ...status.issues.map((issue) => `- ${issue}`)
    ].join("\n");
  }
  const sections = ["Destination", "Decisions So Far", "Frontier", "Fog", "Out Of Scope"]
    .map((heading) => clippedSection(status.markdown, heading))
    .filter(Boolean);
  const summary = [
    "Active Wayfinder summary:",
    `Path: ${status.reference}`,
    ...sections
  ].join("\n\n");
  return summary.length > max ? `${summary.slice(0, max - 3)}...` : summary;
}

export function evaluateRecovery(root, ctx = path.join(root, ".codex-context")) {
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const complete = state.phase === "complete";
  const handoff = readText(path.join(ctx, REQUIRED_FILES.handoff));
  const current = readText(path.join(ctx, REQUIRED_FILES.current));
  const artifactIndex = readText(path.join(ctx, REQUIRED_FILES.artifacts));
  const decisions = readText(path.join(ctx, REQUIRED_FILES.decisions));
  const risks = readText(path.join(ctx, REQUIRED_FILES.risks));
  const spec = readText(path.join(ctx, REQUIRED_FILES.spec));
  const verification = readText(path.join(ctx, REQUIRED_FILES.verification));
  const wayfinder = activeWayfinderStatus(root, ctx);
  const wayfinderPhaseOk = wayfinder.active
    ? state.phase === "wayfinding"
    : state.phase !== "wayfinding";
  const preImplementation = ["discovery", "wayfinding", "brainstorming", "spec", "planning"].includes(state.phase);

  const probes = [
    {
      id: "workflow-state",
      ok: workflow.ok &&
        meaningful(state.task_id) &&
        meaningful(state.phase) &&
        (complete ? state.next_skill === "none" : meaningful(state.next_skill) && state.next_skill !== "none"),
      detail: workflow.ok ? `phase=${state.phase}; next=${state.next_skill}` : workflow.issues.join("; ")
    },
    {
      id: "context-freshness",
      ok: complete
        ? workflow.ok
        : workflow.ok &&
          !!state.handoff_hash &&
          state.handoff_hash !== "null" &&
          state.handoff_task_id === state.task_id &&
          String(state.handoff_task_generation) === String(state.task_generation),
      detail: complete
        ? "workflow complete; active handoff hash not required"
        : (!state.handoff_hash || state.handoff_hash === "null"
            ? "active workflow requires a refreshed handoff hash"
            : (state.handoff_task_id !== state.task_id ||
                String(state.handoff_task_generation) !== String(state.task_generation)
                ? "saved handoff hash task identity does not match current workflow task identity"
                : (workflow.ok ? "handoff hash and task identity match" : workflow.issues.join("; "))))
    },
    {
      id: "file-pointers",
      ok: meaningful(firstMeaningfulSection(handoff, ["Files To Re-read First"])) ||
        meaningful(firstMeaningfulSection(artifactIndex, ["Created", "Modified"])),
      detail: "handoff re-read list or artifact index"
    },
    {
      id: "decisions",
      ok: meaningfulDocumentBody(decisions),
      detail: "decisions.md"
    },
    {
      id: "risks-boundaries",
      ok: meaningfulDocumentBody(risks) || meaningful(firstMeaningfulSection(spec, ["Non-Goals", "Out Of Scope"])),
      detail: "risks.md or spec boundaries"
    },
    {
      id: "next-action",
      ok: complete ||
        meaningful(firstMeaningfulSection(current, ["Next Action"])) ||
        meaningful(firstMeaningfulSection(handoff, ["Next Action"])),
      detail: complete ? "workflow complete" : "current-state.md or handoff-summary.md"
    },
    {
      id: "verification-evidence",
      ok: meaningful(firstMeaningfulSection(verification, ["Commands Run", "Verification Evidence", "Not Yet Verified"])),
      detail: preImplementation
        ? "verification.md with explicit pre-implementation status"
        : "verification.md"
    },
    {
      id: "active-wayfinder",
      ok: wayfinder.ok && wayfinderPhaseOk,
      detail: !wayfinder.ok
        ? wayfinder.issues.join("; ")
        : (!wayfinderPhaseOk
            ? (wayfinder.active
                ? `active Wayfinder requires phase=wayfinding, got ${state.phase}`
                : "phase=wayfinding requires an active Wayfinder")
            : (wayfinder.active ? wayfinder.reference : "not active"))
    }
  ];

  return {
    ok: probes.every((probe) => probe.ok),
    root,
    mode: complete ? "complete" : "active",
    probes,
    activeWayfinder: wayfinder.active ? {
      reference: wayfinder.reference,
      summary: activeWayfinderSummary(root, ctx)
    } : null
  };
}

export function formatRecoveryEvaluation(result) {
  return [
    "Dong Skills context recovery evaluation",
    `Root: ${result.root}`,
    "",
    ...result.probes.map((probe) => `${probe.id}: ${probe.ok ? "pass" : "fail"} - ${probe.detail}`),
    "",
    result.ok ? "Result: pass" : "Result: fail"
  ].join("\n");
}

export function acknowledgeRecovery(root, ctx = path.join(root, ".codex-context"), sessionKey = "") {
  const workflow = workflowStatus(root, ctx);
  if (!workflow.ok) {
    throw new Error(`Cannot acknowledge context recovery: ${workflow.issues.join("; ")}`);
  }
  return writeRecoveryReceipt(root, ctx, workflow.state, sessionKey);
}
