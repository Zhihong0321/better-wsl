# WSL Setup - Standalone Application

## Quick Start

```bash
setup.bat
```

That's it! The setup wizard will open in your browser.

## What This Does

**`setup.bat`** is a **completely independent** setup application that:

- Runs on **port 5174** (separate from main app on 5173)
- Uses **port 3001** for setup server (separate from main server on 3000)
- Works **before anything is installed**
- Installs WSL, Node.js, npm, and essential tools
- **Completely standalone** - no dependencies on the main app

## Architecture

### Dedicated Setup Components

1. **`setup.bat`** - Launcher (runs setup-only server + client)
2. **`server/setup-server.js`** - Minimal API server (port 3001)
3. **`client/setup.html`** - Setup-only entry point
4. **`client/src/SetupApp.tsx`** - Standalone setup application
5. **`client/src/Setup.tsx`** - Setup wizard component (shared)

### Ports

- **Setup Server:** `http://localhost:3001`
- **Setup Client:** `http://localhost:5174`
- **Main App:** Ports 3000 & 5173 (completely separate)

## Usage Flow

```
1. User runs: setup.bat
   ↓
2. Starts setup-server.js (port 3001)
   ↓
3. Starts vite dev server (port 5174)
   ↓
4. Opens browser: http://localhost:5174/setup.html
   ↓
5. User completes setup wizard
   ↓
6. Setup installs: WSL, Node.js, npm, tools
   ↓
7. Setup complete → Close window
   ↓
8. User runs: start.bat (main app)
```

## What Gets Installed

✓ **WSL** - Windows Subsystem for Linux  
✓ **Selected Distro** - Ubuntu, Fedora, etc.  
✓ **Sudo** - Privilege escalation  
✓ **cURL** - Download tool  
✓ **Node.js v20 LTS** - JavaScript runtime  
✓ **npm** - Package manager  
✓ **Environment** - Configured PATH and globals  

## Files

### Created Files
- `setup.bat` - Standalone launcher
- `server/setup-server.js` - Setup API server
- `client/setup.html` - Setup entry point
- `client/src/SetupApp.tsx` - Setup app wrapper
- `client/src/setup-main.tsx` - Setup entry

### Shared Files
- `client/src/Setup.tsx` - Setup wizard (used by both)
- `client/src/App.css` - Styles

## Commands

### Run Setup
```bash
setup.bat
```

### Run Main App (after setup)
```bash
start.bat
```

### Stop Everything
```bash
stop.bat
```

## Independence

The setup application is **completely independent**:

| Feature | Setup App | Main App |
|---------|-----------|----------|
| **Launcher** | `setup.bat` | `start.bat` |
| **Server** | `setup-server.js` | `index.js` |
| **Port (Server)** | 3001 | 3000 |
| **Port (Client)** | 5174 | 5173 |
| **Entry HTML** | `setup.html` | `index.html` |
| **Entry TSX** | `setup-main.tsx` | `index.tsx` |
| **Root Component** | `SetupApp.tsx` | `App.tsx` |

No overlap, no conflicts, completely separate!

## When to Use

### Use `setup.bat` when:
- ✓ First time installation
- ✓ WSL is not installed
- ✓ Node.js is not installed in WSL
- ✓ You want to reinstall tools
- ✓ You want to set up a new WSL distro

### Use `start.bat` when:
- ✓ Setup is complete
- ✓ Everything is already installed
- ✓ You want to use Better WSL

## Troubleshooting

### "Port 3001 is already in use"
Stop any running setup servers:
```powershell
# In PowerShell
Get-Process node | Where-Object {$_.Path -like "*setup-server*"} | Stop-Process
```

### "Cannot find setup.html"
Make sure you're in the project root:
```bash
cd e:\better-cli
setup.bat
```

### Setup fails at WSL check
Install WSL manually:
```powershell
# In PowerShell as Administrator
wsl --install
```
Then restart your computer and run `setup.bat` again.

## Benefits

✅ **Truly Standalone** - Works from scratch  
✅ **No Conflicts** - Separate ports from main app  
✅ **Independent** - Runs without main app  
✅ **Simple** - One command to start  
✅ **Safe** - Doesn't interfere with existing setup  

---

**Ready to go!** Just double-click `setup.bat` 🚀
