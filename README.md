# Suren Coding Agent

**Suren Coding Agent** is a production-ready, autonomous software engineering agent system designed to act as a personal AI software engineer working on real multi-stack software projects.

---

## 🚀 Key Capabilities

- **Complete Autonomous Engineering Workflow**:
  `UNDERSTAND` → `INSPECT` → `PLAN` → `MODIFY` → `TEST` → `DIAGNOSE` → `FIX` → `VERIFY` → `COMMIT` → `DEPLOY` → `VERIFY DEPLOYMENT`.
- **Multi-Project & Multi-Stack Architecture**:
  Native support for **KrtLab** (React/TypeScript/Vite/Tailwind/Supabase), **Voxline AI** (Real-time speech & voice platform), **Atlas Robotics** (ROS2/Python/C++/Docker), and custom user-added projects.
- **Provider-Independent LLM Architecture**:
  Real implementations of `GeminiProvider` (powered by `@google/genai` and Gemini 3.6 Flash) and `AnthropicProvider` (`@anthropic-ai/sdk` and Claude 3.7 Sonnet).
- **Security & Permission System**:
  - **3 Permission Levels**: `SAFE` (auto-allowed), `MODIFY` (code/deletion/migration changes), `DEPLOY` (explicit interactive approval required for production deploy/destructive ops).
  - **Terminal Security**: Command allowlisting, dangerous command detection (`rm -rf`, `DROP TABLE`, `force push`), secret redaction, and execution timeouts.
- **Full Tool System**:
  - **File Tools**: `list_files`, `read_file`, `write_file`, `patch_file`, `delete_file`, `search_code`.
  - **Terminal Tools**: `run_command`, `run_tests`, `run_build`, `run_lint`.
  - **Git Tools**: `git_status`, `git_diff`, `git_log`, `git_branch`, `git_create_branch`, `git_commit`, `git_checkout`.
  - **GitHub API**: Repository inspection, file retrieval, code search, branches, commits, pull requests, actions.
  - **Vercel API**: Project inspection, deployment creation, build logs, environment tracking.
  - **Supabase API**: Schema inspection, tables, migrations creation and tracking.
  - **Browser Tools**: Web preview HTTP header inspection, page HTML parsing, screenshots, console logs.
- **Real-Time Developer Dashboard**:
  Dark developer UI with live SSE event streaming, side-by-side visual diff views, terminal logs, test output, deployment status, and project memory documentation editor.

---

## 🛠 Project Structure

```
/projects.json                        <- Multi-project registry
/memory/                              <- Persistent project memory documents
  /krtlab/
  /voxline/
  /atlas/
/src/
  types/agent.ts                      <- TypeScript types & interfaces
  llm/                                <- Gemini & Anthropic provider implementations
  security/                           <- Terminal security, secret redaction, permission rules
  tools/                              <- File, Terminal, Git, GitHub, Vercel, Supabase, Browser tools
  memory/                             <- Project memory manager
  agent/                              <- Controller state machine, router, task store
  components/                         <- Web Dashboard UI components
  App.tsx                             <- Main Dashboard application
/tests/                               <- Automated unit & end-to-end integration test runner
/server.ts                            <- Express + Vite full-stack backend entry point
```

---

## 📋 Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# LLM Providers
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.6-flash"

ANTHROPIC_API_KEY="your-anthropic-api-key"
ANTHROPIC_MODEL="claude-3-7-sonnet-20250219"

# Integrations
GITHUB_TOKEN="your-github-token"
VERCEL_TOKEN="your-vercel-token"
SUPABASE_ACCESS_TOKEN="your-supabase-token"

# Settings
MAX_AGENT_ITERATIONS=20
```

---

## 🏃 Running the Application

### 1. Development Mode

Launch the full-stack dev server (Express backend + Vite frontend):

```bash
npm run dev
```

The application will start on `http://0.0.0.0:3000`.

### 2. Running Tests

Run the comprehensive unit test suite and end-to-end integration test:

```bash
npm test
```

### 3. Production Build & Start

```bash
npm run build
npm start
```

---

## 💬 Commands & Natural Language Routing

### Slash Commands
- `/project <id>` — Switch active project context (e.g. `/project krtlab`).
- `/inspect` — Inspect repository architecture and code structure.
- `/plan` — Formulate engineering execution plan.
- `/test` — Execute project test suite (`npm test`).
- `/build` — Execute project build pipeline (`npm run build`).
- `/lint` — Execute type checks & linting (`npm run lint`).
- `/status` — Display current agent status & credential state.
- `/diff` — Show working tree git diff.
- `/commit` — Stage and commit changes with a structured message.
- `/deploy` — Trigger Vercel deployment.

### Natural Language Examples
- `"Fix the AI Mentor persistence problem in KrtLab."`
- `"Inspect Voxline AI architecture and verify build status."`
- `"Create a new ROS2 feature branch for Atlas."`

---

## 🔒 Permission & Approval Workflow

When an operation poses high risk (e.g., production deployment, file deletions, dangerous shell commands, database schema migrations), Suren Coding Agent automatically pauses execution and displays an **Approval Prompt**:

- Shows Project Name, Action, Risk Level (LOW, MEDIUM, HIGH, CRITICAL), Affected Files/Commands, and Reason.
- Allows the user to click **Approve & Proceed** or **Reject & Cancel**.
