import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI_PATH = path.resolve("dist/index.js");

/**
 * 辅助函数：运行 CLI 命令，返回 stdout + stderr + exitCode
 */
function runCLI(args: string[]): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    encoding: "utf-8",
    timeout: 10000,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

describe("CLI 集成测试", () => {
  describe("--help", () => {
    it("应正确输出帮助信息", () => {
      const { stdout } = runCLI(["--help"]);
      expect(stdout).toContain("infographic-gen");
      expect(stdout).toContain("config");
      expect(stdout).toContain("generate");
    });
  });

  describe("--version", () => {
    it("应输出版本号", () => {
      const { stdout } = runCLI(["--version"]);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("config --help", () => {
    it("应输出 config 子命令帮助", () => {
      const { stdout } = runCLI(["config", "--help"]);
      expect(stdout).toContain("set");
      expect(stdout).toContain("get");
      expect(stdout).toContain("list");
      expect(stdout).toContain("delete");
      expect(stdout).toContain("path");
    });
  });

  describe("config list", () => {
    it("应列出配置项（stderr 输出）", () => {
      const { stderr } = runCLI(["config", "list"]);
      expect(stderr).toContain("API Key");
      expect(stderr).toContain("Base URL");
      expect(stderr).toContain("Provider");
      expect(stderr).toContain("Model Name");
    });
  });

  describe("config path", () => {
    it("应输出 .json 配置文件路径", () => {
      const { stdout } = runCLI(["config", "path"]);
      expect(stdout.trim()).toMatch(/\.json$/);
    });
  });

  describe("config set/get/delete 流程", () => {
    it("应支持完整的 set → get → delete 生命周期", () => {
      // set
      const setResult = runCLI([
        "config",
        "set",
        "provider",
        "test-provider-e2e",
      ]);
      expect(setResult.stderr).toContain("set successfully");

      // get
      const getResult = runCLI(["config", "get", "provider"]);
      expect(getResult.stderr).toContain("test-provider-e2e");

      // delete（恢复默认）
      const delResult = runCLI(["config", "delete", "provider"]);
      expect(delResult.stderr).toContain("reset to default");

      // 验证恢复
      const afterDel = runCLI(["config", "get", "provider"]);
      expect(afterDel.stderr).toContain("openai");
    });
  });

  describe("config 非法操作", () => {
    it("set 非法 key 应退出码非 0", () => {
      const result = runCLI(["config", "set", "invalidKey", "value"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Invalid config key");
    });

    it("get 非法 key 应退出码非 0", () => {
      const result = runCLI(["config", "get", "badKey"]);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("generate --help", () => {
    it("应输出 generate 子命令帮助", () => {
      const { stdout } = runCLI(["generate", "--help"]);
      expect(stdout).toContain("prompt");
      expect(stdout).toContain("--output");
    });

    it("gen 别名也应输出帮助", () => {
      const { stdout } = runCLI(["gen", "--help"]);
      expect(stdout).toContain("prompt");
    });
  });

  describe("generate 无 API Key", () => {
    it("未配置 API Key 执行 generate 应报错", () => {
      // 确保 apiKey 为空
      runCLI(["config", "delete", "apiKey"]);
      const result = runCLI(["generate", "测试"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("API Key");
    });
  });
});
