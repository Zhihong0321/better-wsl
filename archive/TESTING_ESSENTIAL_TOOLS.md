# Testing the Essential Tools Feature

## Quick Test Steps

### 1. Verify Frontend (Already Running)
Your client is already running on `http://localhost:5173`

1. Navigate to the **Tools** page
2. You should see two sections:
   - **Essential Tools** (green accent, at top)
     - Docker Engine
     - PostgreSQL  
     - Railway CLI
     - GitHub CLI
   - **System Tools** (blue accent, below)
     - Node.js, Python, Rust, Git, AI CLIs

### 2. Test Tool Status Checking
1. Click the **REFRESH** button at the top
2. Watch the status indicators update:
   - ✓ WSL (version) = Installed in WSL (green)
   - ⚠ Windows Only = Installed in Windows (yellow)
   - ⚠ Conflict = Installed in both (red)
   - Not Installed = Not found (gray)

### 3. Test Authentication Check
For Railway CLI and GitHub CLI:

1. If you have them installed, you should see an auth status badge
2. Green badge = ✓ Authenticated (with account name)
3. Yellow badge = ⚠ Not Logged In

### 4. Test Login Flow
1. Find Railway CLI or GitHub CLI card
2. Click the **LOGIN** button
3. The command should be injected into your active terminal
4. Follow the prompts in the terminal
5. After completing login, click the **Check** button (●) to refresh status
6. Auth badge should update to green with your account name

### 5. Test Installation (Optional)
Pick a tool you don't have (e.g., Railway CLI):

1. Click **INSTALL** button
2. Installation command is sent to terminal
3. Watch installation progress in terminal
4. After installation, click **Check** button (●)
5. Status should update to ✓ WSL

### 6. Visual Features to Verify
- **Hover effects**: Cards should highlight when you hover
- **Button animations**: Buttons should change color on hover
- **Auth badge colors**:
  - Green background (rgba(74, 222, 128, 0.1)) for authenticated
  - Yellow background (rgba(250, 204, 21, 0.1)) for not logged in
- **Smooth transitions**: All color changes should be smooth

## Expected API Endpoints (Server Auto-Reloaded)

Your server should now have these endpoints:

### Existing
- `POST /api/tools/check` - Check if tool is installed
- `POST /api/tools/uninstall` - Uninstall a tool

### New
- `POST /api/tools/auth-status` - Check authentication status
  ```json
  // Request
  { "toolId": "railway" }
  
  // Response
  {
    "authenticated": true,
    "account": "your-railway-user@email.com",
    "error": null
  }
  ```

## Try These Commands in Terminal

### Railway CLI
```bash
# Check if installed
which railway

# Install (if not installed)
npm install -g @railway/cli

# Check auth status
railway whoami

# Login
railway login
```

### GitHub CLI
```bash
# Check if installed
which gh

# Check auth status
gh auth status

# Login
gh auth login
```

### PostgreSQL
```bash
# Check if installed
psql --version

# Install
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# Start service
sudo service postgresql start

# Connect
sudo -u postgres psql
```

### Docker Engine
```bash
# Check if installed
docker --version

# Check if daemon is running
docker ps

# If not running
sudo service docker start
```

## Troubleshooting

### Auth Status Not Showing
- Make sure the tool is installed first
- Click the **REFRESH** button
- Check browser console for errors

### Server Errors
Your server is running on port 3000. Check the terminal window for any errors related to:
- `/api/tools/auth-status` endpoint
- WSL command execution

### Frontend Not Updating
- Vite should hot-reload automatically
- If not, refresh the browser (F5)
- Check browser console for errors

## Success Criteria

✅ Essential Tools section appears with green accent
✅ All 4 essential tools show up (Docker, PostgreSQL, Railway, GitHub)
✅ Auth status badges appear for Railway and GitHub CLI
✅ Login button works and injects commands
✅ All hover effects and animations work
✅ Status updates when clicking refresh or check buttons

---

If everything works, you now have a complete WSL development infrastructure management tool! 🎉
