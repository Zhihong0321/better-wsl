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
        const wslDir = `~/.better-cli/uploads`;
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
        } catch {}
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
                    export PATH=$HOME/.local/share/fnm:$HOME/.npm-global/bin:$PATH
                    eval "$(fnm env --shell bash 2>/dev/null)"
                    fnm use default 2>/dev/null || fnm use --lts 2>/dev/null || true
                    which ${command} 2>/dev/null || echo "NOT_FOUND"
                `;
                const b64 = Buffer.from(script).toString('base64');
                checkCmd = `echo \\"${b64}\\" | base64 -d | bash`;
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
                            export PATH=$HOME/.local/share/fnm:$HOME/.npm-global/bin:$PATH
                            eval "$(fnm env --shell bash 2>/dev/null)"
                            fnm use default 2>/dev/null || fnm use --lts 2>/dev/null || true
                            ${command} --version 2>&1 | head -1
                        `;
                        const b64 = Buffer.from(script).toString('base64');
                        versionCmd = `echo \\"${b64}\\" | base64 -d | bash`;
                    }
                    const version = await execWsl(versionCmd);
                    results.wsl.version = version.trim();
                } catch (e) {
                    results.wsl.version = 'unknown';
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
        if (results.wsl.installed && results.windows.installed) status = 'conflict';
        else if (results.wsl.installed) status = 'installed_wsl';
        else if (results.windows.installed) status = 'installed_windows';

        res.json({ status, ...results });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
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
        // Note: We must escape the double quotes for the inner echo command because execWsl wraps everything in "..."
        const cmd = `echo \\"${b64}\\" | base64 -d > /tmp/npm_health_check.sh && bash /tmp/npm_health_check.sh`;
        
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
        
        // Get Last Commit
        // Format: Hash | Date | Subject
        // Use strict ISO date format for easier parsing
        const lastCommit = await execWsl(`cd "${projectPath}" && git log -1 --format="%h|%cI|%s" || echo ""`);
        
        let commitInfo = null;
        if (lastCommit.trim()) {
            const [hash, date, message] = lastCommit.trim().split('|');
            commitInfo = { hash, date, message };
        }

        res.json({
            isGit: true,
            remoteUrl: remoteUrl.trim(),
            lastCommit: commitInfo
        });

    } catch (err) {
        console.error(`Git status error for ${name}:`, err);
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

app.post('/api/system/dirs', async (req, res) => {
    const targetPath = req.body.path;
    if (!targetPath) return res.status(400).json({ error: 'Path required' });

    try {
        // Check if it's a WSL path (starts with / or ~)
        if (targetPath.startsWith('/') || targetPath.startsWith('~')) {
            // Normalize slashes for WSL (convert Windows backslashes to forward slashes)
            const wslPath = targetPath.replace(/\\/g, '/');
            const output = await execWsl(`ls -F "${wslPath}"`);
            const dirs = output.split('\n')
                .filter(line => line.trim().endsWith('/'))
                .map(line => line.trim().slice(0, -1)); // Remove trailing /
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
        const targetPath = `~/better-cli-workspace/${folderName}`;

        console.log(`[Import] Copying ${wslPath} to ${targetPath}`);

        await execWsl(`mkdir -p ~/better-cli-workspace`);

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
    } catch {}

    const ptyProcess = pty.spawn(shell, ['--exec', 'bash'], {
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
        const targetDir = project ? `~/better-cli-workspace/${project}` : `~/better-cli-workspace`;
        ptyProcess.write(`mkdir -p ${targetDir} && cd ${targetDir} && clear\r`);
    }, 500);

    // Export BROWSER=wslview if available
    setTimeout(async () => {
        try {
            const which = await execWsl('which wslview 2>/dev/null || echo "NOT_FOUND"');
            if (which && !which.includes('NOT_FOUND')) {
                ptyProcess.write(`export BROWSER=wslview\r`);
            }
        } catch {}
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

            if (peerAddress) {
                const [ip, port] = peerAddress.split(':');
                
                // Skip local connections
                if (ip.startsWith('127.') || ip === '::1' || ip.startsWith('192.168.') || ip === 'localhost') {
                    continue;
                }

                activeConnections.push({
                    remoteAddress: peerAddress,
                    remoteIp: ip,
                    remotePort: port,
                    state: 'ESTABLISHED'
                });

                uniqueTargets.add(ip);
            }
        }

        // Detect running AI tools
        const processes = await execWsl(`ps aux | grep -E "(codex|aider|cursor|copilot|gemini|claude|cline|gpt)" | grep -v grep || echo ""`);
        const runningTools = processes.split('\n')
            .filter(Boolean)
            .map(line => {
                const match = line.match(/(codex|aider|cursor|copilot|gemini|claude|cline|gpt)/i);
                return match ? match[1].toLowerCase() : null;
            })
            .filter(Boolean);
        
        // If tools are running, prioritize their endpoints
        if (runningTools.length > 0) {
            // Clear generic targets if we have specific AI tools
            // The user wants to see "ping against the AI i working with"
            uniqueTargets.clear();

            for (const tool of runningTools) {
                const endpoint = TOOL_TO_ENDPOINTS[tool];
                if (endpoint) {
                    uniqueTargets.add(endpoint);
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

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 Session Host running on http://localhost:${PORT}`);
});
