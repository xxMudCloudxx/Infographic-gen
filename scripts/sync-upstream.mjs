#!/usr/bin/env node

/**
 * sync-upstream.mjs
 *
 * 自动检测 @antv/infographic 上游变更：
 *   1. npm 上的最新版本号 vs package.json 中的版本
 *   2. GitHub 上 antvis/Infographic 仓库的 SKILL.md 内容变化
 *
 * 当检测到变更时，自动更新本地文件并输出 diff 摘要，
 * 供 GitHub Actions 提交 PR 或本地手动审阅。
 *
 * 用法:
 *   node scripts/sync-upstream.mjs              # 检测 + 更新
 *   node scripts/sync-upstream.mjs --check-only # 仅检测，不写文件（CI dry-run）
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── 常量 ──────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@antv/infographic/latest";

/** 上游 SKILL.md 文件地址（GitHub raw） */
const SKILL_URLS = {
  "infographic-creator":
    "https://raw.githubusercontent.com/antvis/Infographic/main/.skills/infographic-creator/SKILL.md",
  "infographic-syntax-creator":
    "https://raw.githubusercontent.com/antvis/Infographic/main/.skills/infographic-syntax-creator/SKILL.md",
};

/** 本地缓存快照目录 */
const SNAPSHOT_DIR = path.join(ROOT, ".upstream-snapshots");

const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");
const PROMPTS_PATH = path.join(ROOT, "src", "core", "prompts.ts");

const CHECK_ONLY = process.argv.includes("--check-only");

// ─── 工具函数 ────────────────────────────────────────────────────────

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
  return res.text();
}

async function readJSON(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * 从 package.json 的版本范围中提取纯版本号
 * "^0.2.11" → "0.2.11"
 */
function stripRange(version) {
  return version.replace(/^[\^~>=<]+/, "");
}

// ─── 1. 检查 npm 版本 ───────────────────────────────────────────────

async function checkNpmVersion() {
  console.log("\n🔍  检查 @antv/infographic npm 版本...");

  const [registryData, pkg] = await Promise.all([
    fetchText(NPM_REGISTRY_URL).then(JSON.parse),
    readJSON(PACKAGE_JSON_PATH),
  ]);

  const latestVersion = registryData.version;
  const currentRange = pkg.dependencies["@antv/infographic"];
  const currentVersion = stripRange(currentRange);

  console.log(`   本地: ${currentRange} (${currentVersion})`);
  console.log(`   最新: ${latestVersion}`);

  if (currentVersion === latestVersion) {
    console.log("   ✅  版本已是最新");
    return { changed: false, currentVersion, latestVersion };
  }

  console.log(`   ⚠️  检测到新版本: ${currentVersion} → ${latestVersion}`);
  return { changed: true, currentVersion, latestVersion };
}

// ─── 2. 检查 SKILL.md 变更 ──────────────────────────────────────────

async function checkSkillFiles() {
  console.log("\n🔍  检查上游 SKILL.md 变更...");
  await ensureDir(SNAPSHOT_DIR);

  const changes = [];

  for (const [name, url] of Object.entries(SKILL_URLS)) {
    const snapshotPath = path.join(SNAPSHOT_DIR, `${name}.SKILL.md`);

    let upstream;
    try {
      upstream = await fetchText(url);
    } catch (err) {
      console.log(`   ⚠️  无法获取 ${name}: ${err.message}`);
      continue;
    }

    const localSnapshot = await readIfExists(snapshotPath);

    if (localSnapshot === null) {
      // 首次运行，保存快照
      console.log(`   📝  首次快照: ${name}`);
      if (!CHECK_ONLY) {
        await fs.writeFile(snapshotPath, upstream, "utf-8");
      }
      continue;
    }

    if (localSnapshot.trim() === upstream.trim()) {
      console.log(`   ✅  ${name} 无变化`);
      continue;
    }

    console.log(`   ⚠️  ${name} 检测到内容变更`);
    changes.push({ name, url, content: upstream, snapshotPath });
  }

  return changes;
}

// ─── 3. 应用更新 ────────────────────────────────────────────────────

async function applyNpmVersionUpdate(latestVersion) {
  const pkg = await readJSON(PACKAGE_JSON_PATH);
  pkg.dependencies["@antv/infographic"] = `^${latestVersion}`;
  await fs.writeFile(
    PACKAGE_JSON_PATH,
    JSON.stringify(pkg, null, 2) + "\n",
    "utf-8",
  );
  console.log(`   📦  package.json 已更新为 ^${latestVersion}`);
}

async function applySkillSnapshots(skillChanges) {
  for (const change of skillChanges) {
    await fs.writeFile(change.snapshotPath, change.content, "utf-8");
    console.log(`   📝  快照已更新: ${change.name}`);
  }
}

// ─── 4. 生成变更摘要 ────────────────────────────────────────────────

function generateSummary(versionResult, skillChanges) {
  const lines = ["## 🔄 上游变更检测报告\n"];

  if (versionResult.changed) {
    lines.push(
      `### npm 版本更新`,
      `- \`@antv/infographic\`: \`${versionResult.currentVersion}\` → \`${versionResult.latestVersion}\``,
      "",
    );
  }

  if (skillChanges.length > 0) {
    lines.push(`### SKILL.md 内容变更`);
    for (const c of skillChanges) {
      lines.push(`- [\`${c.name}\`](${c.url}): 上游内容已变更`);
    }
    lines.push(
      "",
      "> ⚠️  **SKILL.md 变更时需要手动审阅并更新 `src/core/prompts.ts` 中的硬编码提示词。**",
      "> 请对比 `.upstream-snapshots/` 中的快照与 `prompts.ts` 的差异。",
      "",
    );
  }

  if (!versionResult.changed && skillChanges.length === 0) {
    lines.push("✅ 一切都是最新的，无需更新。");
  }

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("━━━  infographic-gen 上游同步检测  ━━━");

  const [versionResult, skillChanges] = await Promise.all([
    checkNpmVersion(),
    checkSkillFiles(),
  ]);

  const hasChanges = versionResult.changed || skillChanges.length > 0;

  if (!hasChanges) {
    console.log("\n✅  一切都是最新的，无需更新。");
    process.exit(0);
  }

  // 生成摘要
  const summary = generateSummary(versionResult, skillChanges);
  console.log("\n" + summary);

  if (CHECK_ONLY) {
    console.log("ℹ️  --check-only 模式，跳过文件写入。");
    // 输出到 GITHUB_OUTPUT 供 Actions 使用
    if (process.env.GITHUB_OUTPUT) {
      // GitHub Actions: 将多行写入 output
      const delimiter = `EOF_${Date.now()}`;
      const output = [
        `has_changes=true`,
        `summary<<${delimiter}`,
        summary,
        delimiter,
      ].join("\n");
      await fs.appendFile(process.env.GITHUB_OUTPUT, output + "\n", "utf-8");
    }
    process.exit(1); // 非零退出码表示有变更
  }

  // 应用更新
  console.log("\n📝  应用更新...");

  if (versionResult.changed) {
    await applyNpmVersionUpdate(versionResult.latestVersion);
  }

  if (skillChanges.length > 0) {
    await applySkillSnapshots(skillChanges);
  }

  // 写入摘要文件供 PR body 使用
  const summaryPath = path.join(ROOT, ".upstream-sync-summary.md");
  await fs.writeFile(summaryPath, summary, "utf-8");
  console.log(`\n📄  变更摘要已写入: ${summaryPath}`);

  // 设置 GitHub Actions 输出
  if (process.env.GITHUB_OUTPUT) {
    const delimiter = `EOF_${Date.now()}`;
    const output = [
      `has_changes=true`,
      `summary<<${delimiter}`,
      summary,
      delimiter,
    ].join("\n");
    await fs.appendFile(process.env.GITHUB_OUTPUT, output + "\n", "utf-8");
  }

  console.log("\n🎉  同步完成！");
  console.log(
    "    如果 SKILL.md 发生了变化，请手动审阅并更新 src/core/prompts.ts。",
  );
}

main().catch((err) => {
  console.error("❌  同步脚本出错:", err);
  process.exit(2);
});
