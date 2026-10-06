/**
 * Environment for the Claude Code CLI subprocess, from a Claude credential.
 * The CLI prefers an API key over the OAuth token, so a leftover ANTHROPIC_API_KEY
 * would silently bill that key instead of the subscription: both are removed first.
 */
export function credentialEnv(raw: string, base: Record<string, string | undefined>): Record<string, string> {
  const token = raw.replace(/\s+/g, ""); // terminal copy-paste adds wrap spaces
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) if (v !== undefined) env[k] = v;
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.CLAUDE_CODE_OAUTH_TOKEN;

  if (token.startsWith("sk-ant-oat")) env.CLAUDE_CODE_OAUTH_TOKEN = token;
  else throw new Error("CLAUDE_CODE_OAUTH_TOKEN is not a Claude subscription token (expected sk-ant-oat…, from `claude setup-token`)");
  return env;
}
