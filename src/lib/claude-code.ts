import "server-only";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { credentialEnv } from "./claude-code-env";

/*
 * Claude through a Claude.ai subscription: the Agent SDK runs the bundled Claude Code
 * CLI with CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`). Used by the
 * "claude-code" provider for report drafts, form conversion and Amit, with the same
 * model settings as the API key path (EXPERT_MODEL, REPORT_MODEL, FORMS_MODEL).
 */

let workdir: string | null = null;

/** An empty working directory: the CLI never sees the app's files. */
function emptyWorkdir(): string {
  if (!workdir) {
    workdir = path.join(os.tmpdir(), "otio-claude-code");
    mkdirSync(workdir, { recursive: true });
  }
  return workdir;
}

/**
 * Options shared by every call: no built-in tools (no shell, no file access), no
 * settings or sessions on disk, our own system prompt, the subscription credential.
 */
export function claudeCodeOptions(model: string, systemPrompt: string): Options {
  return {
    model,
    systemPrompt,
    env: credentialEnv(process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "", process.env),
    tools: [],
    settingSources: [],
    persistSession: false,
    cwd: emptyWorkdir(),
  };
}

/** Assistant errors and result subtypes that mean "try again later", not a bug. */
export const UNAVAILABLE_ERRORS = new Set([
  "authentication_failed",
  "oauth_org_not_allowed",
  "account_on_hold",
  "billing_error",
  "rate_limit",
  "overloaded",
  "server_error",
  "model_not_found",
]);
