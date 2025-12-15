const express = require('express');
const cors = require('cors');
const { exec, execFile } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Helper to execute WSL commands
const execWsl = (cmd) => {
    return new Promise((resolve, reject) => {
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

// Health check
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', app: 'setup' });
});

// API: Get WSL distro list
app.post('/api/wsl/distros', async (req, res) => {
    try {
        const listOutput = await new Promise((resolve, reject) => {
            exec('wsl.exe --list --verbose', { encoding: 'utf16le' }, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stdout);
            });
        });

        const lines = listOutput.split('\n').map(l => l.trim()).filter(Boolean);
        const distros = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/(\*)?\s*([\w-]+)\s+(\w+)\s+(\d+)/);
            if (match) {
                const isDefault = match[1] === '*';
                const name = match[2].trim();
                const state = match[3].trim();
                const version = match[4].trim();
                
                distros.push({
                    name,
                    state,
                    version,
                    isDefault
                });
            }
        }

        res.json({ distros });
    } catch (err) {
        res.status(500).json({ error: err.toString(), distros: [] });
    }
});

// API: Execute setup step
app.post('/api/setup/execute-step', async (req, res) => {
    const { stepId, distro } = req.body;
    if (!stepId) return res.status(400).json({ error: 'Step ID required' });

    try {
        let command = '';
        let output = '';

        switch (stepId) {
            case 'check-wsl':
                command = 'wsl.exe --status';
                try {
                    output = await new Promise((resolve, reject) => {
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                reject(new Error('WSL is not installed. Please install it first:\n\n1. Open PowerShell as Administrator\n2. Run: wsl --install\n3. Restart your computer\n4. Come back to run this setup'));
                            } else {
                                resolve('WSL is installed and ready:\n' + stdout);
                            }
                        });
                    });
                } catch (err) {
                    throw err;
                }
                break;

            case 'wsl-init':
                command = `wsl.exe -d ${distro} echo "WSL initialized"`;
                output = await new Promise((resolve, reject) => {
                    exec(command, (error, stdout, stderr) => {
                        if (error) reject(error);
                        else resolve(stdout || 'WSL distribution initialized successfully');
                    });
                });
                break;

            case 'check-sudo':
                command = 'sudo --version';
                output = await execWsl(command);
                if (!output.includes('Sudo')) {
                    throw new Error('Sudo not found');
                }
                output = 'Sudo verified: ' + output.split('\n')[0];
                break;

            case 'install-curl':
                command = 'if command -v curl &> /dev/null; then echo "curl already installed: $(curl --version | head -n1)"; else if command -v dnf &> /dev/null; then sudo dnf install -y curl; else sudo apt update && sudo apt install -y curl; fi && echo "curl installed: $(curl --version | head -n1)"; fi';
                output = await execWsl(command);
                break;

            case 'install-node':
                command = `set -e;
HOME_DIR="$(getent passwd $(whoami) | cut -d: -f6)";
FNM_DIR="$HOME_DIR/.local/share/fnm";
mkdir -p "$FNM_DIR";
if ! command -v unzip &> /dev/null; then
    if command -v dnf &> /dev/null; then
        sudo dnf install -y unzip;
    else
        sudo apt update && sudo apt install -y unzip;
    fi
fi;
if [ ! -x "$FNM_DIR/fnm" ]; then
    curl -fsSL https://github.com/Schniz/fnm/releases/latest/download/fnm-linux.zip -o /tmp/fnm.zip &&
    unzip -o /tmp/fnm.zip -d "$FNM_DIR";
fi;
export PATH="$FNM_DIR:$PATH";
eval "$("$FNM_DIR/fnm" env --shell bash)";
"$FNM_DIR/fnm" install --lts;
VER=$("$FNM_DIR/fnm" list | grep -o "v[0-9]*\.[0-9]*\.[0-9]*" | tail -n1);
"$FNM_DIR/fnm" alias default "$VER";
eval "$("$FNM_DIR/fnm" use "$VER" --shell bash)";
node -v && npm -v && echo "Node.js and npm installed successfully"`;
                output = await execWsl(command);
                break;

            case 'configure-npm':
                command = `set -e;
HOME_DIR="$(getent passwd $(whoami) | cut -d: -f6)";
FNM_DIR="$HOME_DIR/.local/share/fnm";
export PATH="$FNM_DIR:$PATH";
eval "$("$FNM_DIR/fnm" env --shell bash)";
mkdir -p "$HOME_DIR/.npm-global";
npm config set prefix "$HOME_DIR/.npm-global";
if ! grep -q "fnm env" "$HOME_DIR/.bashrc"; then
    echo 'export PATH="$HOME/.local/share/fnm:$PATH"' >> "$HOME_DIR/.bashrc";
    echo 'eval "$(fnm env --shell bash)"' >> "$HOME_DIR/.bashrc";
fi;
if ! grep -q "npm-global/bin" "$HOME_DIR/.bashrc"; then
    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME_DIR/.bashrc";
fi;
echo "npm prefix: $(npm config get prefix)" && echo "npm configured successfully"`;
                output = await execWsl(command);
                break;

            case 'verify':
                command = `set -e;
HOME_DIR="$(getent passwd $(whoami) | cut -d: -f6)";
FNM_DIR="$HOME_DIR/.local/share/fnm";
export PATH="$FNM_DIR:$HOME_DIR/.npm-global/bin:$PATH";
eval "$("$FNM_DIR/fnm" env --shell bash)";
echo "Sudo: $(sudo --version | head -n1)";
echo "cURL: $(curl --version | head -n1)";
echo "Node.js: $(node -v)";
echo "npm: $(npm -v)";
echo "All tools verified successfully!"`;
                output = await execWsl(command);
                break;

            default:
                return res.status(400).json({ error: 'Unknown step ID' });
        }

        res.json({
            success: true,
            output: output.trim()
        });
    } catch (err) {
        console.error(`Setup step ${stepId} failed:`, err);
        res.json({
            success: false,
            error: err.message || err.toString(),
            output: err.stdout || ''
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🔧 Setup Server running on http://localhost:${PORT}`);
});
