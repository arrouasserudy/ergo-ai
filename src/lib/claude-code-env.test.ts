import { describe, expect, it } from "vitest";
import { credentialEnv } from "./claude-code-env";

describe("credentialEnv", () => {
  it("passes the subscription token and drops API keys", () => {
    const env = credentialEnv(" sk-ant-oat01-abc\n def ", { PATH: "/bin", ANTHROPIC_API_KEY: "sk-ant-api-x", ANTHROPIC_AUTH_TOKEN: "t", HOME: undefined });
    expect(env).toEqual({ PATH: "/bin", CLAUDE_CODE_OAUTH_TOKEN: "sk-ant-oat01-abcdef" });
  });

  it("rejects anything that isn't a subscription token", () => {
    expect(() => credentialEnv("sk-ant-api03-x", {})).toThrow();
    expect(() => credentialEnv("", {})).toThrow();
  });
});
