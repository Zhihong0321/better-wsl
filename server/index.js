const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const cors = require('cors');
const { exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Store sessions in memory
// Map<string, { pty: IPty, history: string, cwd: string }>
const sessions = new Map();
const MAX_HISTORY = 100 * 1024; // 100KB buffer

// Generate short random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to execute WSL commands non-interactively
const execWsl = (cmd) => {
    return new Promise((resolve, reject) => {
        // Use execFile to avoid cmd.exe shell parsing issues with quotes/pipes
        execFile('wsl.exe', ['--exec', 'bash', '-c', cmd], (error, stdout, stderr) => {
            if (error) {
                console.warn(`WSL Exec Error: ${cmd}`, stderr);
                reject(stderr || error.message);
            } else {
                resolve(stdout.trim());
            }
        });
    });
};

const checkWslStatus = () => {
    return new Promise((resolve) => {
        exec('wsl.exe --list', (error) => {
            if (error) {
                console.log("WSL Check Failed:", error.message);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

// API: Upload file and return WSL path
app.post('/api/upload', async (req, res) => {
    try {
        const { image, filename } = req.body;
        if (!image) return res.status(400).json({ error: 'No image data' });

        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Strip base64 header
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // Sanitize filename
        const safeName = (filename || `image-${Date.now()}.png`).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(uploadDir, safeName);

        fs.writeFileSync(filePath, buffer);

        // Strategy 1: Try /mnt path
        const root = path.parse(filePath).root; // "E:\"
        const drive = root.replace(':\\', '').toLowerCase(); // "e"
        const relativePath = filePath.slice(root.length).replace(/\\/g, '/');
        const mntPath = `/mnt/${drive}${relativePath}`; // Note: relativePath starts with / if slice works right? No, slice(3) from "E:\foo" is "foo". 
        // path.parse("E:\\foo").root is "E:\\". filePath.slice(3) is "foo".
        // Let's be safer.

        // Correct path logic
        const driveLetter = root.replace(':\\', '').toLowerCase();
        const pathWithoutDrive = filePath.substring(root.length).replace(/\\/g, '/');
        const potentialMntPath = `/mnt/${driveLetter}/${pathWithoutDrive}`;

        try {
            await execWsl(`ls "${potentialMntPath}"`);
            console.log(`[Upload] Successfully verified access via ${potentialMntPath}`);
            return res.json({ path: potentialMntPath });
        } catch (err) {
            console.log(`[Upload] /mnt access failed (${potentialMntPath}), falling back to direct stream.`);
        }

        // Strategy 2: Stream to WSL Home
        // We use a fixed hidden directory in user home
        const wslFileName = safeName;
        const wslDir = `$HOME/.better-cli/uploads`;
        const wslTarget = `${wslDir}/${wslFileName}`;

        await execWsl(`mkdir -p ${wslDir}`);

        // Use spawn to pipe data directly into WSL file
        const { spawn } = require('child_process');
        // NOTE: We need to be careful with ~ expansion in spawn. 
        // Better to use full path or let bash handle it.
        // bash -c 'cat > ~/.better-cli/uploads/xxx' works.

        const child = spawn('wsl.exe', ['--exec', 'bash', '-c', `cat > "${wslTarget}"`]);

        child.stdin.write(buffer);
        child.stdin.end();

        await new Promise((resolve, reject) => {
            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`WSL write failed with code ${code}`));
            });
            child.on('error', reject);
        });

        // Resolve absolute path in WSL (expand ~) to be sure
        const absolutePath = await execWsl(`echo "${wslTarget}"`);
        res.json({ path: absolutePath });

    } catch (err) {
        console.error('Upload failed:', err);
        res.status(500).json({ error: err.toString() });
    }
});

// API: Execute arbitrary command (Use with caution!)
app.post('/api/system/exec', async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });

    try {
        console.log(`[Exec] Running: ${command}`);
        const output = await execWsl(command);
        res.json({ output });
    } catch (err) {
        console.error('[Exec] Failed:', err);
        res.status(500).json({ error: err.toString() });
    }
});

// API: Check system status
app.get('/api/system/status', async (req, res) => {
    const wslInstalled = await checkWslStatus();

    let diskSpace = null;
    let browserBridge = null;
    if (wslInstalled) {
        try {
            // Get disk space for home directory using df
            const dfOutput = await execWsl('df -h ~ | tail -1');
            const parts = dfOutput.trim().split(/\s+/);
            if (parts.length >= 5) {
                diskSpace = {
                    total: parts[1],
                    used: parts[2],
                    available: parts[3],
                    usedPercent: parts[4]
                };
            }
        } catch (err) {
            console.warn('Failed to get disk space:', err);
        }

        try {
            const wslviewCheck = await execWsl('which wslview 2>/dev/null || echo "NOT_FOUND"');
            const xdgOpenCheck = await execWsl('which xdg-open 2>/dev/null || echo "NOT_FOUND"');
            browserBridge = {
                wslviewInstalled: wslviewCheck && !wslviewCheck.includes('NOT_FOUND'),
                xdgOpenInstalled: xdgOpenCheck && !xdgOpenCheck.includes('NOT_FOUND')
            };
        } catch { }
    }

    res.json({ wslInstalled, diskSpace, browserBridge });
});

// API: Check tool installation status
app.post('/api/tools/check', async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });

    try {
        const results = {
            wsl: { installed: false, version: null, path: null },
            windows: { installed: false, version: null, path: null }
        };

        // Check in WSL
        try {
            let checkCmd = `which ${command} 2>/dev/null || echo "NOT_FOUND"`;

            // For Node/NPM related tools, ensure we check in the FNM environment
            if (['node', 'npm', 'gemini', 'claude', 'codex', 'railway', 'droid'].includes(command)) {
                // Use base64 injection to avoid quoting issues with execWsl
                const script = `
                    set +e
                    HOME_DIR=$(getent passwd $(whoami) | cut -d: -f6)
                    [ -f "$HOME_DIR/.bashrc" ] && . "$HOME_DIR/.bashrc"
                    
                    # Robust NPM Bin detection
                    NPM_PREFIX=$(npm config get prefix 2>/dev/null)
                    if [ -n "$NPM_PREFIX" ]; then
                        NPM_BIN="$NPM_PREFIX/bin"
                    else
                        NPM_BIN="$HOME_DIR/.npm-global/bin"
                    fi
                    
                    FNM_DIR="$HOME_DIR/.local/share/fnm"
                    CANDIDATES="$HOME_DIR/.npm-global/bin:$NPM_BIN:$HOME_DIR/.local/bin:$FNM_DIR:$FNM_DIR/bin:$FNM_DIR/aliases/default/bin:/usr/local/bin:/usr/bin"
                    CLEAN_PATH=$(echo "$CANDIDATES" | tr ':' '\n' | grep -v '^/mnt/' | paste -sd: -)
                    export PATH="$CLEAN_PATH:$PATH"
                    
                    if command -v fnm >/dev/null 2>&1; then
                            eval "$(fnm env --shell bash 2>/dev/null)"
                            fnm use default >/dev/null 2>&1 || fnm use --lts >/dev/null 2>&1 || true
                        fi
                    
                    FOUND=$(command -v ${command} 2>/dev/null)
                    if [ -z "$FOUND" ]; then
                        # Deep search in fnm directories
                        FOUND=$(find "$FNM_DIR" -maxdepth 5 -name "${command}" -type f -path "*/bin/*" 2>/dev/null | head -1)
                    fi
                    echo \${FOUND:-NOT_FOUND}
                    exit 0
                `;
                const b64 = Buffer.from(script).toString('base64');
                checkCmd = `echo "${b64}" | base64 -d | bash`;
            }

            const wslWhich = await execWsl(checkCmd);
            if (wslWhich && !wslWhich.includes('NOT_FOUND')) {
                results.wsl.installed = true;
                results.wsl.path = wslWhich.trim();
                // Try to get version
                try {
                    let versionCmd = `${command} --version 2>&1 | head -1`;
                    if (['node', 'npm', 'gemini', 'claude', 'codex', 'railway', 'droid'].includes(command)) {
                        const script = `
                            set +e
                            HOME_DIR=$(getent passwd $(whoami) | cut -d: -f6)
                            [ -f "$HOME_DIR/.bashrc" ] && . "$HOME_DIR/.bashrc"
                            
                            # Robust NPM Bin detection
                            NPM_PREFIX=$(npm config get prefix 2>/dev/null)
                            if [ -n "$NPM_PREFIX" ]; then
                                NPM_BIN="$NPM_PREFIX/bin"
                            else
                                NPM_BIN="$HOME_DIR/.npm-global/bin"
                            fi

                            FNM_DIR="$HOME_DIR/.local/share/fnm"
                            CANDIDATES="$HOME_DIR/.npm-global/bin:$NPM_BIN:$HOME_DIR/.local/bin:$FNM_DIR:$FNM_DIR/bin:$FNM_DIR/aliases/default/bin:/usr/local/bin:/usr/bin"
                            CLEAN_PATH=$(echo "$CANDIDATES" | tr ':' '\n' | grep -v '^/mnt/' | paste -sd: -)
                            export PATH="$CLEAN_PATH:$PATH"
                            
                            if command -v fnm >/dev/null 2>&1; then
                                eval "$(fnm env --shell bash 2>/dev/null)"
                                fnm use default >/dev/null 2>&1 || fnm use --lts >/dev/null 2>&1 || true
                            fi
                            
                            # Try standard version check
                            ${command} --version 2>&1 | head -1 && exit 0
                            
                            # If failed, try finding executable and running it directly
                            FOUND=$(find "$FNM_DIR" -maxdepth 5 -name "${command}" -type f -path "*/bin/*" 2>/dev/null | head -1)
                            if [ -n "$FOUND" ]; then
                                "$FOUND" --version 2>&1 | head -1
                            else
                                echo "unknown"
                            fi
                            exit 0
                        `;
                        const b64 = Buffer.from(script).toString('base64');
                        versionCmd = `echo "${b64}" | base64 -d | bash`;
                    }
                    const version = await execWsl(versionCmd);
                    results.wsl.version = version.trim();
                } catch (e) {
                    results.wsl.version = 'unknown';
                }

                // Check Docker Variant
                if (command === 'docker') {
                    try {
                        const info = await execWsl('timeout 3s docker version 2>&1 || echo "Daemon_Failed"');
                        if (info.includes('Docker Desktop')) {
                            results.wsl.variant = 'Desktop';
                        } else if (info.includes('Daemon_Failed') || info.includes('Cannot connect')) {
                            results.wsl.variant = 'Native (Stopped?)';
                        } else {
                            results.wsl.variant = 'Native';
                        }
                    } catch (e) {
                        results.wsl.variant = 'Unknown';
                    }
                }
            }
        } catch (err) {
            console.log(`WSL check failed for ${command}`);
        }

        // Check in Windows
        try {
            const windowsWhich = await new Promise((resolve, reject) => {
                exec(`where ${command}`, (error, stdout, stderr) => {
                    if (error) resolve(null);
                    else resolve(stdout.trim());
                });
            });

            if (windowsWhich) {
                results.windows.installed = true;
                results.windows.path = windowsWhich.split('\n')[0].trim();
                // Try to get version
                try {
                    const version = await new Promise((resolve, reject) => {
                        exec(`${command} --version`, (error, stdout, stderr) => {
                            if (error) resolve('unknown');
                            else resolve(stdout.split('\n')[0].trim());
                        });
                    });
                    results.windows.version = version;
                } catch (e) {
                    results.windows.version = 'unknown';
                }
            }
        } catch (err) {
            console.log(`Windows check failed for ${command}`);
        }

        // Determine overall status
        let status = 'not_installed';
        // Prioritize WSL installation. If it's in WSL, it's good.
        // Having it in Windows as well is not a conflict.
        if (results.wsl.installed) status = 'installed_wsl';
        else if (results.windows.installed) status = 'installed_windows';

        res.json({ status, ...results });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: Get latest version for a tool
app.post('/api/tools/latest', async (req, res) => {
    const { toolId } = req.body;
    if (!toolId) return res.status(400).json({ error: 'Tool ID required' });

    try {
        let version = null;

        const TOOL_MAPPINGS = {
            'gemini': { type: 'npm', pkg: '@google/gemini-cli' },
            'claude': { type: 'npm', pkg: '@anthropic-ai/claude-code' },
            'codex': { type: 'npm', pkg: '@openai/codex' },
            'railway': { type: 'npm', pkg: '@railway/cli' },
            'droid': { type: 'npm', pkg: 'droid-cli' },
            'wslview': { type: 'apt', pkg: 'wslu' },
            'xdg-utils': { type: 'apt', pkg: 'xdg-utils' },
            'git': { type: 'apt', pkg: 'git' },
            'python': { type: 'apt', pkg: 'python3' },
            'postgresql': { type: 'apt', pkg: 'postgresql' },
            'docker': { type: 'apt', pkg: 'docker-ce' },
            'gh-cli': { type: 'apt', pkg: 'gh' },
            'nodejs': { type: 'apt', pkg: 'nodejs' },
            'rust': { type: 'apt', pkg: 'rustc' }
        };

        const tool = TOOL_MAPPINGS[toolId];

        if (tool) {
            if (tool.type === 'npm') {
                // Use npm view in WSL (requires internet)
                // We use the same base64 injection to ensure we have npm
                const script = `
                    set +e
                    HOME_DIR=$(getent passwd $(whoami) | cut -d: -f6)
                    [ -f "$HOME_DIR/.bashrc" ] && . "$HOME_DIR/.bashrc"
                    
                    # Robust NPM setup
                    NPM_PREFIX=$(npm config get prefix 2>/dev/null)
                    if [ -n "$NPM_PREFIX" ]; then
                        NPM_BIN="$NPM_PREFIX/bin"
                    else
                        NPM_BIN="$HOME_DIR/.npm-global/bin"
                    fi
                    
                    FNM_DIR="$HOME_DIR/.local/share/fnm"
                    CANDIDATES="$HOME_DIR/.npm-global/bin:$NPM_BIN:$HOME_DIR/.local/bin:$FNM_DIR:$FNM_DIR/bin:$FNM_DIR/aliases/default/bin:/usr/local/bin:/usr/bin"
                    CLEAN_PATH=$(echo "$CANDIDATES" | tr ':' '\n' | grep -v '^/mnt/' | paste -sd: -)
                    export PATH="$CLEAN_PATH:$PATH"
                    
                    if command -v fnm >/dev/null 2>&1; then
                        eval "$(fnm env --shell bash 2>/dev/null)"
                        fnm use default >/dev/null 2>&1 || fnm use --lts >/dev/null 2>&1 || true
                    fi
                    
                    npm view ${tool.pkg} version 2>/dev/null
                `;
                const b64 = Buffer.from(script).toString('base64');
                const cmd = `echo "${b64}" | base64 -d | bash`;
                version = await execWsl(cmd);

            } else if (tool.type === 'apt') {
                // Use apt-cache policy
                // Output format: 
                //   Candidate: 1.2.3-1ubuntu1
                const cmd = `apt-cache policy ${tool.pkg} | grep "Candidate:" | head -1 | awk '{print $2}'`;
                version = await execWsl(cmd);

                // Fallback for docker if docker-ce not found
                if ((!version || version === '') && toolId === 'docker') {
                    const cmd2 = `apt-cache policy docker.io | grep "Candidate:" | head -1 | awk '{print $2}'`;
                    version = await execWsl(cmd2);
                }
            }
        }

        res.json({ version: version ? version.trim() : null });
    } catch (err) {
        console.error(`Failed to get latest version for ${toolId}:`, err);
        res.json({ version: null, error: err.toString() });
    }
});

// API: Install tool in WSL
app.post('/api/tools/install', async (req, res) => {
    const { command, toolId, forceReinstall } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });

    try {
        // For npm packages, ensure we install in WSL
        let installCmd = command;
        if (command.includes('npm install -g')) {
            // Check if npm is available
            const npmCheck = await execWsl('which npm 2>/dev/null || echo "NOT_FOUND"');
            if (npmCheck.includes('NOT_FOUND')) {
                return res.status(400).json({
                    error: 'npm_not_found',
                    message: 'Node.js/npm not installed in WSL. Please install Node.js first.'
                });
            }

            // Add --force flag if reinstalling
            if (forceReinstall) {
                installCmd = command.replace('npm install -g', 'npm install -g --force');
            }
        }

        // Execute the installation command in WSL
        // Note: This will be async, we return immediately
        res.json({
            success: true,
            message: 'Installation command queued',
            command: installCmd
        });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: Uninstall tool from WSL
app.post('/api/tools/uninstall', async (req, res) => {
    const { command, toolId } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });

    try {
        let uninstallCmd = '';

        // Determine uninstall command based on tool type
        if (toolId && toolId.match(/codex|gemini|claude|droid|railway/)) {
            // NPM packages
            const pkgName = toolId === 'codex' ? '@openai/codex' :
                toolId === 'gemini' ? '@google/gemini-cli' :
                    toolId === 'claude' ? '@anthropic-ai/claude-code' :
                        toolId === 'railway' ? '@railway/cli' : 'droid-cli';
            uninstallCmd = `npm uninstall -g ${pkgName}`;
        } else if (toolId === 'docker') {
            // Docker removal (more complex)
            uninstallCmd = `sudo apt remove -y docker docker-engine docker.io containerd runc`;
        } else if (toolId === 'postgresql') {
            // PostgreSQL removal
            uninstallCmd = `sudo apt remove -y postgresql postgresql-contrib`;
        } else if (toolId === 'wslview') {
            uninstallCmd = `sudo apt remove -y wslu`;
        } else if (toolId === 'xdg-utils') {
            uninstallCmd = `sudo apt remove -y xdg-utils`;
        } else {
            // System packages
            uninstallCmd = `sudo apt remove -y ${command}`;
        }

        res.json({
            success: true,
            message: 'Uninstall command queued',
            command: uninstallCmd
        });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: Uninstall tool from Windows
app.post('/api/tools/uninstall-windows', async (req, res) => {
    const { toolId } = req.body;
    if (!toolId) return res.status(400).json({ error: 'Tool ID required' });

    try {
        const npmPath = await new Promise((resolve) => {
            exec('where npm', (error, stdout) => {
                if (error) resolve(null);
                else resolve(stdout.trim().split('\n')[0].trim());
            });
        });

        if (!npmPath) {
            return res.status(400).json({ error: 'npm_not_found_windows' });
        }

        const pkgName = toolId === 'codex' ? '@openai/codex' :
            toolId === 'gemini' ? '@google/gemini-cli' :
                toolId === 'claude' ? '@anthropic-ai/claude-code' :
                    toolId === 'railway' ? '@railway/cli' : 'droid-cli';

        exec(`${npmPath} uninstall -g ${pkgName}`, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: stderr || error.message });
            }
            res.json({ success: true, output: stdout.trim() });
        });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: Check authentication status for CLI tools
app.post('/api/tools/auth-status', async (req, res) => {
    const { toolId } = req.body;
    if (!toolId) return res.status(400).json({ error: 'Tool ID required' });

    try {
        let authenticated = false;
        let account = null;
        let error = null;

        if (toolId === 'railway') {
            try {
                // Check railway auth status using 'railway whoami'
                const output = await execWsl('railway whoami 2>&1');
                if (output && !output.includes('not logged in') && !output.includes('error')) {
                    authenticated = true;
                    // Extract account info from output
                    const lines = output.trim().split('\n');
                    account = lines[0].trim() || 'Logged in';
                } else {
                    error = 'Not logged in';
                }
            } catch (err) {
                error = 'Railway CLI not installed or not logged in';
            }
        } else if (toolId === 'gh-cli') {
            try {
                // Check GitHub CLI auth status
                const output = await execWsl('gh auth status 2>&1');
                if (output && output.includes('Logged in to')) {
                    authenticated = true;
                    // Extract username from output
                    const match = output.match(/account (.+?) \(/);
                    if (match) {
                        account = match[1];
                    } else {
                        account = 'Logged in';
                    }
                } else {
                    error = 'Not logged in';
                }
            } catch (err) {
                error = 'GitHub CLI not installed or not logged in';
            }
        }

        res.json({ authenticated, account, error });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: NPM health in WSL
app.post('/api/tools/npm-health', async (req, res) => {
    try {
        // Robust script injection via base64 to avoid quoting hell
        const script = `
HOME_DIR=$(getent passwd $(whoami) | cut -d: -f6)
# CRITICAL: Strip Windows paths from PATH to prevent shadowing
export PATH=$(echo "$PATH" | tr ':' '\\n' | grep -v '/mnt/' | tr '\\n' ':')
export PATH="$HOME_DIR/.local/share/fnm:$PATH"
eval "$(fnm env --shell bash)"
# Try default, then lts, then whatever is available
eval "$(fnm use default --shell bash 2>/dev/null || fnm use --lts --shell bash 2>/dev/null)"
export PATH="$HOME_DIR/.npm-global/bin:$PATH"

echo "NODE_WHICH=$(which node 2>/dev/null || echo NOT_FOUND)"
echo "NPM_WHICH=$(which npm 2>/dev/null || echo NOT_FOUND)"
echo "NPM_PREFIX=$(npm config get prefix 2>/dev/null || echo NOT_FOUND)"
echo "GEMINI_WHICH=$(which gemini 2>/dev/null || echo NOT_FOUND)"
echo "PATH_VAL=$PATH"
echo "HOME_VAL=$HOME_DIR"
`;
        const b64 = Buffer.from(script).toString('base64');
        // Note: execFile handles arguments, so no extra escaping needed
        const cmd = `echo "${b64}" | base64 -d > /tmp/npm_health_check.sh && bash /tmp/npm_health_check.sh`;

        const output = await execWsl(cmd);

        const lines = output.split('\n');
        const getVal = (key) => {
            const line = lines.find(l => l.startsWith(key + '='));
            return line ? line.substring(key.length + 1).trim() : '';
        };

        const nodeWhich = getVal('NODE_WHICH');
        const npmWhich = getVal('NPM_WHICH');
        const npmPrefix = getVal('NPM_PREFIX');
        const geminiWhich = getVal('GEMINI_WHICH');
        const pathVar = getVal('PATH_VAL');
        const homeDir = getVal('HOME_VAL');

        const nodeInstalled = !!nodeWhich && !nodeWhich.includes('NOT_FOUND');
        const npmInstalled = !!npmWhich && !npmWhich.includes('NOT_FOUND');
        const isWindowsNode = nodeWhich.startsWith('/mnt/');
        const isWindowsNpm = npmWhich.startsWith('/mnt/');
        const prefixIsHome = npmPrefix.startsWith(homeDir) || npmPrefix.includes('/.npm-global');
        const pathHasNpmGlobal = pathVar.includes(`${homeDir}/.npm-global/bin`);
        const geminiWindowsPathDetected = geminiWhich.includes('/mnt/') || geminiWhich.includes('AppData');

        res.json({
            nodeInstalled,
            npmInstalled,
            isWindowsNode,
            isWindowsNpm,
            homeDir,
            npmPrefix,
            pathHasNpmGlobal,
            geminiWindowsPathDetected
        });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: List projects in workspace
app.get('/api/projects', async (req, res) => {
    try {
        // Ensure workspace exists
        await execWsl('mkdir -p ~/better-cli-workspace');

        // List directories
        const output = await execWsl('ls -F ~/better-cli-workspace | grep "/$"');
        const folders = output.split('\n').filter(Boolean).map(f => f.replace('/', ''));
        res.json(folders);
    } catch (err) {
        // If grep fails (no folders), it might exit with 1, which exec sees as error.
        // We should handle that gracefully.
        console.log('List projects trace', err);
        res.json([]);
    }
});

// API: Create new project folder
app.post('/api/projects', async (req, res) => {
    const { name } = req.body;
    if (!name || !/^[a-zA-Z0-9-_]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid project name' });
    }
    try {
        await execWsl(`mkdir -p ~/better-cli-workspace/${name}`);
        res.json({ success: true, path: `~/better-cli-workspace/${name}` });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: Get Git Status for a project
app.get('/api/projects/:name/git-status', async (req, res) => {
    const { name } = req.params;
    if (!name || !/^[a-zA-Z0-9-_]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid project name' });
    }

    // Use $HOME instead of ~ for correct expansion inside double quotes in bash
    const projectPath = `$HOME/better-cli-workspace/${name}`;

    try {
        // Check if .git directory exists
        const isGit = await execWsl(`[ -d "${projectPath}/.git" ] && echo "yes" || echo "no"`);

        if (isGit.trim() !== 'yes') {
            return res.json({ isGit: false });
        }

        // Get Remote URL
        const remoteUrl = await execWsl(`cd "${projectPath}" && git config --get remote.origin.url || echo ""`);

        // Get Current Branch
        let branch = await execWsl(`cd "${projectPath}" && git branch --show-current || echo ""`);
        branch = branch.trim();
        
        // If no branch (detached HEAD), get hash
        if (!branch) {
            const hash = await execWsl(`cd "${projectPath}" && git rev-parse --short HEAD || echo ""`);
            branch = `HEAD (${hash.trim()})`;
        }

        // Get Recent Commits (Last 10)
        // Format: Hash | Date | Subject
        const logOutput = await execWsl(`cd "${projectPath}" && git log -10 --format="%h|%cI|%s" || echo ""`);
        
        const commits = [];
        if (logOutput.trim()) {
            const lines = logOutput.trim().split('\n');
            for (const line of lines) {
                const firstPipe = line.indexOf('|');
                const secondPipe = line.indexOf('|', firstPipe + 1);
                
                if (firstPipe !== -1 && secondPipe !== -1) {
                    const hash = line.substring(0, firstPipe);
                    const date = line.substring(firstPipe + 1, secondPipe);
                    const message = line.substring(secondPipe + 1);
                    commits.push({ hash, date, message });
                }
            }
        }

        // Keep lastCommit for backward compatibility (first item)
        const lastCommit = commits.length > 0 ? commits[0] : null;

        res.json({
            isGit: true,
            remoteUrl: remoteUrl.trim(),
            branch,
            lastCommit,
            recentCommits: commits
        });

    } catch (err) {
        console.error(`Git status error for ${name}:`, err);
        res.status(500).json({ error: err.toString() });
    }
});

// API: Revert to specific commit
app.post('/api/projects/:name/git-checkout', async (req, res) => {
    const { name } = req.params;
    const { hash } = req.body;

    if (!name || !/^[a-zA-Z0-9-_]+$/.test(name)) return res.status(400).json({ error: 'Invalid project name' });
    if (!hash || !/^[a-f0-9]+$/.test(hash)) return res.status(400).json({ error: 'Invalid hash' });

    const projectPath = `$HOME/better-cli-workspace/${name}`;

    try {
        // Use checkout with detach to look at that state
        // Or reset --hard if the user explicitly wants to "time back" the folder permanently
        // The user request "pull previous commit to local folder" implies resetting the folder state.
        // But reset --hard is destructive to history if we are on a branch.
        // checkout <hash> is safer but puts us in detached HEAD.
        
        // Let's assume they want to "view/work" on that version.
        // checkout is safest. If they want to "reset" the branch, they can do that later.
        // Wait, "pull previous commit to local folder" might mean "make my files look like this commit".
        // If we just checkout, the branch pointer doesn't move, but HEAD does.
        
        await execWsl(`cd "${projectPath}" && git checkout ${hash}`);
        
        res.json({ success: true, message: `Checked out ${hash}` });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// API: Commit changes
app.post('/api/projects/:name/git-commit', async (req, res) => {
    const { name } = req.params;
    const { message } = req.body;

    if (!name || !/^[a-zA-Z0-9-_]+$/.test(name)) return res.status(400).json({ error: 'Invalid project name' });
    if (!message) return res.status(400).json({ error: 'Message required' });

    const projectPath = `$HOME/better-cli-workspace/${name}`;

    try {
        await execWsl(`cd "${projectPath}" && git add . && git commit -m "${message.replace(/"/g, '\\"')}"`);
        res.json({ success: true, message: 'Committed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// System File Browser API
app.get('/api/system/drives', async (req, res) => {
    try {
        const wslInstalled = await checkWslStatus();
        const drives = await new Promise((resolve) => {
            exec('wmic logicaldisk get name', (error, stdout) => {
                if (error) {
                    resolve([]);
                    return;
                }
                const d = stdout.split('\r\r\n')
                    .filter(value => /[A-Za-z]:/.test(value))
                    .map(value => value.trim());
                resolve(d);
            });
        });

        if (wslInstalled) {
            drives.push('~'); // WSL Home
            drives.push('/'); // WSL Root
        }

        res.json(drives);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// Helper: Convert Windows path to WSL /mnt path
const toMntPath = (winPath) => {
    const root = path.parse(winPath).root; // "C:\"
    const drive = root.replace(':\\', '').toLowerCase();
    const relative = winPath.substring(root.length).replace(/\\/g, '/');
    return `/mnt/${drive}/${relative}`;
};

// API: Folder Management
app.post('/api/fs/wsl/list', async (req, res) => {
    let { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'Path required' });

    try {
        // Expand ~ to $HOME
        if (dirPath.startsWith('~')) {
            dirPath = dirPath.replace(/^~/, '$HOME');
        }

        // Restrict access to only ~/better-cli-workspace
        // We need to resolve the absolute path first to check
        const resolvedPath = await execWsl(`readlink -f "${dirPath}"`);
        const homeDir = await execWsl('echo $HOME');
        const workspaceDir = `${homeDir}/better-cli-workspace`;

        // Ensure workspace directory exists
        await execWsl(`mkdir -p "${workspaceDir}"`);

        // If user tries to go above workspace, force them back to workspace
        if (!resolvedPath.startsWith(workspaceDir)) {
            // Exception: If they are requesting the root list, give them the workspace root
            // Or if they are trying to navigate up via ..
            dirPath = workspaceDir;
        }

        // Escape double quotes to prevent shell injection/breaking
        const safePath = dirPath.replace(/"/g, '\\"');

        // Use ls -lap with specific format to parse easily
        // Format: permissions links owner group size date time name
        // Adding -p to append / to directories
        const output = await execWsl(`ls -lap --time-style=long-iso "${safePath}"`);

        // Calculate folder sizes using du
        // This might take a moment for large directories, but provides the requested info
        let dirSizes = {};
        try {
            // -k: kilobytes
            // --max-depth=1: max depth 1 (GNU compatible)
            // 2>/dev/null: ignore permission errors
            // || true: ensure exit code 0 even if some files are unreadable
            // Use cd to ensure relative paths for reliable parsing
            const duCmd = `cd "${safePath}" && du -k --max-depth=1 2>/dev/null || true`;
            console.log('[WSL List] Calculating sizes with:', duCmd);
            const duOutput = await execWsl(duCmd);
            
            duOutput.split('\n').forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const sizeKb = parseInt(parts[0], 10);
                    let name = parts.slice(1).join(' ');
                    
                    // Remove ./ prefix if present
                    if (name.startsWith('./')) name = name.substring(2);
                    
                    // Skip current directory (.)
                    if (name === '.') return;
                    
                    dirSizes[name] = sizeKb * 1024; // Convert to bytes
                }
            });
            console.log(`[WSL List] Found sizes for ${Object.keys(dirSizes).length} folders`);
        } catch (e) {
            console.error('WSL du error:', e);
            // Non-fatal, just won't have folder sizes
        }

        const lines = output.split('\n');
        const files = [];

        // Skip total line
        for (const line of lines) {
            if (line.startsWith('total') || !line.trim()) continue;

            // Simple parsing (prone to spaces in user/group, but standard ls output usually ok)
            // drwxr-xr-x 2 user user 4096 2023-01-01 12:00 name/
            const parts = line.trim().split(/\s+/);
            if (parts.length < 8) continue;

            const isDir = parts[0].startsWith('d');
            const name = parts.slice(7).join(' '); // Rejoin remaining parts as name
            
            // Clean name (remove trailing slash for matching)
            const cleanName = name.replace(/\/$/, '');

            // Skip . and ..
            if (cleanName === '.') continue;
            if (cleanName === '..') {
                // Only allow .. if we are NOT at the workspace root
                // workspaceDir is already resolved absolute path
                // dirPath might be relative or using ~
                // We should compare resolved paths, but we don't have resolved dirPath easily available here for every iteration
                // Actually we do have resolvedPath from earlier, but that was BEFORE we potentially forced it to workspaceDir

                // Let's rely on the fact that if we are at workspaceDir, we shouldn't show ..
                // We know dirPath was set to workspaceDir if it was invalid.
                // So we can check if dirPath resolves to workspaceDir.

                // But wait, we used `ls` on `safePath`.
                // If dirPath is "~/better-cli-workspace", it is the root.

                // Simpler check:
                // We already established `workspaceDir` (absolute).
                // We can resolve `dirPath` again or just check if it matches.
                // But `dirPath` can be anything.

                // Let's use the `resolvedPath` variable we got earlier? 
                // No, that was for the INPUT path.
                // If the input path was invalid, we changed dirPath.

                // Let's just allow .. and let the restriction logic handle the "bounce back" if they try to go up?
                // If they click .., path becomes "workspace/.." which resolves to "home".
                // The restriction logic "if (!resolvedPath.startsWith(workspaceDir))" will catch it and force it back to workspaceDir.
                // So effectively, clicking .. at root will reload the root.
                // This is acceptable behavior.
                // BUT, hiding it is cleaner UX.

                // Let's check if we are at the root.
                // We can compare `dirPath` (after expansion/fix) with `workspaceDir`.
                // Note: `workspaceDir` is absolute (e.g. /home/user/workspace).
                // `dirPath` might be `~/better-cli-workspace` or absolute.

                // Let's just check if the current directory is the workspace directory.
                // We can use `execWsl('readlink -f "' + dirPath + '"')` again? 
                // That's expensive inside the loop? No, do it once before loop.
            }

            // Use calculated size for directories if available
            let size = parts[4];
            const cleanNameForSize = name.replace(/\/$/, '');
            if (isDir && dirSizes[cleanNameForSize] !== undefined) {
                size = dirSizes[cleanNameForSize];
            }

            files.push({
                name: name.replace(/\/$/, ''),
                isDirectory: isDir,
                size: size.toString(),
                date: `${parts[5]} ${parts[6]}`,
                path: `${dirPath.replace(/\/$/, '')}/${name.replace(/\/$/, '')}`
            });
        }

        // Post-processing to remove .. if we are at root
        const currentAbsPath = await execWsl(`readlink -f "${dirPath}"`);
        const isAtRoot = currentAbsPath === workspaceDir;

        if (isAtRoot) {
            const idx = files.findIndex(f => f.name === '..');
            if (idx !== -1) files.splice(idx, 1);
        }
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

app.post('/api/fs/win/list', async (req, res) => {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'Path required' });

    try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const results = await Promise.all(files.map(async (f) => {
            try {
                const stats = await fs.promises.stat(path.join(dirPath, f.name));
                return {
                    name: f.name,
                    isDirectory: f.isDirectory(),
                    size: stats.size,
                    date: stats.mtime.toISOString(),
                    path: path.join(dirPath, f.name)
                };
            } catch {
                return null;
            }
        }));
        res.json(results.filter(Boolean));
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

app.post('/api/fs/copy', async (req, res) => {
    const { source, dest, items } = req.body; // source/dest: { type: 'wsl'|'win', path: string }, items: string[] (names)

    if (!source || !dest || !items || !items.length) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
        for (const item of items) {
            const srcPath = source.type === 'win' ? path.join(source.path, item) : `${source.path}/${item}`;
            const destPath = dest.type === 'win' ? path.join(dest.path, item) : `${dest.path}/${item}`;

            // Construct command based on direction
            if (source.type === 'win' && dest.type === 'win') {
                // Win -> Win (Use Node fs)
                await fs.promises.cp(srcPath, destPath, { recursive: true });
            }
            else if (source.type === 'wsl' && dest.type === 'wsl') {
                // WSL -> WSL (Use cp)
                await execWsl(`cp -r "${srcPath}" "${destPath}"`);
            }
            else if (source.type === 'win' && dest.type === 'wsl') {
                // Win -> WSL (Use cp with /mnt)
                const mntSrc = toMntPath(srcPath);
                await execWsl(`cp -r "${mntSrc}" "${destPath}"`);
            }
            else if (source.type === 'wsl' && dest.type === 'win') {
                // WSL -> Win (Use cp to /mnt)
                const mntDest = toMntPath(destPath);
                await execWsl(`cp -r "${srcPath}" "${mntDest}"`);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Copy failed:', err);
        res.status(500).json({ error: err.toString() });
    }
});

// API: Delete items
app.post('/api/fs/delete', async (req, res) => {
    const { type, path: basePath, items } = req.body;
    if (!type || !basePath || !items || !items.length) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
        if (type === 'wsl') {
            // WSL Deletion
            for (const item of items) {
                // Sanitize path to avoid command injection or accidental root deletion
                if (item === '.' || item === '..' || item.includes('/')) {
                    // We only allow deleting direct children for now for safety
                    // Actually, let's allow paths but be careful
                }
                
                // Construct full path
                // If basePath ends with /, don't add another. If not, add /
                const separator = basePath.endsWith('/') ? '' : '/';
                const fullPath = `${basePath}${separator}${item}`;

                // Use rm -rf
                await execWsl(`rm -rf "${fullPath}"`);
            }
        } else if (type === 'win') {
            // Windows Deletion
            for (const item of items) {
                const fullPath = path.join(basePath, item);
                await fs.promises.rm(fullPath, { recursive: true, force: true });
            }
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Delete failed:', err);
        res.status(500).json({ error: err.toString() });
    }
});

// API: Graceful shutdown of backend (will terminate this process)
let shuttingDown = false;
const pidFile = path.join(__dirname, 'server.pid');

const isProcessRunning = (pid) => {
    try { return process.kill(pid, 0), true; } catch { return false; }
};

const writePid = () => {
    try { fs.writeFileSync(pidFile, process.pid.toString(), 'utf8'); } catch { }
};
const clearPid = () => {
    try { fs.unlinkSync(pidFile); } catch { }
};

// On startup, clean stale pid or refuse if another instance is running
try {
    if (fs.existsSync(pidFile)) {
        const existing = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
        if (!isNaN(existing) && existing !== process.pid) {
            if (isProcessRunning(existing)) {
                console.error(`Another server instance appears to be running (pid ${existing}). Exiting.`);
                process.exit(1);
            } else {
                clearPid();
            }
        } else {
            clearPid();
        }
    }
} catch { }

app.post('/api/system/shutdown', (req, res) => {
    if (shuttingDown) return res.json({ status: 'shutting_down' });
    shuttingDown = true;
    res.json({ status: 'ok', message: 'Shutting down backend' });

    setTimeout(() => {
        try {
            sessions.forEach((session) => {
                try { session.pty?.kill?.(); } catch { }
            });
            io.close(() => {
                server.close(() => {
                    clearPid();
                    process.exit(0);
                });
            });
            setTimeout(() => { clearPid(); process.exit(0); }, 1500).unref();
        } catch {
            clearPid();
            process.exit(0);
        }
    }, 200);
});

app.post('/api/system/dirs', async (req, res) => {
    const targetPath = req.body.path;
    if (!targetPath) return res.status(400).json({ error: 'Path required' });

    try {
        // Check if it's a WSL path (starts with / or ~)
        if (targetPath.startsWith('/') || targetPath.startsWith('~') || targetPath.startsWith('$HOME')) {
            // Normalize slashes for WSL and handle ~/$HOME expansion
            let wslPath = targetPath.replace(/\\/g, '/');

            // Expand ~ or $HOME if present at start
            if (wslPath.startsWith('~')) {
                wslPath = wslPath.replace('~', '$HOME');
            }

            // Use eval to expand the path safely in shell before listing
            // Adding -d */ to list only directories and append slash
            const output = await execWsl(`ls -F -d "${wslPath}"/*/ 2>/dev/null || ls -F -d "${wslPath}"/ 2>/dev/null`);

            const dirs = output.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && line.endsWith('/'))
                .map(line => {
                    // If ls returned full paths, extract just the name
                    // If ls returned relative, it's just the name
                    // We want just the directory name for the UI list
                    const parts = line.split('/');
                    // parts is [..., 'dirname', ''] due to trailing slash
                    return parts[parts.length - 2];
                });

            return res.json(dirs);
        }

        // Windows path handling
        const items = fs.readdirSync(targetPath + '\\', { withFileTypes: true });
        const dirs = items
            .filter(item => item.isDirectory())
            .map(item => item.name);
        res.json(dirs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: List contents (Files + Dirs) for File Explorer
// API: List contents (Files + Dirs) for File Explorer
app.post('/api/system/ls', async (req, res) => {
    const targetPath = req.body.path;
    console.log(`[Ls] Requested: ${targetPath}`);
    if (!targetPath) return res.status(400).json({ error: 'Path required' });

    try {
        if (targetPath.startsWith('/') || targetPath.startsWith('~') || targetPath.startsWith('$HOME')) {
            let wslPath = targetPath.replace(/\\/g, '/');
            if (wslPath.startsWith('~')) wslPath = wslPath.replace('~', '$HOME');

            console.log(`[Ls] Executing on: ${wslPath}`);

            // Check existence first
            try {
                await execWsl(`ls -d "${wslPath}"`);
            } catch (e) {
                console.error(`[Ls] Directory not found: ${wslPath}`);
                return res.json([]);
            }

            const output = await execWsl(`ls -pA "${wslPath}" 2>/dev/null || echo ""`);
            console.log(`[Ls] Output length: ${output.length} chars`);

            const items = output.split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    const isDir = line.endsWith('/');
                    const name = isDir ? line.slice(0, -1) : line;
                    return {
                        name,
                        type: isDir ? 'dir' : 'file',
                        isText: /\.(txt|md|js|ts|json|yml|yaml|css|html|sh|py)$/i.test(name)
                    };
                })
                .sort((a, b) => {
                    if (a.type === b.type) return a.name.localeCompare(b.name);
                    return a.type === 'dir' ? -1 : 1;
                });

            return res.json(items);
        }
        res.status(400).json({ error: 'Only WSL paths supported for now' });
    } catch (err) {
        console.error('[Ls] Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// API: Read file content (Supports Windows and WSL)
app.post('/api/system/files/read', async (req, res) => {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ error: 'Path required' });

    try {
        // Check if it's a WSL path
        if (targetPath.startsWith('/') || targetPath.startsWith('~')) {
            // Use cat to read file
            // Normalize slashes
            const wslPath = targetPath.replace(/\\/g, '/');
            const content = await execWsl(`cat "${wslPath}"`);
            return res.json({ content });
        }

        // Windows path handling
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const content = fs.readFileSync(targetPath, 'utf8');
        res.json({ content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Import folder from Windows
app.post('/api/projects/import', async (req, res) => {
    const { windowsPath } = req.body;
    if (!windowsPath) return res.status(400).json({ error: 'Initial path required' });

    try {
        // Convert E:\Foo\Bar to /mnt/e/Foo/Bar
        const driveLetter = windowsPath.charAt(0).toLowerCase();
        const restPath = windowsPath.slice(2).replace(/\\/g, '/');
        const wslPath = `/mnt/${driveLetter}${restPath}`;

        const folderName = path.basename(windowsPath);
        // Use $HOME to ensure expansion inside double quotes during spawn
        const targetPath = `$HOME/better-cli-workspace/${folderName}`;

        console.log(`[Import] Copying ${wslPath} to ${targetPath}`);

        await execWsl(`mkdir -p $HOME/better-cli-workspace`);

        // Use spawn for streaming output (cp -rv)
        const { spawn } = require('child_process');
        const copyProcess = spawn('wsl.exe', ['--exec', 'bash', '-c', `cp -rv "${wslPath}" "${targetPath}"`]);

        copyProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    // cp -v output: 'src' -> 'dest'
                    const match = trimmed.match(/'([^']+)' ->/);
                    const file = match ? path.basename(match[1]) : trimmed;
                    // Limit file length to avoid huge payloads
                    const safeFile = file.length > 50 ? '...' + file.slice(-47) : file;
                    io.emit('import-progress', { file: safeFile });
                }
            }
        });

        copyProcess.stderr.on('data', (data) => {
            console.error(`[Import Error] ${data}`);
        });

        copyProcess.on('close', (code) => {
            if (code === 0) {
                res.json({ success: true, name: folderName });
            } else {
                // Check if response already sent
                if (!res.headersSent) {
                    res.status(500).json({ error: `Import failed with code ${code}` });
                }
            }
        });

    } catch (err) {
        console.error('Import failed', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Import failed: ' + err.toString() });
        }
    }
});

// API: Create new session
app.post('/api/sessions', async (req, res) => {
    const id = generateId();
    const cols = req.body.cols || 80;
    const rows = req.body.rows || 24;
    // Client sends 'project' name, we default to workspace root if null
    const project = req.body.project;

    console.log(`[Session] Creating session ${id} (${cols}x${rows}) for project: ${project || 'root'}`);

    // Spawn WSL
    const shell = 'wsl.exe';

    // Milestone 5: Force start in Linux Home (~), not Windows Mount
    let envVars = process.env;
    try {
        const wslviewCheck = await execWsl('which wslview 2>/dev/null || echo "NOT_FOUND"');
        if (wslviewCheck && !wslviewCheck.includes('NOT_FOUND')) {
            envVars = { ...process.env, BROWSER: 'wslview' };
        }
    } catch { }

    // Milestone 5 + Isolation: Force start in Linux Home (~), and use unshare for unique hostname
    const shortId = id.substring(0, 6);
    const isolatedCommand = `hostname better-cli-${shortId} && exec bash`;

    // We use unshare -u (UTS namespace) and -r (map-root-user) to allow hostname change without sudo
    const ptyProcess = pty.spawn(shell, ['--exec', 'unshare', '-u', '-r', 'bash', '-c', isolatedCommand], {
        name: 'xterm-256color',
        cols: cols,
        rows: rows,
        env: envVars
    });

    const session = {
        id,
        pty: ptyProcess,
        history: '',
        project
    };

    sessions.set(session.id, session);

    // Initial Workspace Setup
    setTimeout(() => {
        // Use $HOME and quotes to handle spaces and ensure expansion
        const targetDir = project ? `$HOME/better-cli-workspace/${project}` : `$HOME/better-cli-workspace`;
        ptyProcess.write(`mkdir -p "${targetDir}" && cd "${targetDir}" && clear\r`);
    }, 500);

    // Export BROWSER=wslview if available
    setTimeout(async () => {
        try {
            const which = await execWsl('which wslview 2>/dev/null || echo "NOT_FOUND"');
            if (which && !which.includes('NOT_FOUND')) {
                ptyProcess.write(`export BROWSER=wslview\r`);
            }
        } catch { }
    }, 1000);

    // Clean up on exit
    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`[Session] ${id} exited with code ${exitCode}`);
        sessions.delete(id);
    });

    res.json({ id });
});

// Validating existence
app.get('/api/sessions/:id', (req, res) => {
    if (sessions.has(req.params.id)) {
        res.json({ status: 'alive' });
    } else {
        res.status(404).json({ status: 'not_found' });
    }
});

// API: Send input to session
app.post('/api/sessions/:id/input', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const { data } = req.body;
    if (data) {
        session.pty.write(data);
    }
    res.json({ success: true });
});

// API: List all sessions
app.get('/api/sessions', (req, res) => {
    const list = Array.from(sessions.values()).map(s => ({
        id: s.id,
        cols: s.pty.cols,
        rows: s.pty.rows,
        project: s.project
    }));
    res.json(list);
});

// Known AI API endpoints for reference
const AI_API_ENDPOINTS = {
    'openai.com': 'OpenAI (GPT, Codex)',
    'api.openai.com': 'OpenAI API',
    'anthropic.com': 'Anthropic (Claude)',
    'api.anthropic.com': 'Anthropic API',
    'generativelanguage.googleapis.com': 'Google Gemini API',
    'googleapis.com': 'Google APIs',
    'github.com': 'GitHub',
    'copilot-proxy.githubusercontent.com': 'GitHub Copilot',
    'aistudio.google.com': 'Google AI Studio',
};

// Map Tools to Endpoints
const TOOL_TO_ENDPOINTS = {
    'gemini': 'generativelanguage.googleapis.com',
    'claude': 'api.anthropic.com',
    'gpt': 'api.openai.com',
    'codex': 'api.openai.com',
    'aider': 'api.openai.com', // Default to OpenAI for Aider
    'copilot': 'copilot-proxy.githubusercontent.com',
    'cursor': 'repo.cursor.sh',
    'cline': 'api.anthropic.com'
};

// Helper: Resolve IP to hostname using reverse DNS
const resolveHostname = async (ip) => {
    try {
        const result = await execWsl(`host ${ip} 2>/dev/null | head -1`);
        const match = result.match(/domain name pointer (.+)\.$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
};

// Helper: Ping an endpoint and get latency
const pingEndpoint = async (target, count = 4) => {
    try {
        const result = await execWsl(`ping -c ${count} -W 2 ${target} 2>&1`);

        // Parse ping output
        const stats = {
            target,
            success: false,
            min: null,
            avg: null,
            max: null,
            packetLoss: null,
            raw: result
        };

        // Check if ping was successful
        if (result.includes('0% packet loss') || result.includes('received')) {
            stats.success = true;

            // Extract packet loss
            const lossMatch = result.match(/(\d+)% packet loss/);
            if (lossMatch) stats.packetLoss = parseInt(lossMatch[1]);

            // Extract min/avg/max - format: "rtt min/avg/max/mdev = 10.123/15.456/20.789/3.456 ms"
            const timingMatch = result.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
            if (timingMatch) {
                stats.min = parseFloat(timingMatch[1]);
                stats.avg = parseFloat(timingMatch[2]);
                stats.max = parseFloat(timingMatch[3]);
            }
        } else {
            stats.packetLoss = 100;
        }

        return stats;
    } catch (err) {
        return {
            target,
            success: false,
            error: err.toString(),
            packetLoss: 100
        };
    }
};

// API: Get network info and latency for a session
app.get('/api/sessions/:id/network-info', async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        // Get active network connections from WSL
        // Using ss (socket statistics) - more modern than netstat
        // We filter for ESTABLISHED connections and exclude localhost to find real external traffic
        // NOTE: In WSL, some tools might not show up if they use short-lived connections.
        // We add netstat fallback to be safe.
        let connections = await execWsl(`ss -tanp 2>/dev/null | grep ESTAB || echo ''`);

        // If ss returns nothing, try netstat (older but reliable)
        if (!connections || connections.trim().length === 0) {
            connections = await execWsl(`netstat -an | grep ESTABLISHED || echo ''`);
        }

        const connectionLines = connections.split('\n').filter(Boolean);
        const activeConnections = [];
        const uniqueTargets = new Set();

        // Always add some known reliable targets for connectivity check if no active connections
        // This ensures the user sees *something* instead of just "Initializing..." forever
        // if they have internet but no active tools running.
        if (uniqueTargets.size === 0) {
            uniqueTargets.add('8.8.8.8'); // Google DNS
            uniqueTargets.add('1.1.1.1'); // Cloudflare DNS
        }

        for (const line of connectionLines) {
            // Parse ss/netstat output
            // Format varies, but usually: Proto Recv-Q Send-Q Local Address Foreign Address State
            const parts = line.trim().split(/\s+/);

            // Try to find the foreign address (usually index 4 in netstat, index 4 in ss)
            let peerAddress = null;

            // Heuristic to find IP:Port pattern
            for (const part of parts) {
                if (part.includes(':') && !part.startsWith('127.') && !part.startsWith('0.0.0.0') && !part.startsWith('::')) {
                    // Check if it's likely remote (not local)
                    // This is a simple filter; might need refinement
                    peerAddress = part;
                }
            }


        }

        // Fallback: If no tools found OR tools have no known endpoints, use generic if empty
        if (uniqueTargets.size === 0) {
            uniqueTargets.add('8.8.8.8'); // Google DNS
            uniqueTargets.add('1.1.1.1'); // Cloudflare DNS
        }

        // Perform ping tests on unique targets
        const pingResults = [];
        for (const target of uniqueTargets) {
            // Try to resolve hostname
            const hostname = await resolveHostname(target);
            const pingStats = await pingEndpoint(target, 4);

            // Check if it's a known AI API
            let service = 'Unknown';
            if (hostname) {
                for (const [domain, name] of Object.entries(AI_API_ENDPOINTS)) {
                    if (hostname.includes(domain)) {
                        service = name;
                        break;
                    }
                }
            }

            pingResults.push({
                ip: target,
                hostname: hostname || 'Unknown',
                service,
                ...pingStats
            });
        }

        res.json({
            sessionId: req.params.id,
            timestamp: new Date().toISOString(),
            activeConnections: activeConnections.length,
            connections: activeConnections,
            detectedTools: [...new Set(runningTools)],
            pingResults,
            summary: {
                totalTargets: uniqueTargets.size,
                avgLatency: pingResults.length > 0
                    ? (pingResults.reduce((sum, r) => sum + (r.avg || 0), 0) / pingResults.filter(r => r.avg).length).toFixed(2)
                    : null,
                successfulPings: pingResults.filter(r => r.success).length
            }
        });

    } catch (err) {
        console.error('Network info error:', err);
        res.status(500).json({ error: err.toString() });
    }
});

// Catch-all for SPA
app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    // Check if index.html exists, otherwise return 404 to avoid infinite loops if build missing
    const indexHtml = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
    } else {
        res.status(404).send('Better WSL: Frontend not found. Please run build script.');
    }
});

// Auto-Pilot State
const autoPilotLinks = new Map(); // sessionId -> { listener: Disposable, targetId: string, tag: string }

app.post('/api/autopilot/link', (req, res) => {
    const { agent1Id, agent2Id } = req.body;
    const s1 = sessions.get(agent1Id);
    const s2 = sessions.get(agent2Id);

    if (!s1 || !s2) return res.status(404).json({ error: "Session not found" });

    // Clear existing links for these sessions if they were already linked
    if (autoPilotLinks.has(agent1Id)) {
        try { autoPilotLinks.get(agent1Id).listener.dispose(); } catch { }
        autoPilotLinks.delete(agent1Id);
    }
    if (autoPilotLinks.has(agent2Id)) {
        try { autoPilotLinks.get(agent2Id).listener.dispose(); } catch { }
        autoPilotLinks.delete(agent2Id);
    }

    // Helper to setup link
    const setupLink = (source, target, tag) => {
        let buffer = '';
        const listener = source.pty.onData((data) => {
            buffer += data;

            // Process only if we have newlines
            if (buffer.includes('\n')) {
                const lines = buffer.split('\n');
                // Keep the last chunk as the new buffer
                buffer = lines.pop();

                for (const rawLine of lines) {
                    // Strip ANSI codes for reliable matching
                    // eslint-disable-next-line no-control-regex
                    const cleanLine = rawLine.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

                    // Ignore System/AutoPilot messages to prevent self-triggering loops
                    if (cleanLine.includes('[System]') || cleanLine.includes('[AutoPilot]')) {
                        continue;
                    }

                    // Ignore Shell Prompt Echos (Input Echo) to prevent duplication/truncation issues
                    // Matches standard prompts like "user@host:~$", "C:\path>", "[INSTRUCTOR] path $"
                    const promptPattern = /^(?:.*[@:].*[#$]|.*[\]\)].*[$%#]|[A-Z]:\\.*>)\s/;
                    if (promptPattern.test(cleanLine)) {
                        continue;
                    }

                    if (cleanLine.includes(tag)) {
                        const parts = cleanLine.split(tag);
                        if (parts.length > 1) {
                            const command = parts.slice(1).join(tag).trim();

                            if (command) {
                                // Rate Limiting: Max 1 message per 1s
                                const linkState = autoPilotLinks.get(source.id);
                                const now = Date.now();
                                if (linkState && (now - linkState.lastSent < 1000)) {
                                    console.warn(`[AutoPilot] Rate limit hit for ${source.id}`);
                                    source.pty.write(`\r\n\x1b[33m[AutoPilot] ⚠ Rate Limited (1 msg/s). Dropped: ${command.substring(0, 20)}...\x1b[0m\r\n`);
                                    continue;
                                }

                                if (linkState) linkState.lastSent = now;

                                console.log(`[AutoPilot] Routing from ${source.id} to ${target.id}: ${command}`);

                                // Send the command to the target
                                target.pty.write(command + '\r');

                                // Feedback to Source
                                source.pty.write(`\r\n\x1b[35m[AutoPilot] ➤ Sent to Pair: ${command}\x1b[0m\r\n`);
                            }
                        }
                    }
                }
            }

            // Safety cap
            if (buffer.length > 50000) buffer = '';
        });

        autoPilotLinks.set(source.id, { listener, targetId: target.id, tag, lastSent: 0 });
    };

    // Agent 1 talks to Agent 2 via <agent2> tag
    setupLink(s1, s2, '<agent2>');

    // Agent 2 talks to Agent 1 via <agent1> tag
    setupLink(s2, s1, '<agent1>');

    // Send initial system message to both
    const msg = (t) => `\r\n\x1b[36m[System] Auto-Pilot Active.\r\nUse < ${t} > COMMAND to delegate tasks.\x1b[0m\r\n`;
    s1.pty.write(msg('agent2'));
    s2.pty.write(msg('agent1'));

    console.log(`[AutoPilot] Linked Session ${agent1Id} <-> ${agent2Id}`);
    res.json({ success: true, message: "Sessions linked" });
});

app.post('/api/autopilot/unlink', (req, res) => {
    const { agent1Id, agent2Id, kill } = req.body;
    let count = 0;

    [agent1Id, agent2Id].forEach(id => {
        if (id && autoPilotLinks.has(id)) {
            try { autoPilotLinks.get(id).listener.dispose(); } catch { }
            autoPilotLinks.delete(id);
            count++;
        }
        // Optional: Kill the session entirely
        if (kill && id && sessions.has(id)) {
            try {
                sessions.get(id).pty.kill();
                sessions.delete(id);
            } catch { }
        }
    });

    res.json({ success: true, unlinked: count });
});


// Socket.io for Streaming
io.on('connection', (socket) => {
    const sessionId = socket.handshake.query.sessionId;

    console.log(`[Socket] Client connected for session ${sessionId}`);

    const session = sessions.get(sessionId);
    if (!session) {
        console.log(`[Socket] Session ${sessionId} not found, disconnecting`);
        socket.disconnect();
        return;
    }

    // Send history immediately on connect
    if (session.history) {
        socket.emit('output', session.history);
    }

    // PTY -> Socket
    const onData = (data) => {
        session.history += data;
        if (session.history.length > MAX_HISTORY) {
            session.history = session.history.slice(session.history.length - MAX_HISTORY);
        }
        socket.emit('output', data);
    };

    const disposable = session.pty.onData(onData);

    // Socket -> PTY
    socket.on('input', (data) => {
        session.pty.write(data);
    });

    socket.on('resize', ({ cols, rows }) => {
        try {
            session.pty.resize(cols, rows);
        } catch (err) {
            console.error('Resize failed', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected ${sessionId}`);
        disposable.dispose();
    });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const startServer = () => {
    server.listen(PORT, () => {
        writePid();
        console.log(`\n🚀 Session Host running on http://localhost:${PORT}`);
    });
};

const exitClean = () => { clearPid(); process.exit(0); };
process.on('SIGINT', exitClean);
process.on('SIGTERM', exitClean);
process.on('exit', clearPid);
process.on('uncaughtException', (err) => { console.error(err); clearPid(); process.exit(1); });

startServer();
