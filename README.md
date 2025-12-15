# Better WSL 🚀

> **For Windows users: A far better WSL to run AI Coding CLI tools natively**  
> Built for AI-powered coding workflows with intelligent multi-session management, smart paste handling, and advanced customization.

[![Windows 11](https://img.shields.io/badge/Windows-11-blue?logo=windows)](https://www.microsoft.com/windows)
[![WSL 2](https://img.shields.io/badge/WSL-2-orange?logo=linux)](https://docs.microsoft.com/windows/wsl/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.9-blue?logo=solid)](https://www.solidjs.com/)

---

## 🚀 **Quick Start - Get Your Windows 11 Ready**

### **Run `SETUP.bat` to set up Better WSL on your Windows 11**

```bash
# Simply double-click setup.bat or run in PowerShell:
.\setup.bat
```

**What happens:**
1. ✅ Launches standalone setup wizard on port 5174
2. ✅ Detects/installs WSL distros (Fedora, Ubuntu, Debian)
3. ✅ Configures development environment automatically
4. ✅ Installs Node.js, npm, and essential tools
5. ✅ Ready to use in minutes!

> **💡 First time on Windows 11?** `setup.bat` handles everything - no prerequisites needed!

---

## 🎯 Why Better WSL?

Modern AI coding tools like **Aider**, **Cursor**, **Claude**, and **GitHub Copilot** require seamless terminal interaction. Better WSL eliminates friction by providing:

✨ **Smart clipboard handling** - Paste images directly as base64  
⚡ **Configurable shortcuts** - Remap keys to match your workflow  
🎨 **Multi-session terminals** - Work on multiple projects simultaneously  
🔧 **One-click WSL setup** - Initialize your dev environment in minutes  
🌐 **Git integration** - Time-travel through commits visually  
📊 **Auto-Pilot mode** - Coordinate multiple AI agents for complex tasks

---

## 🌟 Key Features

### 🖥️ **Advanced Terminal Management**
- **Multi-session support** - Run unlimited WSL terminals in tabs
- **Smart paste inserter** - Paste images/code with preview before sending
- **Configurable keyboard shortcuts**:
  - `Shift+Enter` → New line in AI CLIs (remappable to `Ctrl+Enter` or `Alt+Enter`)
  - `Ctrl+C` → Copy text OR cancel process (your choice)
  - `Ctrl+End` → Dedicated cancel key when Ctrl+C is set to copy
- **Session activity tracking** - Visual indicators for running/waiting states
- **Auto-session detection** - Resumes last session on startup

### 🎨 **Smart Clipboard Manager**
- **Image paste support** - Drag/drop or paste images (up to 45MB)
- **Base64 auto-encoding** - Perfect for AI CLI tools
- **Text sanitization** - Prevents accidental command execution
- **Rich preview** - See images/text before sending to terminal

### 🔧 **WSL Setup Wizard**
- **One-click initialization** - Launch `setup.bat` and follow the guide
- **Cross-distro support** - Works with Fedora, Ubuntu, Debian
- **Auto package manager detection** - Uses `dnf` or `apt` automatically
- **Essential tools installer**:
  - ✅ Node.js (via fnm)
  - ✅ npm with global packages
  - ✅ sudo, curl, unzip
  - ✅ Git configuration
- **Progress tracking** - Real-time feedback during installation

### 🌐 **Git Time Travel**
- **Visual commit history** - Browse commits with one click
- **Instant checkout** - Jump to any commit in your timeline
- **Branch tracking** - See current branch and remote status
- **Quick commits** - Commit from the sidebar instantly

### 🤖 **Auto-Pilot Mode** (Experimental)
- **Dual-agent coordination** - Planner + Coder working together
- **Task delegation** - Planner instructs Coder via terminal
- **Real-time communication** - Watch agents collaborate

### ⚙️ **WSL Distribution Management**
- **List all distros** - See installed distributions and their status
- **Set default** - Change which distro launches by default
- **Terminate processes** - Stop running distributions safely
- **Update WSL** - One-click WSL version updates

### 📁 **File System Integration**
- **Import from Windows** - Browse PC drives and mount folders
- **Workspace management** - Organized `~/better-cli-workspace` structure
- **File explorer per session** - Browse files within each terminal
- **Symlink mounting** - Fast, efficient folder sharing

---

## 🚀 Quick Start

### Prerequisites

- **Windows 11** with WSL 2 enabled
- **Node.js 18+** installed on Windows
- Git (optional, for version control features)

> **Don't have WSL?** No problem! Use our setup wizard (see below).

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/better-cli.git
cd better-cli

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### 🎯 Launch (Recommended)

**Double-click** one of these files:

| File | Description | Use When |
|------|-------------|----------|
| **`start-silent.vbs`** ⭐ | Silent background launch | Daily use (no windows) |
| **`start.bat`** | Shows server logs | Debugging issues |
| **`start.ps1`** | PowerShell with colors | You prefer PowerShell |

**Browser opens automatically** at `http://localhost:5173` 🎉

**To stop:** Double-click `stop.bat`

> **Tip:** Run `create-desktop-shortcut.bat` to add a desktop icon!

---

## 🔧 First-Time WSL Setup

**Don't have WSL or essential tools?** No worries!

1. **Run the setup wizard:**
   ```bash
   setup.bat
   ```

2. **Select your WSL distribution** (or install one from Microsoft Store)

3. **Click "Start Setup"** and wait ~5 minutes

4. **Done!** Node.js, npm, curl, and sudo are now installed

📖 **Detailed guide:** [SETUP_README.md](./SETUP_README.md)

---

## ⌨️ Keyboard Shortcuts

### Terminal
- **Shift+Enter** (default) → New line in AI CLIs *(remappable in Settings)*
- **Ctrl+C** → Copy selection OR Cancel process *(configurable)*
- **Ctrl+End** (default) → Cancel/Interrupt when Ctrl+C = Copy
- **Paste** → Opens smart paste inserter with preview

### Navigation
- **Tabs** → Switch between Sessions, Clipboard, Tools, Settings
- **Ctrl+Click** → Open file browser for a session

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- [SolidJS 1.9](https://www.solidjs.com/) - Reactive UI framework
- [xterm.js](https://xtermjs.org/) - Terminal emulation
- [Lucide Icons](https://lucide.dev/) - Beautiful icon set
- [Vite](https://vitejs.dev/) - Lightning-fast build tool

**Backend:**
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express 5](https://expressjs.com/) - Web framework
- [Socket.IO](https://socket.io/) - Real-time bidirectional communication
- [node-pty](https://github.com/microsoft/node-pty) - Native terminal emulation

### Project Structure

```
better-cli/
├── client/                    # SolidJS frontend
│   ├── src/
│   │   ├── App.tsx           # Main application shell
│   │   ├── Terminal.tsx      # Terminal component with xterm.js
│   │   ├── Sidebar.tsx       # Navigation and session list
│   │   ├── ClipboardManager.tsx  # Smart paste handler
│   │   ├── Setup.tsx         # WSL initialization wizard
│   │   ├── Settings.tsx      # WSL & keyboard settings
│   │   ├── FileBrowser.tsx   # Windows drive browser
│   │   ├── AutoPilot.tsx     # Dual-agent coordination
│   │   └── components/       # Reusable UI components
│   ├── setup.html            # Standalone setup entry point
│   └── vite.config.ts        # Multi-page Vite config
│
├── server/                    # Node.js backend
│   ├── index.js              # Main Express server + Socket.IO
│   ├── setup-server.js       # Dedicated setup API (port 3001)
│   └── public/               # Static assets
│
├── setup.bat                  # Standalone WSL setup launcher
├── start-silent.vbs           # Silent application launcher
├── start.bat                  # Standard launcher with logs
├── stop.bat                   # Graceful shutdown
└── create-desktop-shortcut.bat # Desktop icon creator
```

---

## 🎯 Use Cases

### 🤖 **AI-Powered Coding**
Perfect for developers using:
- [Aider](https://aider.chat/) - AI pair programming in the terminal
- [Cursor](https://cursor.sh/) - AI-first code editor
- [Claude CLI](https://claude.ai/) - Anthropic's command-line assistant
- [GitHub Copilot CLI](https://github.com/features/copilot) - Natural language commands

**Why Better WSL?**
- ✅ Paste images directly as base64 (for Claude, Gemini, GPT-4V)
- ✅ `Shift+Enter` for multi-line prompts (no accidental sends)
- ✅ Multi-session = work on multiple projects with different AI contexts

### 💻 **Multi-Project Development**
- Run frontend dev server in Session 1
- Run backend API in Session 2  
- Run database in Session 3
- All in one organized interface

### 📦 **DevOps & Tooling**
- Manage tools via UI instead of memorizing commands
- One-click tool installation across projects
- Cross-distro support (Fedora, Ubuntu, Debian)

---

## 📚 Documentation

### Getting Started
- **[LAUNCHER_GUIDE.md](./LAUNCHER_GUIDE.md)** - One-click launcher setup
- **[SETUP_README.md](./SETUP_README.md)** - WSL initialization guide
- **[QUICK_START_SETUP.md](./QUICK_START_SETUP.md)** - From zero to coding in 10 minutes

### Features
- **[ESSENTIAL_TOOLS_FEATURE.md](./ESSENTIAL_TOOLS_FEATURE.md)** - Tool management
- **[SESSION_SUMMARY.md](./SESSION_SUMMARY.md)** - Feature overview
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical details

### Architecture
- **[NETWORK_ARCHITECTURE.md](./NETWORK_ARCHITECTURE.md)** - System design
- **[spec.md](./spec.md)** - Original specification

---

## 🐛 Troubleshooting

<details>
<summary><b>WSL not detected</b></summary>

**Symptoms:** "WSL not installed" message on startup

**Solutions:**
```bash
# Check if WSL is installed
wsl --version

# Install WSL (PowerShell as Admin)
wsl --install

# List installed distributions
wsl --list --verbose

# Set default distro (if you have multiple)
wsl --set-default Ubuntu
```

Still not working? Run `setup.bat` for guided installation.
</details>

<details>
<summary><b>Port already in use</b></summary>

**Symptoms:** "EADDRINUSE" error when starting

**Solutions:**
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <process-id> /F

# Or change ports:
# Server: Edit server/index.js (line ~2300)
# Client: Edit client/vite.config.ts
```
</details>

<details>
<summary><b>Keyboard shortcuts not working</b></summary>

**Symptoms:** `Shift+Enter` doesn't create newline

**Explanation:**  
Keyboard shortcuts are **CLI-dependent**. Most AI CLIs use `Alt+Enter` by default.

**Solution:**
1. Open **Settings** (⚙️ icon)
2. Under "Terminal Behavior" → "New line shortcut"
3. Try different combinations:
   - `Alt+Enter` (works with Gemini, Codex)
   - `Shift+Enter` (user preference)
   - `Ctrl+Enter` (alternative)

Better WSL **translates** your chosen key to `Alt+Enter` internally.
</details>

<details>
<summary><b>Images not pasting in terminal</b></summary>

**Symptoms:** Paste doesn't show preview dialog

**Cause:** You're pasting directly in terminal. Better WSL intercepts paste for safety.

**Solution:**
1. Use the **Clipboard Manager** (📋 tab)
2. Paste image there → preview appears
3. Click "Insert into Terminal"
4. Image is sent as base64

**Why?** Prevents accidental execution of pasted commands.
</details>

<details>
<summary><b>Setup wizard fails at Node.js step</b></summary>

**Symptoms:** "unzip: command not found"

**Fix:** Already patched! Update to latest version:
```bash
git pull origin main
```

The setup now auto-installs `unzip` before downloading Node.js.
</details>

---

## 🚀 Roadmap

### ✅ **Completed** (v1.0)
- [x] Multi-session terminal management
- [x] Smart clipboard with image support
- [x] Configurable keyboard shortcuts
- [x] WSL setup wizard
- [x] Git time-travel integration
- [x] Auto-session detection
- [x] File system browser
- [x] WSL distribution management

### 🎯 **Next Up** (v1.1)
- [ ] Historical latency graphs (network monitoring)
- [ ] Alert system for high latency
- [ ] Session recording/replay
- [ ] Theme customization
- [ ] Export/import workspace configs

### 🔮 **Future Ideas** (v2.0)
- [ ] Cloud sync for workspace
- [ ] Collaborative sessions (multi-user)
- [ ] Plugin system for extensions
- [ ] Docker container management
- [ ] SSH tunnel integration

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes:**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to your fork:**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Setup

```bash
# Clone and install
git clone https://github.com/your-username/better-cli.git
cd better-cli
cd server && npm install
cd ../client && npm install

# Run in development mode
# Terminal 1:
cd server && node index.js

# Terminal 2:
cd client && npm run dev
```

### Code Style
- **Frontend:** SolidJS components with TypeScript
- **Backend:** CommonJS with async/await
- **Formatting:** 2 spaces, semicolons optional

---

## 📄 License

**MIT License** - feel free to use in your projects!

---

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [SolidJS](https://www.solidjs.com/) - Reactive UI framework
- [xterm.js](https://xtermjs.org/) - Terminal emulation
- [Express](https://expressjs.com/) - Web server
- [Socket.IO](https://socket.io/) - Real-time communication
- [node-pty](https://github.com/microsoft/node-pty) - PTY bindings

Special thanks to the WSL team at Microsoft for making Linux on Windows seamless.

---

<div align="center">

**Made with ❤️ for developers who love AI-powered workflows**

[⬆ Back to Top](#better-cli-)

</div>
