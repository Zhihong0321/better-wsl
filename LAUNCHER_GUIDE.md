# 🚀 One-Click Launcher Guide

## 🎯 Quick Start Options

You now have **3 different ways** to launch Better CLI with one click!

---

## ✨ Option 1: Silent Launcher (Recommended) ⭐

**Best for**: Clean desktop experience, no command windows

### How to Use:
1. **Double-click** `start-silent.vbs`
2. Click "OK" on the starting message
3. Wait 5 seconds
4. Browser opens automatically!
5. Click "OK" on the success message

### Features:
✅ No command windows  
✅ Runs silently in background  
✅ Auto-opens browser  
✅ Clean and simple  

### To Stop:
- Double-click `stop.bat`

---

## 📺 Option 2: Normal Launcher

**Best for**: Seeing server logs, debugging

### How to Use:
1. **Double-click** `start.bat`
2. Watch the startup process
3. Browser opens automatically
4. See server logs in command windows

### Features:
✅ See real-time logs  
✅ Two terminal windows (Server + Client)  
✅ Easy to monitor  
✅ Good for development  

### To Stop:
- Close both terminal windows, OR
- Double-click `stop.bat`

---

## 💪 Option 3: PowerShell Launcher

**Best for**: PowerShell users, colored output

### How to Use:
1. **Right-click** `start.ps1`
2. Select "Run with PowerShell"
3. If prompted, allow execution
4. Browser opens automatically

### Features:
✅ Colored output  
✅ PowerShell-native  
✅ Professional look  

### First Time Setup:
If you get an execution policy error:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### To Stop:
- Close PowerShell windows, OR
- Double-click `stop.bat`

---

## 🖱️ Create Desktop Shortcut

### For Silent Launcher (Recommended):

1. **Right-click** on `start-silent.vbs`
2. Select **"Create shortcut"**
3. Drag the shortcut to your Desktop
4. **Right-click** the shortcut → **Properties**
5. Click **"Change Icon"**
6. Browse to a nice icon (optional)
7. Click **OK**

Now you can **double-click the desktop icon** to start Better CLI! 🎉

### For Batch File:

Same steps, but use `start.bat` instead.

---

## 🎨 Customize Startup

### Change Wait Time

Edit `start-silent.vbs` line 20:
```vbscript
WScript.Sleep 5000  ' Change 5000 (5 seconds) to your preference
```

### Disable Auto-Browser

Comment out in any script:
```batch
REM start http://localhost:5173
```

### Kill Existing Processes on Start

Uncomment in `start.bat` line 7:
```batch
taskkill /F /IM node.exe >nul 2>&1
```

---

## 📂 File Overview

| File | Type | Purpose | Shows Windows? |
|------|------|---------|----------------|
| `start-silent.vbs` | VBScript | Silent launcher | ❌ No |
| `start.bat` | Batch | Normal launcher | ✅ Yes |
| `start.ps1` | PowerShell | PowerShell launcher | ✅ Yes |
| `stop.bat` | Batch | Stop all services | ✅ Yes |

---

## 🔧 Troubleshooting

### "Windows protected your PC"
- Click **"More info"**
- Click **"Run anyway"**
- This is normal for VBScript files

### Scripts don't work
1. Make sure you're in the `better-cli` folder
2. Check that `node` is installed: `node --version`
3. Check that dependencies are installed:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

### Browser opens but shows error
- Wait a few more seconds (increase sleep time)
- Check if ports 3000 and 5173 are free:
  ```bash
  netstat -ano | findstr "3000"
  netstat -ano | findstr "5173"
  ```

### Services won't stop
- Open Task Manager (Ctrl+Shift+Esc)
- Find and end all `node.exe` processes
- Or run `stop.bat`

---

## ⚡ Advanced: Startup on Windows Boot

### Option 1: Startup Folder
1. Press `Win + R`
2. Type `shell:startup` and press Enter
3. Create a shortcut to `start-silent.vbs` in this folder
4. Better CLI will start automatically when Windows starts!

### Option 2: Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When I log on"
4. Action: Start Program
5. Program: `wscript.exe`
6. Arguments: `"E:\better-cli\start-silent.vbs"`

---

## 🎯 Recommended Setup

For the **best experience**:

1. ✅ Use `start-silent.vbs` for daily use
2. ✅ Create desktop shortcut
3. ✅ Keep `stop.bat` handy
4. ✅ Use `start.bat` when debugging

---

## 🆘 Quick Help

### Starting Better CLI
```
Double-click: start-silent.vbs
```

### Stopping Better CLI
```
Double-click: stop.bat
```

### Check if Running
```
Open Task Manager → Look for node.exe processes
```

### Fresh Start
```
1. Double-click: stop.bat
2. Wait 2 seconds
3. Double-click: start-silent.vbs
```

---

## 🎉 You're All Set!

Just **double-click** any launcher file and you're ready to go!

**Recommended**: Put `start-silent.vbs` on your desktop for one-click access! 🚀

---

## 📝 What Happens When You Launch?

```
1. Start Backend Server (port 3000)
   ↓
2. Wait 2 seconds
   ↓
3. Start Frontend Client (port 5173)
   ↓
4. Wait 5 seconds
   ↓
5. Open Browser → http://localhost:5173
   ↓
6. Better CLI Ready! 🎉
```

---

**Need help?** Check the main [README.md](./README.md) or [NETWORK_MONITORING.md](./NETWORK_MONITORING.md)
