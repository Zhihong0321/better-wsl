## Workspace Profiles for AI CLIs (Approved)

### Goal
Provide one-click, pre-optimized environments for AI CLI tools (Claude, Codex, Gemini, and user-defined) so sessions start cleanly without PATH/npm/node conflicts.

### Core Behavior
- **Profile selection:** Choose a profile when creating a session; each profile pins a Node version (via fnm), cleans PATH (no `/mnt` shadows), sets npm prefix to `$HOME/.npm-global`, and ensures the CLI binary is on PATH.
- **Auth & connectivity preflight:** Run tool-specific checks (version, auth status) plus DNS/HTTPS probes to the tool’s API endpoint; prompt browser login if needed.
- **Filesystem sanity:** Quick temp file create/read/rename/copy/delete inside the project workspace to confirm permissions and mounts are healthy.
- **Verification report:** UI surface shows pass/fail per check with targeted auto-fix actions (e.g., reinstall CLI, reset PATH, re-authenticate, switch Node version).

### Customization
- **User profiles:** Duplicate/edit profiles to change Node version, inject custom preflight commands, or add environment variables/tokens.
- **Project defaults:** Allow a project-level default profile so new sessions auto-apply the right toolchain.

### Concurrency
- Multiple sessions can run different Node versions concurrently via `fnm use` per session; avoid global apt/Windows Node to prevent collisions.

### Guardrails
- Detect Windows-vs-WSL duplicates, PATH pollution, and unsafe operations (e.g., installs from `/mnt/*`); surface guided remediation before launching the tool.

## Instruction Manager (Simple, Approved)

### Goal
Let users keep a few plain-language rule blocks (personal coding rules/reminders) and paste them into any AI CLI session with one shortcut.

### Core Behavior
- **Tiny preset list:** A small set of named rule blocks stored locally (e.g., `~/.better-cli/instructions.json`).
- **Quick insert:** Shortcut opens a picker; selecting a preset pastes it into the active terminal as markdown (e.g., fenced block) and sends it to the AI CLI.
- **Obvious UX:** Minimal UI—list, select, paste. No nesting, templating, or complex scopes.
- **Size/safety:** Hard limit per block; warn if too large; dedupe to avoid double-inserting the same preset in one session.

### Optional Niceties
- **Per-profile default:** A workspace profile can auto-suggest a default preset (e.g., “security rules” for Claude profile).
- **Edit in-place:** Simple text editor with preview and last-updated timestamp; no versioning or sync in v1.

## Auto-Pilot Dual-Agent Mode (Approved)

### Goal
Enable two CLI agents to collaborate automatically: Agent1 (Instructor/Tester) and Agent2 (Coder), with minimal tagging and routing.

### Core Behavior
- **Session pairing:** Maintain two terminals labeled Agent1 and Agent2; tags `<agent1>` / `<agent2>` in output route messages between them.
- **Instruction flow:** Agent1 sends tasks/checkpoints to Agent2; Agent2 codes and replies with status; Agent1 runs tests (curl/API/unit commands) and sends pass/fail back.
- **Command chain syntax:** Inline tags, e.g., Agent1: `<agent2> Build POST /api/foo returning 201 {...}`; Agent2: `<agent1> Deployed at http://localhost:3000, run curl ...`.
- **Tests:** Predefined test commands Agent1 can run automatically after Agent2 replies; results relayed via tag back to Agent2.
- **UI cues:** Small panel showing last message per agent and current status (waiting/running tests/passed/failed), plus a unified conversation view (Agent1 ⟷ Agent2) with an “intervene” input to inject guidance.
- **Safety:** Rate-limit relays, strip obviously dangerous commands, and log exchanges per session.

## Local Services Dashboard (Approved)

### Goal
Provide a simple, Railway-like local dashboard for WSL dev: see running dev servers, Postgres status, manage env vars, and trigger test deploy scripts—without forwarding to Windows.

### Core Behavior
- **Service list:** Detect and show running dev servers (port/PID/cmd) and Postgres status (running, port, log tail).
- **Controls:** Start/stop predefined project scripts (e.g., dev server, migrations, seeds) with one click; show live stdout/stderr.
- **Env vars:** Lightweight editor for per-project env (stored locally), with apply/reload buttons.
- **Health checks:** One-click readiness probes (curl /health or custom) with pass/fail indicators.
- **Git connect (light):** Show remote, branch, and basic pull/branch switch—no heavy CI/CD.

### Scope Limits
- No remote deploy; strictly local test/deploy.
- Minimal UI—status list, log pane, env editor, and buttons for scripts/checks.
