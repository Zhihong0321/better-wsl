# Better CLI - WSL AI Multi-Session Wrapper

A powerful WSL-based terminal wrapper designed for AI-powered coding workflows with multi-session management, network monitoring, and tool installation.

## 🌟 Features

### ✅ Multi-Session Management
- Create and manage multiple WSL terminal sessions
- Switch between sessions seamlessly
- Persistent terminal history
- Project-based workspace organization

### ✅ Network Latency Monitoring ⭐ NEW!
- **Real-time connection detection** - See which AI APIs you're connecting to
- **Latency measurement** - Track min/avg/max ping times
- **VPN performance testing** - Compare network performance with/without VPN
- **AI tool detection** - Automatically identify running AI coding tools
- **Service identification** - Recognize OpenAI, Anthropic, Google, GitHub APIs

### ✅ Essential Tools Management
- Check installation status of development tools
- Install tools directly from the UI
- Version verification
- Conflict detection (WSL vs Windows)

### ✅ Workspace Management
- Dedicated Linux workspace (`~/better-cli-workspace`)
- Import projects from Windows filesystem
- Browse and create project folders
- Disk space monitoring

### ✅ Modern UI
- Clean, responsive design
- Dark theme optimized for long coding sessions
- Smooth animations and transitions
- Real-time terminal output

## 🚀 Quick Start

### Prerequisites
- Windows 11 with WSL2 installed
- Node.js installed (both Windows and WSL)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd better-cli
   ```

2. **Install dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

### 🎯 One-Click Launch (Recommended)

Simply **double-click** one of these files:

- **`start-silent.vbs`** ⭐ - Silent launch (no terminal windows)
- **`start.bat`** - Normal launch (shows server logs)
- **`start.ps1`** - PowerShell launch (colored output)

The browser will open automatically! 🎉

**To stop:** Double-click `stop.bat`

📖 **Full launcher guide:** [LAUNCHER_GUIDE.md](./LAUNCHER_GUIDE.md)

### 🔧 Manual Start (Advanced)

<details>
<summary>Click to expand manual startup commands</summary>

1. **Start the server:**
   ```bash
   cd server
   node index.js
   ```

2. **Start the client (in a new terminal):**
   ```bash
   cd client
   npm run dev -- --host
   ```

3. **Open your browser:**
   ```
   http://localhost:5173
   ```

</details>

## 📊 Network Monitoring

### Quick Test

Test network latency to your AI APIs:

```bash
cd server
node ping-test.js
```

**Sample Output:**
```
🌐 Network Status
══════════════════════════════════════════════════
🤖 Running: aider
🔗 Active Connections: 2

📊 Latency Results:
──────────────────────────────────────────────────
✅ OpenAI API
   IP: 13.107.42.14  |  Latency: 48.7ms  |  Loss: 0%
✅ Google Gemini API
   IP: 142.250.185.10  |  Latency: 18.9ms  |  Loss: 0%
──────────────────────────────────────────────────

📈 Average Latency: 33.80ms (🚀 Excellent)
✅ Successful: 2/2
```

### VPN Performance Testing

1. **Test without VPN:**
   ```bash
   node ping-test.js
   # Note: Average Latency: 45ms
   ```

2. **Connect to VPN**

3. **Test with VPN:**
   ```bash
   node ping-test.js
   # Note: Average Latency: 180ms
   ```

4. **Compare and choose the best VPN!**

📖 **Full documentation:** [NETWORK_MONITORING.md](./NETWORK_MONITORING.md)

## 🛠️ API Endpoints

### Session Management
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Check session status
- `POST /api/sessions/:id/input` - Send input to session

### Network Monitoring ⭐ NEW!
- `GET /api/sessions/:id/network-info` - Get latency metrics and connection info

### Tools Management
- `POST /api/tools/check` - Check tool installation
- `POST /api/tools/install` - Install tool in WSL
- `POST /api/tools/uninstall` - Uninstall tool

### Workspace Management
- `GET /api/projects` - List workspace projects
- `POST /api/projects` - Create new project folder
- `POST /api/projects/import` - Import from Windows

### System Status
- `GET /api/system/status` - WSL and disk space info
- `GET /api/system/drives` - List Windows drives
- `POST /api/system/dirs` - Browse Windows directories

## 🎯 Use Cases

### AI Coding Workflow Optimization
Perfect for developers using AI coding assistants like:
- **Aider** - AI pair programming
- **Codex** - OpenAI code generation
- **Cursor** - AI-first code editor
- **GitHub Copilot** - Code completion
- **Claude Code** - Anthropic's coding assistant

**Why monitor latency?**
- Identify slow API responses affecting your flow
- Test if your VPN improves or degrades performance
- Compare different network configurations
- Ensure optimal coding experience

### Multi-Project Development
- Work on multiple projects simultaneously
- Quick project switching
- Isolated terminal environments

### Tool Installation & Management
- Centralized tool installation
- Version consistency across projects
- Easy conflict resolution

## 📁 Project Structure

```
better-cli/
├── client/                 # Vue.js frontend
│   ├── src/
│   │   ├── App.vue        # Main application
│   │   ├── components/    # UI components
│   │   └── style.css      # Global styles
│   └── package.json
├── server/                # Node.js backend
│   ├── index.js          # Express server + Socket.io
│   ├── ping-test.js      # Quick latency test utility
│   └── test-network-monitor.js  # Detailed network test
├── NETWORK_MONITORING.md  # Network monitoring docs
├── IMPLEMENTATION_SUMMARY.md  # Feature summary
└── spec.md               # Original specification
```

## 🔧 Development

### Server (Port 3000)
```bash
cd server
node index.js
```

### Client (Port 5173)
```bash
cd client
npm run dev -- --host
```

### Build for Production
```bash
cd client
npm run build
```

## 📚 Documentation

- **[LAUNCHER_GUIDE.md](./LAUNCHER_GUIDE.md)** ⭐ - One-click launcher setup and usage
- **[NETWORK_MONITORING.md](./NETWORK_MONITORING.md)** - Complete guide to network monitoring feature
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference for network monitoring
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Feature implementation details
- **[ESSENTIAL_TOOLS_FEATURE.md](./ESSENTIAL_TOOLS_FEATURE.md)** - Tool management guide
- **[spec.md](./spec.md)** - Original project specification

## 🐛 Troubleshooting

### WSL not detected
- Ensure WSL2 is installed: `wsl --version`
- Check WSL status: `wsl --list`

### Network monitoring shows no connections
- Make sure an AI tool is running in the session
- Verify network connectivity: `wsl ping google.com`
- Check that the tool is actively making API calls

### Port already in use
- Server: Change port in `server/index.js` (default: 3000)
- Client: Change port in `vite.config.js` (default: 5173)

## 🚀 Future Enhancements

### Planned Features:
- [ ] Historical latency graphs
- [ ] Continuous background monitoring
- [ ] Alert system for high latency
- [ ] Data export (CSV/JSON)
- [ ] VPN comparison dashboard
- [ ] Cloud sync for workspace
- [ ] Terminal recording/replay
- [ ] Collaborative sessions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

Built with:
- [Vue.js](https://vuejs.org/) - Frontend framework
- [Express](https://expressjs.com/) - Backend server
- [Socket.io](https://socket.io/) - Real-time communication
- [node-pty](https://github.com/microsoft/node-pty) - Terminal emulation
- [xterm.js](https://xtermjs.org/) - Terminal UI

---

**Made with ❤️ for AI-powered coding workflows**
