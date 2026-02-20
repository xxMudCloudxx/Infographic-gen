# infographic-gen

AI-powered CLI tool to generate [AntV Infographic](https://infographic.antv.vision/) SVGs from natural language prompts.

Transform your ideas into beautiful, data-driven infographics in seconds using the power of large language models and AntV's professional infographic templates.

---

## ✨ Features

- **Natural Language Input** — Describe your infographic in plain English or Chinese
- **AI-Powered Generation** — Uses OpenAI, DeepSeek, or other LLM providers via OpenAI SDK
- **Professional Templates** — 60+ pre-designed AntV Infographic templates (lists, sequences, hierarchies, comparisons, charts, relations, etc.)
- **Self-Correcting** — Automatically retries with error feedback if generation fails (up to 3 attempts)
- **Persistent Config** — Save API keys and settings locally for repeat use
- **Automated Sync** — Weekly checks for upstream Infographic updates via GitHub Actions
- **Fully Tested** — 131 comprehensive tests covering all features

---

## 📦 Installation

### Global Installation (Recommended for CLI use)

```bash
npm install -g infographic-gen
```

After installation, you can use the CLI from anywhere:

```bash
infographic-gen generate "A timeline of AI breakthroughs"
infographic-gen config set apiKey sk-...
```

### Local Installation (for development)

```bash
git clone https://github.com/yourusername/infographic-gen.git
cd infographic-gen
npm install
npm run build
npm start  # Run built CLI
```

---

## 🚀 Quick Start

### 1. Configure Your LLM Provider

```bash
infographic-gen config set apiKey sk-xxxx123
infographic-gen config set baseUrl https://api.openai.com/v1    # Optional
infographic-gen config set modelName gpt-4o                      # Optional
```

**Supported Providers:**

- **OpenAI** ← Default
- **DeepSeek** — Set `baseUrl` to `https://api.deepseek.com`
- **Alibaba Cloud** (DashScope) — Set `baseUrl` with your endpoint
- Any service compatible with OpenAI SDK

View your config:

```bash
infographic-gen config list
infographic-gen config path  # Show config file location
```

### 2. Generate an Infographic

```bash
infographic-gen generate "A comparison of frontend frameworks"
```

Output: `infographic-output.svg` (in current directory)

Specify output path:

```bash
infographic-gen gen "Data visualization trends" --output my-chart.svg
```

### 3. Get Help

```bash
infographic-gen --help
infographic-gen config --help
infographic-gen generate --help
```

---

## 💡 Usage Examples

### Example 1: Technology Timeline

```bash
infographic-gen gen "A timeline showing the evolution of web technologies from HTTP/1.0 to HTTP/3"
```

Will generate a timeline with key milestones, automatically selecting an appropriate template.

### Example 2: Comparison Matrix

```bash
infographic-gen gen "Compare the pros and cons of monolithic vs microservices architecture"
```

Generates a comparison infographic with Strengths and Weaknesses categories.

### Example 3: Data Chart

```bash
infographic-gen gen "Show the distribution of programming languages by usage: Python 35%, JavaScript 28%, Java 20%, C++ 12%, Other 5%"
```

Creates a pie/bar chart with the provided data.

---

## 🛠️ Development

### Setup

```bash
git clone https://github.com/yourusername/infographic-gen.git
cd infographic-gen
npm install
```

### Commands

| Command              | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `npm run build`      | Build CLI to `dist/index.js`              |
| `npm run dev`        | Watch mode (rebuild on file changes)      |
| `npm start`          | Run built CLI                             |
| `npm test`           | Run full test suite (vitest)              |
| `npm run test:watch` | Watch mode for tests                      |
| `npm run sync`       | Check & update upstream @antv/infographic |
| `npm run sync:check` | Dry-run: check without updating           |

### Project Structure

```
infographic-gen/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── config/index.ts             # Config store (conf library)
│   ├── utils/
│   │   ├── logger.ts               # Colored output to stderr
│   │   └── spinner.ts              # Ora spinner wrapper
│   └── core/
│       ├── prompts.ts              # System prompts (60+ templates)
│       ├── ai.ts                   # OpenAI integration + self-correction
│       └── render.ts               # @antv/infographic SSR rendering
├── __tests__/                      # 131 tests across 7 test files
├── scripts/
│   └── sync-upstream.mjs           # Upstream change detection
├── .github/workflows/              # CI/CD automation
├── package.json
├── tsup.config.ts                  # Build config
├── vitest.config.ts                # Test config
└── tsconfig.json
```

### Adding New Features

The pipeline is straightforward:

1. **User Input** → Commander parses CLI args
2. **Config** → Loads LLM settings from persistent store
3. **AI Generation** → `generateInfographicDSL()` calls LLM with system prompt
4. **Rendering** → `renderDSLToSVG()` uses @antv/infographic SSR
5. **Self-Correction** → If render fails, retry with error feedback (max 3 times)
6. **Output** → Write SVG to file

---

## 📋 Configuration

Config is stored in:

- **macOS/Linux** — `~/.config/infographic-gen/config.json`
- **Windows** — `%APPDATA%\infographic-gen\config.json`

### Configurable Keys

| Key         | Type   | Example                     | Notes                                       |
| ----------- | ------ | --------------------------- | ------------------------------------------- |
| `apiKey`    | string | `sk-...`                    | Your LLM API key                            |
| `baseUrl`   | string | `https://api.openai.com/v1` | LLM endpoint (optional)                     |
| `modelName` | string | `gpt-4o`                    | Model to use (optional, defaults to gpt-4o) |
| `provider`  | string | `openai`                    | For reference only                          |

Manage config via CLI:

```bash
# Set
infographic-gen config set apiKey sk-...
infographic-gen config set baseUrl https://api.deepseek.com

# Get
infographic-gen config get apiKey

# List all
infographic-gen config list

# Delete
infographic-gen config delete baseUrl

# Show config file path
infographic-gen config path
```

---

## 🔄 Upstream Synchronization

The tool automatically tracks upstream changes in `@antv/infographic`:

### What is Monitored?

1. **npm Package Version** — Detects version updates
2. **SKILL.md Files** — The syntax specifications and template lists that guide the LLM

### How It Works

- **Weekly Check** — GitHub Actions runs every Monday (UTC 08:00)
- **Manual Check** — Run `npm run sync:check` anytime
- **Auto-Update** — Snapshot files stored in `.upstream-snapshots/`
- **PR Creation** — If changes detected, a PR is created automatically
- **Manual Review** — You review the SKILL.md changes and update `src/core/prompts.ts` if needed

### Local Usage

```bash
# Check for updates (dry-run)
npm run sync:check

# Apply updates
npm run sync
```

---

## 📤 Publishing to npm

### Automatic Publishing (GitHub Actions)

When you push a tagged release, GitHub Actions automatically publishes to npm:

1. **Create a git tag** (follows semantic versioning):

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. **GitHub Actions will**:
   - Build the project
   - Run all tests
   - Publish to npm registry
   - Create a GitHub Release with release notes

### Manual Publishing

If you need to publish manually:

```bash
npm run build      # Build first
npm publish        # Requires npm login
```

### Before Publishing

- Ensure `npm test` passes
- Update `CHANGELOG.md` with notable changes
- Bump version in `package.json` using semantic versioning:
  - **MAJOR** (x.0.0) — Breaking changes
  - **MINOR** (1.x.0) — New features
  - **PATCH** (1.0.x) — Bug fixes

### npm Registry Setup

The package is configured with:

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

When published:

- Only `dist/` folder is included (via `"files"` field)
- Bin entry creates a global `infographic-gen` command
- ESM-only, Node.js 18+ required

---

## 🏗️ GitHub Actions Workflows

Two workflows are configured:

### 1. `sync-upstream.yml` — Upstream Change Detection

- Runs weekly (Monday, 08:00 UTC)
- Detects `@antv/infographic` version updates
- Checks for SKILL.md changes
- Creates a PR if changes found

### 2. `publish.yml` — Publish to npm

- Triggers on git tag push (v*.*.\*)
- Builds and tests
- Publishes to npm
- Creates GitHub Release

---

## 🧪 Testing

Run tests with vitest:

```bash
npm test              # Single run
npm run test:watch    # Watch mode
```

Test coverage:

- **131 tests** across 7 test files
- Config management (persistent storage)
- Logger & spinner utilities
- AI prompt engineering
- SSR rendering
- Command integration
- CLI end-to-end

---

## 📝 License

MIT — See LICENSE file

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Ensure tests pass (`npm test`)
4. Commit with conventional commits (`feat:`, `fix:`, etc.)
5. Push and open a Pull Request

---

## 🐛 Troubleshooting

### "Command not found: infographic-gen"

If you installed globally with `-g` but command is not recognized:

```bash
# Check npm's global bin directory
npm config get prefix

# Ensure it's in your PATH
# On macOS/Linux: ~/.npm/_npx/node_modules/.bin should be in PATH
# On Windows: npm global bin is usually in %APPDATA%\npm
```

### "API Key is invalid"

Check your configuration:

```bash
infographic-gen config get apiKey
infographic-gen config get baseUrl
```

Ensure your API key is valid for the provider you're using.

### "Render failed: unknown template"

The LLM might have suggested a template that doesn't exist in your version of `@antv/infographic`. Try:

1. Update the package: `npm update @antv/infographic`
2. Run sync: `npm run sync`
3. Try again with a more specific prompt

---

## 📊 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## 🙏 Acknowledgments

- **[AntV Infographic](https://infographic.antv.vision/)** — Professional infographic templates & SSR engine
- **[OpenAI](https://openai.com/)** — LLM backbone
- **[Commander.js](https://github.com/tj/commander.js)** — CLI framework
- **[Ora](https://github.com/sindresorhus/ora)** — Spinner UI
