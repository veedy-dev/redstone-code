<p align="center">
  <img src="assets/screenshot.png" alt="redstone-code" width="720" />
</p>

<h1 align="center">Redstone Code</h1>

<p align="center">
  <strong>An agentic coding CLI, rebuilt from the ground up.</strong><br>
  Multi-provider support. No telemetry. No guardrails. All experimental features unlocked.<br>
  One binary, zero callbacks home.
</p>

<p align="center">
  <a href="#quick-install"><img src="https://img.shields.io/badge/install-one--liner-blue?style=flat-square" alt="Install" /></a>
  <a href="https://github.com/veedy-dev/redstone-code/stargazers"><img src="https://img.shields.io/github/stars/veedy-dev/redstone-code?style=flat-square" alt="Stars" /></a>
  <a href="https://github.com/veedy-dev/redstone-code/issues"><img src="https://img.shields.io/github/issues/veedy-dev/redstone-code?style=flat-square" alt="Issues" /></a>
  <a href="https://github.com/veedy-dev/redstone-code/blob/main/FEATURES.md"><img src="https://img.shields.io/badge/features-88%20flags-orange?style=flat-square" alt="Feature Flags" /></a>
</p>

---

## Highlights

- **Multi-provider hot-swap** -- Switch between Anthropic, MiniMax, OpenAI Codex, OpenRouter, Ollama, and any compatible endpoint mid-session via `/login`. No restart needed.
- **Provider profiles** -- Save and manage multiple API providers. Add a custom endpoint once, switch back and forth with one click. Manage models per provider (add, remove, set default).
- **Local model support** -- Auto-detect and use local providers like Ollama and LM Studio. No API key required.
- **OpenAI-compatible endpoints** -- Connect to OpenRouter, Together, Groq, or any OpenAI Chat Completions API with automatic format translation.
- **models.dev registry** -- Auto-discover provider names and available models from the [models.dev](https://models.dev) community registry (106+ providers).
- **Zero telemetry** -- All outbound analytics, crash reports, and session fingerprinting are removed at build time.
- **No prompt guardrails** -- Hardcoded refusal patterns and injected restriction overlays are stripped. The model's own safety training still applies.
- **54 experimental features unlocked** -- Every feature flag that compiles cleanly is enabled in the full build. See [FEATURES.md](FEATURES.md).

---

## Quick Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/veedy-dev/redstone-code/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/veedy-dev/redstone-code/main/install.ps1 | iex
```

Checks your system, installs Bun if needed, clones the repo, builds with all experimental features enabled, and puts `redstone-code` on your PATH.

Then run `redstone-code` and use the `/login` command to authenticate with your preferred provider.

---

## Table of Contents

- [Highlights](#highlights)
- [Quick Install](#quick-install)
- [Model Providers](#model-providers)
- [Provider Profiles](#provider-profiles)
- [Requirements](#requirements)
- [Build](#build)
- [Usage](#usage)
- [Experimental Features](#experimental-features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## Model Providers

Redstone Code supports **eight provider types** out of the box. Use the `/login` command or set environment variables to switch providers.

### Anthropic (Direct API) -- Default

Use Anthropic's first-party API directly.

```bash
redstone-code
# Then /login and select "Anthropic Console account"
```

### Custom Anthropic-Compatible Endpoints

Any provider that implements the Anthropic Messages API format works out of the box. Examples: [MiniMax](https://platform.minimax.io), [Z.ai (GLM)](https://docs.z.ai), or any Anthropic-compatible proxy.

```bash
redstone-code
# Then /login > "Custom provider" > enter base URL, API key, and model name
```

Or via environment variables:

```bash
export ANTHROPIC_BASE_URL="https://api.minimax.io/anthropic"
export ANTHROPIC_AUTH_TOKEN="your-api-key"
export ANTHROPIC_MODEL="MiniMax-M2.7"
redstone-code
```

### OpenAI-Compatible Endpoints

Connect to any provider that implements the OpenAI Chat Completions API. Examples: [OpenRouter](https://openrouter.ai), [Together](https://together.ai), [Groq](https://groq.com).

Redstone Code automatically translates between Anthropic and OpenAI API formats via a built-in fetch adapter.

```bash
redstone-code
# Then /login > "OpenAI-compatible" > enter base URL, API key, and model name
```

Or via environment variables:

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
export OPENAI_API_KEY="your-api-key"
export OPENAI_MODEL="anthropic/claude-sonnet-4"
redstone-code
```

### Local Providers (Ollama, LM Studio)

Run models locally with automatic provider detection. No API key required.

```bash
# Start Ollama first, then:
redstone-code
# Then /login > "Local" > auto-detects Ollama/LM Studio > select a model
```

Or via environment variables:

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL="http://localhost:11434/v1"
export OPENAI_MODEL="llama3.2"
redstone-code
```

Supported local providers:

| Provider | Default Port | Model Discovery |
|---|---|---|
| [Ollama](https://ollama.com) | `localhost:11434` | Auto (`/api/tags`) |
| [LM Studio](https://lmstudio.ai) | `localhost:1234` | Auto (`/v1/models`) |

### OpenAI Codex

Use OpenAI's Codex models. Requires a Codex subscription.

| Model | ID |
|---|---|
| GPT-5.4 | `gpt-5.4` |
| GPT-5.3 Codex | `gpt-5.3-codex` |
| GPT-5.4 Mini | `gpt-5.4-mini` |

```bash
redstone-code
# Then /login and select "OpenAI Codex account"
```

### AWS Bedrock

Route requests through your AWS account via Amazon Bedrock.

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION="us-east-1"
redstone-code
```

Uses your standard AWS credentials (environment variables, `~/.aws/config`, or IAM role).

### Google Cloud Vertex AI

Route requests through your GCP project via Vertex AI.

```bash
export CLAUDE_CODE_USE_VERTEX=1
redstone-code
```

Uses Google Cloud Application Default Credentials (`gcloud auth application-default login`).

### Anthropic Foundry

Use Anthropic Foundry for dedicated deployments.

```bash
export CLAUDE_CODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_API_KEY="..."
redstone-code
```

### Provider Summary

| Provider | Setup | Auth |
|---|---|---|
| Anthropic (default) | `/login` | API key or OAuth |
| Custom endpoint | `/login` > Custom provider | API key |
| OpenAI-compatible | `/login` > OpenAI-compatible | API key |
| Local (Ollama/LM Studio) | `/login` > Local | None (auto-detect) |
| OpenAI Codex | `/login` | OAuth via OpenAI |
| AWS Bedrock | `CLAUDE_CODE_USE_BEDROCK=1` | AWS credentials |
| Google Vertex AI | `CLAUDE_CODE_USE_VERTEX=1` | `gcloud` ADC |
| Anthropic Foundry | `CLAUDE_CODE_USE_FOUNDRY=1` | API key |

---

## Provider Profiles

Redstone Code lets you save multiple provider configurations and switch between them without restarting.

### Adding a provider

1. Run `/login`
2. Select a provider type (Custom provider, OpenAI-compatible, or Local)
3. Enter the base URL -- Redstone Code auto-detects the provider name and available models from the [models.dev](https://models.dev) registry
4. Enter the API key (not required for local providers)
5. The provider is saved and activated immediately

### Managing models

Highlight a saved provider in `/login` and press `e` to manage its models:

- **Add models** -- discovered from the models.dev registry or entered manually
- **Remove models** -- with confirmation prompt (at least one model must remain)
- **Set default model** -- press `d` on any model in the list

### Switching providers

Run `/login` again. Saved providers appear at the top of the screen:

```
Switch provider or login:

> MiniMax (current) - MiniMax-M2.7
  Anthropic - Default account

  Set up new login:
  1. Claude account with subscription
  2. Anthropic Console account
  3. Custom provider (Anthropic-compatible)
  4. OpenAI Codex account
  5. OpenAI-compatible (OpenRouter, Together, Groq)
  6. Local (Ollama, LM Studio)
```

Select any saved provider to hot-swap mid-session. The API client, model list, and auth are all updated instantly.

### Deleting a provider

Highlight a saved provider and press `Del`. Confirm with `y`. If you delete the active provider, Redstone Code automatically switches back to Anthropic.

### How it works

- Profiles are stored in `~/.claude/claude.json` under `providerProfiles`
- Each profile has a `type` field: `'anthropic-compatible'` or `'openai-compatible'`
- Anthropic-compatible profiles set `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`
- OpenAI-compatible profiles set `CLAUDE_CODE_USE_OPENAI`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`
- Original env vars are stashed and restored when switching back

---

## Requirements

- **Runtime**: [Bun](https://bun.sh) >= 1.3.11
- **OS**: macOS, Linux, or Windows (native or WSL)
- **Auth**: An API key or OAuth login for your chosen provider (not required for local providers)

```bash
# Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash
```

---

## Build

```bash
git clone https://github.com/veedy-dev/redstone-code.git
cd redstone-code
bun install
bun run build
./cli
```

### Build Variants

| Command | Output | Features | Description |
|---|---|---|---|
| `bun run build` | `./cli` | `VOICE_MODE` only | Production-like binary |
| `bun run build:dev` | `./cli-dev` | `VOICE_MODE` only | Dev version stamp |
| `bun run build:dev:full` | `./cli-dev` | All 54 experimental flags | Full unlock build |
| `bun run compile` | `./dist/cli` | `VOICE_MODE` only | Alternative output path |

### Custom Feature Flags

Enable specific flags without the full bundle:

```bash
# Enable just ultraplan and ultrathink
bun run ./scripts/build.ts --feature=ULTRAPLAN --feature=ULTRATHINK

# Add a flag on top of the dev build
bun run ./scripts/build.ts --dev --feature=BRIDGE_MODE
```

---

## Usage

```bash
# Interactive REPL (default)
./cli

# One-shot mode
./cli -p "what files are in this directory?"

# Specify a model
./cli --model claude-opus-4-6

# Run from source (slower startup)
bun run dev

# Login / switch providers
./cli /login

# Switch model
./cli /model
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_AUTH_TOKEN` | Auth token (alternative) |
| `ANTHROPIC_MODEL` | Override default model |
| `ANTHROPIC_BASE_URL` | Custom Anthropic-compatible endpoint |
| `CLAUDE_CODE_USE_OPENAI` | Enable OpenAI-compatible routing (`1`) |
| `OPENAI_BASE_URL` | OpenAI-compatible endpoint URL |
| `OPENAI_API_KEY` | OpenAI-compatible API key |
| `OPENAI_MODEL` | OpenAI-compatible model name |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Custom Opus model ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Custom Sonnet model ID |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Custom Haiku model ID |

---

## Experimental Features

The `bun run build:dev:full` build enables all 54 working feature flags. Highlights:

### Interaction & UI

| Flag | Description |
|---|---|
| `ULTRAPLAN` | Remote multi-agent planning (Opus-class) |
| `ULTRATHINK` | Deep thinking mode -- type "ultrathink" to boost reasoning effort |
| `VOICE_MODE` | Push-to-talk voice input and dictation |
| `TOKEN_BUDGET` | Token budget tracking and usage warnings |
| `HISTORY_PICKER` | Interactive prompt history picker |
| `MESSAGE_ACTIONS` | Message action entrypoints in the UI |
| `QUICK_SEARCH` | Prompt quick-search |
| `SHOT_STATS` | Shot-distribution stats |

### Agents, Memory & Planning

| Flag | Description |
|---|---|
| `BUILTIN_EXPLORE_PLAN_AGENTS` | Built-in explore/plan agent presets |
| `VERIFICATION_AGENT` | Verification agent for task validation |
| `AGENT_TRIGGERS` | Local cron/trigger tools for background automation |
| `AGENT_TRIGGERS_REMOTE` | Remote trigger tool path |
| `EXTRACT_MEMORIES` | Post-query automatic memory extraction |
| `COMPACTION_REMINDERS` | Smart reminders around context compaction |
| `CACHED_MICROCOMPACT` | Cached microcompact state through query flows |
| `TEAMMEM` | Team-memory files and watcher hooks |

### Tools & Infrastructure

| Flag | Description |
|---|---|
| `BRIDGE_MODE` | IDE remote-control bridge (VS Code, JetBrains) |
| `BASH_CLASSIFIER` | Classifier-assisted bash permission decisions |
| `PROMPT_CACHE_BREAK_DETECTION` | Cache-break detection in compaction/query flow |

See [FEATURES.md](FEATURES.md) for the complete audit of all 88 flags, including 34 broken flags with reconstruction notes.

---

## Project Structure

```
scripts/
  build.ts                # Build script with feature flag system

src/
  entrypoints/cli.tsx     # CLI entrypoint
  commands.ts             # Command registry (slash commands)
  tools.ts                # Tool registry (agent tools)
  QueryEngine.ts          # LLM query engine
  screens/REPL.tsx        # Main interactive UI (Ink/React)

  commands/               # /slash command implementations
  tools/                  # Agent tool implementations (Bash, Read, Edit, etc.)
  components/             # Ink/React terminal UI components
  hooks/                  # React hooks
  services/               # API clients, MCP, OAuth
    api/                  # API client + fetch adapters (Codex, OpenAI-compat)
    oauth/                # OAuth flows
  state/                  # App state store
  utils/                  # Utilities
    model/                # Model configs, providers, validation
    providerProfiles.ts   # Provider profile CRUD, hot-swap
    modelsRegistry.ts     # models.dev registry integration
    localProviders.ts     # Local provider auto-detection (Ollama, LM Studio)
  skills/                 # Skill system
  plugins/                # Plugin system
  bridge/                 # IDE bridge
  voice/                  # Voice input
  tasks/                  # Background task management
```

---

## Tech Stack

| | |
|---|---|
| **Runtime** | [Bun](https://bun.sh) |
| **Language** | TypeScript |
| **Terminal UI** | React + [Ink](https://github.com/vadimdemedes/ink) |
| **CLI Parsing** | [Commander.js](https://github.com/tj/commander.js) |
| **Schema Validation** | Zod v4 |
| **Code Search** | ripgrep (bundled) |
| **Protocols** | MCP, LSP |
| **APIs** | Anthropic Messages, OpenAI Chat Completions, OpenAI Codex, AWS Bedrock, Google Vertex AI, [models.dev](https://models.dev) |

---

## Contributing

Contributions are welcome. If you're working on restoring one of the 34 broken feature flags, check the reconstruction notes in [FEATURES.md](FEATURES.md) first -- many are close to compiling and just need a small wrapper or missing asset.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'feat: add something'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## License

This repository is provided for educational and research purposes. The original source code is subject to Anthropic's terms. Use at your own discretion.
