# Project Specification: WSL AI Multi‑Session Wrapper

## 1. Purpose & Motivation (WHY)
- Provide a clean, stable, user‑friendly way to run **multiple AI CLI sessions** (Gemini CLI, Claude Code CLI, Codex CLI, Droid CLI) inside **WSL** without dealing with WSL UX friction.
- Avoid the constantly breaking Windows↔WSL folder permissions. All dev work should run in an isolated, controlled environment.
- Provide a browser‑based **GUI** for managing multi‑session workflows, each tied to a project.
- Provide predictable, consistent developer experience across different CLIs.

## 2. What This Project Is (WHAT)
A **native background service** + **browser GUI** that together act as a multi‑session AI development environment.

### Core Components
- **Backend Native App (Session Host)**
  - Spawns, manages, labels, and controls WSL shell sessions.
  - Captures stdout/stderr streams.
  - Accepts stdin from GUI.
  - Exposes localhost HTTP/WebSocket API.

- **Browser GUI**
  - Displays sessions, logs, and status.
  - UI for creating sessions, sending input, viewing output.
  - UI for 1‑click installing AI CLIs and dev tools.

- **WSL Workspace**
  - Predefined workspace folders under WSL home.
  - Environment where all CLIs and tools run consistently.

---

# Feature Overview

## A. Multi‑Session Engine
- Run **multiple concurrent** AI CLI shells.
- Each session has:
  - Unique ID
  - Label (usually project name)
  - Working directory (WSL workspace)
  - Status indicator
  - Real‑time output stream
- Ability to send stdin from GUI to the session.

## B. CLI Environment
- Pre-configured installation commands for:
  - Gemini CLI
  - Claude Code CLI
  - Codex CLI
  - Droid CLI
  - Node.js / npm
  - Other common dev tools
- Version check panel that displays installed versions.
- 1‑click installation page.

## C. Workspace Management
- Standardized WSL folder structure for all projects.
- Wrapper never depends on Windows filesystem permissions.

## D. Browser GUI
- Dashboard of sessions with labels & statuses.
- Per‑session console log viewer.
- Input box to send commands.
- Visual indicator:
  - **Running / Processing**
  - **Waiting for user input**
  - **Error / Stopped**

---

# Build Plan & Milestones

## Milestone 1 — Core Session Host Foundation
**Goal:** A running native service that can spawn and manage a single WSL shell.

### Criteria to Meet
- Must spawn WSL process with stdin + stdout + stderr fully connected.
- Must expose a localhost API endpoint to create a session.
- Must push stdout data as a streaming channel (WebSocket or equivalent).
- Must store session metadata in memory.

### Dev Checkpoint
- Create session
- Read output
- Send input
- Close session cleanly

---

## Milestone 2 — Multi‑Session Support
**Goal:** Manage multiple concurrent sessions with isolated streams.

### Criteria to Meet
- Sessions must not interfere with each other.
- Each session must have its own ID and metadata.
- GUI must differentiate sessions.
- Output from one session must never leak into another.

### Dev Checkpoint
- Create 3 sessions
- Verify parallel logging
- Verify independent stdin routing

---

## Milestone 3 — Status Detection
**Goal:** Determine whether a session is Running or Waiting for user.

### Criteria to Meet
- Session must update state based on output stream.
- Must support a marker string system (e.g., `[WAITING_FOR_INPUT]`) but not depend on it entirely.
- State transitions must be reliable and visible in GUI.

### Dev Checkpoint
- Simulate a CLI that prints markers
- Confirm GUI reacts correctly

---

## Milestone 4 — Installation & Version Check Page
**Goal:** Provide controls to install dev tools inside WSL.

### Criteria to Meet
- Must support running predefined installation commands.
- Must return installation output to GUI.
- Must run version commands and display results.
- Must update UI accordingly.

### Dev Checkpoint
- Install Node.js
- Check Node.js version
- Display status as OK

---

## Milestone 5 — Workspace Model
**Goal:** Provide predictable WSL workspace layout.

### Criteria to Meet
- All project sessions must run inside a controlled WSL workspace folder.
- No dependency on `/mnt/c` or Windows filesystem.
- GUI must show folder path in WSL.

### Dev Checkpoint
- Create a project session
- Confirm working directory is under home workspace

---

## Milestone 6 — Browser GUI Shell
**Goal:** Present all session information through web UI.

### Criteria to Meet
- Must show list of sessions with status.
- Must show full console logs per session.
- Must allow sending input.
- Must reflect real-time updates via WebSocket.

### Dev Checkpoint
- Manually create session via API
- GUI displays it instantly
- Input/output verified

---

# Developer Expression & Freedom
Developers are free to choose HOW they implement:
- Backend language
- API architecture
- Web UI framework
- Internal data models
- Process handling strategies
- Error handling mechanisms

They SHOULD explore:
- Best way to stream WSL output
- Best way to manage long-running processes
- Best format for API contracts
- Best internal state management

But the following **criteria are NON‑NEGOTIABLE**:
- Full stdin/stderr support
- Multi-session isolation
- Real-time streaming output
- Accurate session status
- Clean shutdown of processes
- GUI always reflects backend truth
- Install/version panel must work on WSL fresh install
- No dependency on Windows filesystem permissions

---

# Final Notes
This specification defines the **WHAT** and **WHY** only.
Developers decide **HOW**, as long as all criteria are met.

This document is meant to guide AI coding agents and human developers toward a consistent, predictable MVP delivery.

