# infographic-gen

基于 AI 的 CLI 工具，可以从自然语言提示生成 [AntV Infographic](https://infographic.antv.vision/) SVG 信息图。

将你的想法转化为精美的、数据驱动的信息图 —— 仅需几秒钟，借助大语言模型和 AntV 专业的信息图模板。

---

## ✨ 特性

- **自然语言输入** — 用中英文描述你的信息图需求
- **AI 驱动生成** — 支持 OpenAI、DeepSeek 或其他兼容 OpenAI SDK 的 LLM 服务
- **专业模板库** — 60+ 预设设计的 AntV Infographic 模板（列表、流程、层级、对比、图表、关系等）
- **自动纠错** — 生成失败时自动重试并反馈错误信息（最多 3 次尝试）
- **本地配置存储** — API Key 和设置永久保存，无需重复输入
- **上游自动同步** — 每周自动检测 @antv/infographic 更新，通过 GitHub Actions 创建 PR
- **全面的测试覆盖** — 131 个综合测试，覆盖所有功能

---

## 📦 安装

### 全局安装（推荐用于 CLI 使用）

```bash
npm install -g infographic-gen
```

安装后，可以在任何目录使用：

```bash
infographic-gen generate "AI 突破的时间线"
infographic-gen config set apiKey sk-...
```

### 本地安装（用于开发）

```bash
git clone https://github.com/yourusername/infographic-gen.git
cd infographic-gen
npm install
npm run build
npm start  # 运行构建后的 CLI
```

---

## 🚀 快速开始

### 1. 配置 LLM 服务

```bash
infographic-gen config set apiKey sk-xxxx123
infographic-gen config set baseUrl https://api.openai.com/v1    # 可选
infographic-gen config set modelName gpt-4o                      # 可选
```

**支持的服务提供商：**
- **OpenAI** ← 默认
- **DeepSeek** — 设置 `baseUrl` 为 `https://api.deepseek.com`
- **阿里云 DashScope** — 设置对应的端点
- 任何兼容 OpenAI API 的服务

查看配置：
```bash
infographic-gen config list
infographic-gen config path  # 显示配置文件位置
```

### 2. 生成信息图

```bash
infographic-gen generate "对比前端框架的优缺点"
```

输出：`infographic-output.svg`（当前目录）

指定输出路径：
```bash
infographic-gen gen "数据可视化趋势分析" --output my-chart.svg
```

### 3. 获取帮助

```bash
infographic-gen --help
infographic-gen config --help
infographic-gen generate --help
infographic-gen gen -h  # gen 是 generate 的别名
```

---

## 💡 使用示例

### 示例 1：技术演进时间线

```bash
infographic-gen gen "展示 Web 技术演进：从 HTTP/1.0 到 HTTP/3"
```

自动生成时间线，展示关键里程碑。

### 示例 2：对比矩阵

```bash
infographic-gen gen "对比单体架构和微服务架构的优缺点"
```

生成包含优势和劣势的对比信息图。

### 示例 3：数据图表

```bash
infographic-gen gen "编程语言使用分布：Python 35%、JavaScript 28%、Java 20%、C++ 12%、其他 5%"
```

自动创建饼图或柱状图。

---

## 🛠️ 开发

### 项目设置

```bash
git clone https://github.com/yourusername/infographic-gen.git
cd infographic-gen
npm install
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run build` | 构建 CLI 到 `dist/index.js` |
| `npm run dev` | Watch 模式（文件变化自动重建） |
| `npm start` | 运行已构建的 CLI |
| `npm test` | 运行全部测试 (vitest) |
| `npm run test:watch` | Watch 模式测试 |
| `npm run sync` | 检查并更新上游 @antv/infographic |
| `npm run sync:check` | 仅检测，不更新（干运行） |

### 项目结构

```
infographic-gen/
├── src/
│   ├── index.ts                    # CLI 入口
│   ├── config/index.ts             # 配置存储（conf 库）
│   ├── utils/
│   │   ├── logger.ts               # 彩色日志输出
│   │   └── spinner.ts              # 加载动画
│   └── core/
│       ├── prompts.ts              # 系统提示词（60+ 模板）
│       ├── ai.ts                   # OpenAI 集成 + 自动纠错
│       └── render.ts               # @antv/infographic SSR 渲染
├── __tests__/                      # 131 个测试
├── scripts/
│   └── sync-upstream.mjs           # 上游变更检测脚本
├── .github/workflows/              # CI/CD 自动化
├── package.json
└── tsup.config.ts                  # 构建配置
```

### 实现流程

1. **用户输入** → Commander 解析 CLI 参数
2. **读取配置** → 从本地存储加载 LLM 设置
3. **AI 生成** → 调用 LLM 生成符合规范的 DSL
4. **渲染** → 使用 @antv/infographic SSR 渲染成 SVG
5. **自动纠错** → 如果渲染失败，反馈错误信息并重试（最多 3 次）
6. **输出** → 保存 SVG 文件到指定路径

---

## 📋 配置管理

配置文件存储位置：
- **macOS/Linux** — `~/.config/infographic-gen/config.json`
- **Windows** — `%APPDATA%\infographic-gen\config.json`

### 可配置的字段

| 字段 | 类型 | 示例 | 说明 |
|------|------|------|------|
| `apiKey` | string | `sk-...` | LLM API 密钥 |
| `baseUrl` | string | `https://api.openai.com/v1` | LLM 服务端点（可选） |
| `modelName` | string | `gpt-4o` | 使用的模型（可选，默认 gpt-4o） |
| `provider` | string | `openai` | 服务提供商标识 |

### 通过 CLI 管理配置

```bash
# 设置
infographic-gen config set apiKey sk-...
infographic-gen config set baseUrl https://api.deepseek.com

# 读取
infographic-gen config get apiKey

# 列出所有配置
infographic-gen config list

# 删除
infographic-gen config delete baseUrl

# 显示配置文件路径
infographic-gen config path
```

---

## 🔄 上游同步机制

工具自动监测 `@antv/infographic` 的上游变更：

### 监测内容

1. **npm 包版本** — 检测版本更新
2. **SKILL.md 文件** — 监测语法规范和模板列表变更

### 工作原理

- **周期检测** — 每周一（UTC 08:00）通过 GitHub Actions 自动运行
- **手动检测** — 随时运行 `npm run sync:check`
- **自动更新** — 快照文件保存在 `.upstream-snapshots/`
- **自动创建 PR** — 检测到变更时自动创建 Pull Request
- **手动审阅** — 你审阅 SKILL.md 变更并更新 `src/core/prompts.ts`

### 本地使用

```bash
# 检查更新（不写入文件）
npm run sync:check

# 检查并应用更新
npm run sync
```

---

## 📤 发布到 npm

### 自动发布（GitHub Actions）

推送 git tag 后，GitHub Actions 会自动发布到 npm：

1. **创建版本 tag**（遵循语义化版本）：
   ```bash
   npm version patch    # 1.0.0 → 1.0.1 (bug 修复)
   npm version minor    # 1.0.0 → 1.1.0 (新功能)
   npm version major    # 1.0.0 → 2.0.0 (破坏性变更)
   ```

2. **GitHub Actions 会自动**：
   - 构建项目
   - 运行所有测试
   - 发布到 npm
   - 创建 GitHub Release

### 手动发布

如果需要手动发布：

```bash
npm run build      # 先构建
npm publish        # 需要先运行 npm login
```

### 发布前检查清单

- ✅ `npm test` 通过所有测试
- ✅ 更新 `CHANGELOG.md` 并记录变更内容
- ✅ 根据语义化版本规范更新 `package.json` 中的版本号：
  - **MAJOR** (x.0.0) — 破坏性变更
  - **MINOR** (1.x.0) — 新功能
  - **PATCH** (1.0.x) — bug 修复

### npm Registry 配置

包已配置为：

```json
{
  "name": "infographic-gen",
  "version": "1.0.0",
  "license": "MIT",
  "type": "module",
  "bin": {
    "infographic-gen": "./dist/index.js"
  },
  "files": ["dist"],
  "engines": { "node": ">=18.0.0" }
}
```

发布时：
- 仅包含 `dist/` 文件夹（通过 `"files"` 字段）
- 创建全局 `infographic-gen` 命令
- 仅支持 ESM，需要 Node.js 18+

---

## 🏗️ GitHub Actions 工作流

已配置两个自动化工作流：

### 1. `sync-upstream.yml` — 上游变更检测
- 每周运行（周一 08:00 UTC）
- 检测 `@antv/infographic` 版本更新
- 检查 SKILL.md 变更
- 有变更时自动创建 PR

### 2. `publish.yml` — 发布到 npm
- 当推送 git tag 时触发（格式：v*.*.*)
- 自动构建和测试
- 发布到 npm
- 创建 GitHub Release

---

## 🧪 测试

使用 vitest 运行测试：

```bash
npm test              # 单次运行
npm run test:watch    # Watch 模式
```

测试覆盖：
- **131 个测试**分布在 7 个测试文件
- 配置管理（持久化存储）
- 日志和加载动画工具
- AI 提示词工程
- SSR 渲染
- 命令集成
- CLI 端到端集成

---

## 📝 许可证

MIT — 详见 LICENSE 文件

---

## 🤝 贡献指南

欢迎贡献！请按以下步骤操作：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/awesome-feature`)
3. 确保测试通过 (`npm test`)
4. 使用 Conventional Commits 提交改动 (`feat:`、`fix:` 等)
5. 推送分支并打开 Pull Request

---

## 🐛 故障排查

### "找不到命令：infographic-gen"

如果全局安装后找不到命令：

```bash
# 查看 npm 全局 bin 目录
npm config get prefix

# 确保路径在 PATH 环境变量中
# macOS/Linux: ~/.npm/_npx/node_modules/.bin 应该在 PATH 中
# Windows: npm 全局 bin 通常在 %APPDATA%\npm
```

### "API Key 无效"

检查你的配置：

```bash
infographic-gen config get apiKey
infographic-gen config get baseUrl
```

确保 API Key 对你使用的服务提供商有效。

### "渲染失败：未知的模板"

LLM 可能建议了你的 @antv/infographic 版本中不存在的模板。尝试：

1. 更新包：`npm update @antv/infographic`
2. 运行同步：`npm run sync`
3. 用更具体的提示词重试

---

## 📚 相关资源

- **[AntV Infographic 官方](https://infographic.antv.vision/)** — 信息图模板和 SSR 引擎
- **[OpenAI](https://openai.com/)** — LLM 支持
- **[Commander.js](https://github.com/tj/commander.js)** — CLI 框架
- **[Ora](https://github.com/sindresorhus/ora)** — 加载动画
- **[语义化版本](https://semver.org/)** — 版本控制规范

---

## 📞 反馈与支持

- 🐛 **报告 Bug** — 提交 GitHub Issues
- 💡 **功能建议** — Discussions 或 Issues
- 💬 **讨论** — GitHub Discussions

---

更多信息请查看：
- [README.md](README.md) — 英文版本
- [PUBLISHING.md](PUBLISHING.md) — 详细发布指南
- [QUICK_START.md](QUICK_START.md) — 快速参考卡片

