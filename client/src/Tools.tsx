import { type Component, For, createSignal, onMount, Show } from 'solid-js';
import { Download, Terminal, HardDrive, AlertTriangle, Trash2, RefreshCcw, Code, Box } from 'lucide-solid';
import RandomCharAnimation from './components/RandomCharAnimation';

interface Tool {
    id: string;
    name: string;
    description: string;
    command: string;
    versionCommand: string;
    checkCommand: string;
}

interface DiskSpace {
    total: string;
    used: string;
    available: string;
    usedPercent: string;
}

interface ToolStatus {
    status: string; // 'not_installed' | 'installed_wsl' | 'installed_windows' | 'conflict'
    wsl: {
        installed: boolean;
        version: string | null;
        path: string | null;
        variant?: string;
    };
    windows: {
        installed: boolean;
        version: string | null;
        path: string | null;
    };
    latestVersion?: string | null;
}

interface AuthStatus {
    authenticated: boolean;
    account: string | null;
    error: string | null;
}

interface NpmHealth {
    nodeInstalled: boolean;
    npmInstalled: boolean;
    isWindowsNode?: boolean;
    isWindowsNpm?: boolean;
    homeDir: string;
    npmPrefix: string;
    pathHasNpmGlobal: boolean;
    geminiWindowsPathDetected: boolean;
}

type TabType = 'ESSENTIAL' | 'TOOLS' | 'CODING_CLI';

// Essential system tools and runtimes
const ESSENTIAL_TOOLS: Tool[] = [
    {
        id: 'sudo',
        name: 'Sudo',
        description: 'Execute commands with superuser privileges. Required for installing packages.',
        command: 'echo "sudo is a core system utility and should be pre-installed in WSL"\r',
        versionCommand: 'sudo --version\r',
        checkCommand: 'sudo'
    },
    {
        id: 'dnf',
        name: 'DNF Package Manager (Fedora)',
        description: 'Dandified YUM package manager for Fedora/RHEL. Primary package manager.',
        command: 'echo "dnf is pre-installed on Fedora WSL"\r',
        versionCommand: 'dnf --version\r',
        checkCommand: 'dnf'
    },
    {
        id: 'apt',
        name: 'APT Package Manager (Ubuntu)',
        description: 'Advanced Package Tool for Ubuntu/Debian. Primary package manager.',
        command: 'echo "apt is pre-installed on Ubuntu WSL"\r',
        versionCommand: 'apt --version\r',
        checkCommand: 'apt'
    },
    {
        id: 'curl',
        name: 'cURL',
        description: 'Command-line tool for transferring data. Essential for downloading files and APIs.',
        command: 'if command -v dnf &> /dev/null; then sudo dnf install -y curl; else sudo apt update && sudo apt install -y curl; fi\r',
        versionCommand: 'curl --version\r',
        checkCommand: 'curl'
    },
    {
        id: 'wslview',
        name: 'WSL Browser Bridge',
        description: 'Open URLs in Windows browser from WSL (wslu/wslview).',
        command: 'if command -v dnf &> /dev/null; then sudo dnf install -y git make && cd /tmp && rm -rf wslu && git clone https://github.com/wslutilities/wslu.git && cd wslu && sudo make install; else sudo apt update && sudo apt install -y wslu; fi\r',
        versionCommand: 'wslview --version\r',
        checkCommand: 'wslview'
    },
    {
        id: 'xdg-utils',
        name: 'XDG Utils',
        description: 'Provides xdg-open for generic URL opening in WSL.',
        command: 'if command -v dnf &> /dev/null; then sudo dnf install -y xdg-utils; else sudo apt update && sudo apt install -y xdg-utils; fi\r',
        versionCommand: 'xdg-open --version\r',
        checkCommand: 'xdg-open'
    },
    {
        id: 'docker',
        name: 'Docker Engine',
        description: 'Native Linux container runtime. Faster and lighter than Docker Desktop.',
        command: 'curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && sudo usermod -aG docker $USER\r',
        versionCommand: 'docker --version\r',
        checkCommand: 'docker'
    },
    {
        id: 'postgresql',
        name: 'PostgreSQL',
        description: 'Native PostgreSQL database for development. Instant startup, persistent data.',
        command: 'if command -v dnf &> /dev/null; then sudo dnf install -y postgresql postgresql-server; else sudo apt update && sudo apt install -y postgresql postgresql-contrib; fi\r',
        versionCommand: 'psql --version\r',
        checkCommand: 'psql'
    }
];

// Standard development languages and tools
const STANDARD_TOOLS: Tool[] = [
    {
        id: 'nodejs',
        name: 'Node.js v20 (Upgrade)',
        description: 'Upgrade System Node to v20 (Required for Gemini).',
        command: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs\r',
        versionCommand: 'node -v\r',
        checkCommand: 'node'
    },
    {
        id: 'python',
        name: 'Python 3',
        description: 'A high-level, general-purpose programming language.',
        command: 'sudo apt update && sudo apt install -y python3 python3-pip\r',
        versionCommand: 'python3 --version\r',
        checkCommand: 'python3'
    },
    {
        id: 'pip',
        name: 'Pip (Python 3)',
        description: 'Package installer for Python 3. Essential for installing Python packages.',
        command: 'sudo apt update && sudo apt install -y python3-pip\r',
        versionCommand: 'pip3 --version\r',
        checkCommand: 'pip3'
    },
    {
        id: 'rust',
        name: 'Rust (Rustup)',
        description: 'Systems programming language that runs blazingly fast.',
        command: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y\r',
        versionCommand: 'rustc --version\r',
        checkCommand: 'rustc'
    },
    {
        id: 'git',
        name: 'Git',
        description: 'Distributed version control system. Essential for any developer.',
        command: 'sudo apt update && sudo apt install -y git\r',
        versionCommand: 'git --version\r',
        checkCommand: 'git'
    }
];

// AI and Cloud CLI Tools
const CODING_CLI_TOOLS: Tool[] = [
    {
        id: 'railway',
        name: 'Railway CLI',
        description: 'Deploy to Railway directly from terminal. Essential for deployment testing.',
        command: 'export PATH=$(echo "$PATH" | tr ":" "\\n" | grep -v "/mnt/" | tr "\\n" ":"); echo "Installing Railway CLI..."; mkdir -p "$HOME/.npm-global"; npm config set prefix "$HOME/.npm-global"; export PATH="$HOME/.npm-global/bin:$PATH"; grep -q "npm-global/bin" "$HOME/.bashrc" || echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> "$HOME/.bashrc"; npm install -g @railway/cli\r',
        versionCommand: 'railway --version\r',
        checkCommand: 'railway'
    },
    {
        id: 'gh-cli',
        name: 'GitHub CLI',
        description: 'Take GitHub to the command line. Create issues, PRs, and more.',
        command: 'type -p curl > /dev/null || (sudo apt update && sudo apt install curl -y) && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y\r',
        versionCommand: 'gh --version\r',
        checkCommand: 'gh'
    },
    {
        id: 'gemini',
        name: 'Gemini CLI',
        description: 'Google Gemini AI-powered command line assistant.',
        command: 'export PATH=$(echo "$PATH" | tr ":" "\\n" | grep -v "/mnt/" | tr "\\n" ":"); echo "Installing Gemini CLI..."; mkdir -p "$HOME/.npm-global"; npm config set prefix "$HOME/.npm-global"; export PATH="$HOME/.npm-global/bin:$PATH"; grep -q "npm-global/bin" "$HOME/.bashrc" || echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> "$HOME/.bashrc"; npm install -g @google/gemini-cli\r',
        versionCommand: 'gemini --version\r',
        checkCommand: 'gemini'
    },
    {
        id: 'claude',
        name: 'Claude Code',
        description: 'Anthropic\'s Claude AI coding assistant.',
        command: 'export PATH=$(echo "$PATH" | tr ":" "\\n" | grep -v "/mnt/" | tr "\\n" ":"); echo "Installing Claude Code..."; mkdir -p "$HOME/.npm-global"; npm config set prefix "$HOME/.npm-global"; export PATH="$HOME/.npm-global/bin:$PATH"; grep -q "npm-global/bin" "$HOME/.bashrc" || echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> "$HOME/.bashrc"; npm install -g @anthropic-ai/claude-code\r',
        versionCommand: 'claude --version\r',
        checkCommand: 'claude'
    },
    {
        id: 'codex',
        name: 'Codex CLI',
        description: 'OpenAI Codex command line interface.',
        command: 'export PATH=$(echo "$PATH" | tr ":" "\\n" | grep -v "/mnt/" | tr "\\n" ":"); echo "Installing Codex CLI..."; mkdir -p "$HOME/.npm-global"; npm config set prefix "$HOME/.npm-global"; export PATH="$HOME/.npm-global/bin:$PATH"; grep -q "npm-global/bin" "$HOME/.bashrc" || echo \'export PATH="$HOME/.npm-global/bin:$PATH"\' >> "$HOME/.bashrc"; npm install -g @openai/codex\r',
        versionCommand: 'codex --version\r',
        checkCommand: 'codex'
    },
    {
        id: 'droid',
        name: 'Factory.ai Droid',
        description: 'Autonomous AI Droid for task automation.',
        command: 'export PATH=$(echo "$PATH" | tr ":" "\\n" | grep -v "/mnt/" | tr "\\n" ":"); echo "Installing Droid CLI..."; curl -fsSL https://factory.ai/install | sh\r',
        versionCommand: 'droid --version\r',
        checkCommand: 'droid'
    }
];

interface ToolsPanelProps {
    onInstall: (cmd: string) => void;
    onShutdown?: () => void;
}

const ToolsPanel: Component<ToolsPanelProps> = (props) => {
    const [diskSpace, setDiskSpace] = createSignal<DiskSpace | null>(null);
    const [toolStatuses, setToolStatuses] = createSignal<Map<string, ToolStatus>>(new Map());
    const [checkingTools, setCheckingTools] = createSignal<Set<string>>(new Set());
    const [authStatuses, setAuthStatuses] = createSignal<Map<string, AuthStatus>>(new Map());
    const [npmHealth, setNpmHealth] = createSignal<NpmHealth | null>(null);
    const [activeTab, setActiveTab] = createSignal<TabType>('ESSENTIAL');
    const [shuttingDown, setShuttingDown] = createSignal(false);

    const fetchDiskSpace = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/system/status');
            const data = await res.json();
            if (data.diskSpace) {
                setDiskSpace(data.diskSpace);
            }
        } catch (err) {
            console.error('Failed to fetch disk space:', err);
        }
    };

    const checkToolStatus = async (tool: Tool) => {
        const checking = new Set(checkingTools());
        checking.add(tool.id);
        setCheckingTools(checking);

        try {
            const res = await fetch('http://localhost:3000/api/tools/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: tool.checkCommand })
            });
            const data = await res.json();

            // Fetch latest version
            let latestVersion = null;
            try {
                const latestRes = await fetch('http://localhost:3000/api/tools/latest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toolId: tool.id })
                });
                const latestData = await latestRes.json();
                latestVersion = latestData.version;
            } catch (e) {
                console.warn(`Failed to check latest version for ${tool.name}`, e);
            }

            const statuses = new Map(toolStatuses());
            statuses.set(tool.id, { ...data, latestVersion });
            setToolStatuses(statuses);
        } catch (err) {
            console.error(`Failed to check ${tool.name}:`, err);
        } finally {
            const checking = new Set(checkingTools());
            checking.delete(tool.id);
            setCheckingTools(checking);
        }
    };

    const checkAuthStatus = async (toolId: string) => {
        try {
            const res = await fetch('http://localhost:3000/api/tools/auth-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolId })
            });
            const data = await res.json();

            const statuses = new Map(authStatuses());
            statuses.set(toolId, data);
            setAuthStatuses(statuses);
        } catch (err) {
            console.error(`Failed to check auth for ${toolId}:`, err);
        }
    };

    const checkAllTools = async () => {
        const allTools = [...ESSENTIAL_TOOLS, ...STANDARD_TOOLS, ...CODING_CLI_TOOLS];
        for (const tool of allTools) {
            checkToolStatus(tool);
            // Check auth for tools that need it
            if (tool.id === 'railway' || tool.id === 'gh-cli') {
                checkAuthStatus(tool.id);
            }
        }
    };

    const checkNpmHealth = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/tools/npm-health', { method: 'POST' });
            const data = await res.json();
            setNpmHealth(data);
        } catch { }
    };

    const handleInstall = (tool: Tool) => {
        const status = toolStatuses().get(tool.id);

        if (status) {
            if (status.status === 'conflict') {
                const choice = confirm(
                    `⚠ CONFLICT DETECTED\n\n` +
                    `${tool.name} is installed in both Windows and WSL:\n\n` +
                    `Windows: ${status.windows.version || 'unknown'}\n` +
                    `WSL: ${status.wsl.version || 'unknown'}\n\n` +
                    `This can cause permission issues. Recommended:\n` +
                    `1. Uninstall Windows version\n` +
                    `2. Reinstall in WSL\n\n` +
                    `Continue with WSL reinstall?`
                );
                if (!choice) return;
                // Proceed with force reinstall
                handleForceReinstall(tool);
            } else if (status.status === 'installed_windows') {
                const choice = confirm(
                    `⚠ WINDOWS INSTALLATION DETECTED\n\n` +
                    `${tool.name} (${status.windows.version || 'unknown'}) is installed in Windows.\n\n` +
                    `For Better CLI to work properly, tools should be installed in WSL.\n\n` +
                    `Install in WSL now?`
                );
                if (!choice) return;
            } else if (status.status === 'installed_wsl') {
                const choice = confirm(
                    `✓ ALREADY INSTALLED\n\n` +
                    `${tool.name} (${status.wsl.version || 'unknown'}) is already installed in WSL.\n\n` +
                    `Reinstall with --force?`
                );
                if (!choice) return;
                handleForceReinstall(tool);
                return;
            }
        }

        // Direct install without blocking checks
        props.onInstall(tool.command);

        setTimeout(() => {
            if (confirm('Installation sent to terminal. Check status now?')) {
                checkToolStatus(tool);
            }
        }, 2000);
    };

    const handleFixNpm = () => {
        const h = npmHealth();
        if (!h) return;

        const cmd = `set -e; 
HOME_DIR="$(getent passwd $(whoami) | cut -d: -f6)"; 
FNM_DIR="$HOME_DIR/.local/share/fnm"; 
export PATH="$FNM_DIR:$PATH"; 
sudo apt update && sudo apt install -y curl unzip; 
mkdir -p "$FNM_DIR"; 
if [ ! -x "$FNM_DIR/fnm" ]; then 
    curl -fsSL https://github.com/Schniz/fnm/releases/latest/download/fnm-linux.zip -o /tmp/fnm.zip && 
    unzip -o /tmp/fnm.zip -d "$FNM_DIR"; 
fi; 
eval "$("$FNM_DIR/fnm" env --shell bash)"; 
"$FNM_DIR/fnm" install --lts; 
VER=$("$FNM_DIR/fnm" list | grep -o "v[0-9]*\.[0-9]*\.[0-9]*" | tail -n1);
echo "Using Node Version: $VER";
"$FNM_DIR/fnm" alias default "$VER";
eval "$("$FNM_DIR/fnm" use "$VER" --shell bash)"; 
mkdir -p "$HOME_DIR/.npm-global"; 
npm config set prefix "$HOME_DIR/.npm-global"; 
if ! grep -q "fnm env" "$HOME_DIR/.bashrc"; then 
    echo 'export PATH="$HOME/.local/share/fnm:$PATH"' >> "$HOME_DIR/.bashrc"; 
    echo 'eval "$(fnm env --shell bash)"' >> "$HOME_DIR/.bashrc"; 
fi; 
if ! grep -q "npm-global/bin" "$HOME_DIR/.bashrc"; then 
    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME_DIR/.bashrc"; 
fi; 
export PATH="$HOME_DIR/.npm-global/bin:$PATH"; 
which npm; npm -v; echo "NPM Fixed in WSL!"`;

        props.onInstall(cmd.replace(/\n/g, ' ') + "\r");
        setTimeout(checkNpmHealth, 5000);
    };

    const handleForceReinstall = (tool: Tool) => {
        handleUninstall(tool);
        setTimeout(() => {
            props.onInstall(tool.command);
        }, 1000);
    };

    const handleUninstall = (tool: Tool) => {
        const status = toolStatuses().get(tool.id);
        if (!status || status.status === 'not_installed') {
            alert('Tool is not installed.');
            return;
        }

        const choice = confirm(`Uninstall ${tool.name} from WSL?`);
        if (!choice) return;

        fetch('http://localhost:3000/api/tools/uninstall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: tool.checkCommand, toolId: tool.id })
        }).then(res => res.json())
            .then(data => {
                if (data.success) {
                    props.onInstall(data.command);
                    setTimeout(() => checkToolStatus(tool), 2000);
                }
            });
    };

    const handleShutdown = async () => {
        if (shuttingDown()) return;
        const ok = confirm('Shutdown Better WSL backend now? This will stop the server and terminals.');
        if (!ok) return;
        setShuttingDown(true);
        try {
            await fetch('http://localhost:3000/api/system/shutdown', { method: 'POST' });

            // Poll for shutdown confirmation
            const interval = setInterval(async () => {
                try {
                    // Try to fetch health with a short timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1000);

                    const res = await fetch('http://localhost:3000/healthz', {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!res.ok) throw new Error('Server returned error');
                } catch (e) {
                    // Server is unreachable or returned error -> Shutdown complete
                    clearInterval(interval);
                    if (props.onShutdown) {
                        props.onShutdown();
                    } else {
                        window.location.reload();
                    }
                }
            }, 500);

        } catch (err) {
            console.error('Shutdown failed', err);
            alert('Shutdown request failed');
            setShuttingDown(false);
        }
    };

    onMount(() => {
        fetchDiskSpace();
        checkAllTools();
        checkNpmHealth();
        setInterval(fetchDiskSpace, 30000);
    });

    const getUsagePercent = () => {
        const space = diskSpace();
        if (!space) return 0;
        return parseInt(space.usedPercent.replace('%', ''));
    };

    const isLowSpace = () => getUsagePercent() > 85;

    const getToolStatusColor = (toolId: string) => {
        const status = toolStatuses().get(toolId);
        if (!status) return 'var(--text-muted)';
        switch (status.status) {
            case 'installed_wsl': return '#4ade80'; // green
            case 'installed_windows': return '#facc15'; // yellow
            case 'conflict': return '#ff6b6b'; // red
            default: return 'var(--text-muted)';
        }
    };

    const getToolStatusText = (toolId: string) => {
        const status = toolStatuses().get(toolId);
        if (!status) return 'Checking...';

        const latest = status.latestVersion ? ` (Latest: ${status.latestVersion})` : '';
        const variant = status.wsl?.variant ? ` [${status.wsl.variant}]` : '';

        switch (status.status) {
            case 'installed_wsl': return `✓ WSL ${status.wsl.version || ''}${variant}${latest}`;
            case 'installed_windows': return `⚠ Windows Only${latest}`;
            case 'conflict': return `⚠ Conflict${latest}`;
            default: return `Not Installed${latest}`;
        }
    };

    const getVisibleTools = () => {
        switch (activeTab()) {
            case 'ESSENTIAL': return ESSENTIAL_TOOLS;
            case 'TOOLS': return STANDARD_TOOLS;
            case 'CODING_CLI': return CODING_CLI_TOOLS;
        }
    };

    return (
        <div class="fade-in" style={{ padding: '24px', height: '100%', "display": "flex", "flex-direction": "column", "background-color": 'var(--bg-app)' }}>

            {/* Top Navigation */}
            <div style={{ "margin-bottom": "24px", "display": "flex", "gap": "16px", "border-bottom": "1px solid var(--border-std)", "padding-bottom": "16px" }}>
                <button
                    onClick={() => setActiveTab('ESSENTIAL')}
                    style={{
                        "display": "flex", "align-items": "center", "gap": "8px",
                        "padding": "8px 16px",
                        "background": activeTab() === 'ESSENTIAL' ? 'var(--bg-active)' : 'transparent',
                        "border": `1px solid ${activeTab() === 'ESSENTIAL' ? 'var(--accent-primary)' : 'transparent'}`,
                        "color": activeTab() === 'ESSENTIAL' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        "font-weight": activeTab() === 'ESSENTIAL' ? "bold" : "normal"
                    }}
                >
                    <Box size={16} /> ESSENTIAL
                </button>
                <button
                    onClick={() => setActiveTab('TOOLS')}
                    style={{
                        "display": "flex", "align-items": "center", "gap": "8px",
                        "padding": "8px 16px",
                        "background": activeTab() === 'TOOLS' ? 'var(--bg-active)' : 'transparent',
                        "border": `1px solid ${activeTab() === 'TOOLS' ? 'var(--accent-primary)' : 'transparent'}`,
                        "color": activeTab() === 'TOOLS' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        "font-weight": activeTab() === 'TOOLS' ? "bold" : "normal"
                    }}
                >
                    <Terminal size={16} /> TOOLS
                </button>
                <button
                    onClick={() => setActiveTab('CODING_CLI')}
                    style={{
                        "display": "flex", "align-items": "center", "gap": "8px",
                        "padding": "8px 16px",
                        "background": activeTab() === 'CODING_CLI' ? 'var(--bg-active)' : 'transparent',
                        "border": `1px solid ${activeTab() === 'CODING_CLI' ? 'var(--accent-primary)' : 'transparent'}`,
                        "color": activeTab() === 'CODING_CLI' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        "font-weight": activeTab() === 'CODING_CLI' ? "bold" : "normal"
                    }}
                >
                    <Code size={16} /> CODING CLI
                </button>

                <div style={{ "margin-left": "auto", display: 'flex', gap: '8px' }}>
                    <button
                        class="smooth-transition hover-scale"
                        onClick={() => { checkAllTools(); checkNpmHealth(); }}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid var(--accent-primary)',
                            color: 'var(--accent-primary)',
                            "font-size": '13px',
                            "font-weight": 700,
                            display: 'flex',
                            "align-items": 'center',
                            gap: '8px',
                            "text-transform": 'uppercase',
                            cursor: 'pointer'
                        }}
                        title="Refresh tool statuses"
                    >
                        <RefreshCcw size={14} />
                        REFRESH
                    </button>
                    <button
                        class="smooth-transition hover-scale"
                        onClick={handleShutdown}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #ff6b6b',
                            color: '#ff6b6b',
                            "font-size": '13px',
                            "font-weight": 700,
                            display: 'flex',
                            "align-items": 'center',
                            gap: '8px',
                            "text-transform": 'uppercase',
                            cursor: 'pointer',
                            opacity: shuttingDown() ? 0.6 : 1
                        }}
                        title="Shutdown backend"
                        disabled={shuttingDown()}
                    >
                        <Trash2 size={14} />
                        {shuttingDown() ? 'SHUTTING...' : 'SHUTDOWN'}
                    </button>
                </div>
            </div>

            <div style={{ "overflow-y": 'auto', "flex": 1, "padding-right": "8px" }}>
                {/* Storage Monitor - Only show on ESSENTIAL tab */}
                <Show when={activeTab() === 'ESSENTIAL' && diskSpace()}>
                    <div class="fade-in" style={{
                        padding: '20px',
                        border: `2px solid ${isLowSpace() ? '#ff6b6b' : 'var(--border-std)'}`,
                        "margin-bottom": '24px',
                        background: isLowSpace() ? 'rgba(255, 107, 107, 0.05)' : 'var(--bg-panel)'
                    }}>
                        <div style={{ display: 'flex', "align-items": 'center', gap: '12px', "margin-bottom": '16px' }}>
                            <div style={{
                                width: '40px', height: '40px',
                                display: 'flex', "align-items": 'center', "justify-content": 'center',
                                border: `1px solid ${isLowSpace() ? '#ff6b6b' : 'var(--accent-primary)'}`,
                                background: isLowSpace() ? 'rgba(255, 107, 107, 0.1)' : 'transparent'
                            }}>
                                {isLowSpace() ?
                                    <AlertTriangle size={20} color="#ff6b6b" /> :
                                    <HardDrive size={20} color="var(--accent-primary)" />
                                }
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ "font-weight": 700, "font-size": '16px', "text-transform": 'uppercase' }}>
                                    WSL Storage Monitor
                                </div>
                                <div style={{ "font-size": '12px', color: 'var(--text-muted)', "font-family": 'var(--font-stack)' }}>
                                    {isLowSpace() ? '⚠ WARNING: Low disk space!' : 'Storage status healthy'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', "grid-template-columns": 'repeat(4, 1fr)', gap: '12px' }}>
                            <div>
                                <div style={{ "font-size": '11px', color: 'var(--text-muted)', "text-transform": 'uppercase', "margin-bottom": '4px' }}>Total</div>
                                <div style={{ "font-weight": 700, "font-family": 'var(--font-stack)' }}>{diskSpace()!.total}</div>
                            </div>
                            <div>
                                <div style={{ "font-size": '11px', color: 'var(--text-muted)', "text-transform": 'uppercase', "margin-bottom": '4px' }}>Used</div>
                                <div style={{ "font-weight": 700, "font-family": 'var(--font-stack)' }}>{diskSpace()!.used}</div>
                            </div>
                            <div>
                                <div style={{ "font-size": '11px', color: 'var(--text-muted)', "text-transform": 'uppercase', "margin-bottom": '4px' }}>Available</div>
                                <div style={{ "font-weight": 700, "font-family": 'var(--font-stack)', color: isLowSpace() ? '#ff6b6b' : 'var(--text-main)' }}>{diskSpace()!.available}</div>
                            </div>
                            <div>
                                <div style={{ "font-size": '11px', color: 'var(--text-muted)', "text-transform": 'uppercase', "margin-bottom": '4px' }}>Usage</div>
                                <div style={{ "font-weight": 700, "font-family": 'var(--font-stack)', color: isLowSpace() ? '#ff6b6b' : 'var(--text-main)' }}>{diskSpace()!.usedPercent}</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ "margin-top": '16px', height: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-std)', overflow: 'hidden' }}>
                            <div class="smooth-transition" style={{
                                height: '100%',
                                width: diskSpace()!.usedPercent,
                                background: isLowSpace() ?
                                    'linear-gradient(90deg, #ff6b6b, #ff8787)' :
                                    'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                            }} />
                        </div>
                    </div>
                </Show>

                {/* System Tools Section (NPM Health) - Only show on TOOLS tab */}
                <Show when={activeTab() === 'TOOLS' && npmHealth()}>
                    <div class="fade-in smooth-transition" style={{
                        padding: '20px',
                        border: '1px solid var(--border-std)',
                        "margin-bottom": '24px',
                        display: 'flex', "flex-direction": 'column', gap: '12px',
                        background: 'var(--bg-panel)'
                    }}>
                        <div style={{ display: 'flex', "justify-content": 'space-between', "align-items": 'center' }}>
                            <div style={{ "font-weight": 700, "font-size": '14px' }}>WSL NPM HEALTH CHECK</div>
                            <button onClick={handleFixNpm} style={{ "font-size": '12px', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '4px 8px' }}>
                                FIX NPM ENVIRONMENT
                            </button>
                        </div>
                        <div style={{ display: 'grid', "grid-template-columns": '1fr 1fr', gap: '16px' }}>
                            <div style={{ "font-size": '13px' }}>Node: {npmHealth()!.nodeInstalled ? (npmHealth()!.isWindowsNode ? '⚠ Windows (Bad)' : '✓ Linux (Good)') : '✗ Not Found'}</div>
                            <div style={{ "font-size": '13px' }}>npm: {npmHealth()!.npmInstalled ? (npmHealth()!.isWindowsNpm ? '⚠ Windows (Bad)' : '✓ Linux (Good)') : '✗ Not Found'}</div>
                        </div>
                    </div>
                </Show>

                {/* Tools Grid */}
                <div style={{ display: 'grid', "grid-template-columns": 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', "padding-bottom": '40px' }}>
                    <For each={getVisibleTools()}>
                        {(tool) => {
                            const status = () => toolStatuses().get(tool.id);
                            const isChecking = () => checkingTools().has(tool.id);
                            const authStatus = () => authStatuses().get(tool.id);
                            const isInstalledWsl = () => status()?.status === 'installed_wsl';

                            return (
                                <div class={`fade-in smooth-transition ${isInstalledWsl() ? 'glow-pulse' : ''}`} style={{
                                    height: '320px',
                                    padding: '20px',
                                    border: `1px solid ${getToolStatusColor(tool.id)}`,
                                    display: 'flex',
                                    "flex-direction": 'column',
                                    gap: '12px',
                                    "position": 'relative',
                                    "background": 'var(--bg-panel)',
                                    "overflow": 'hidden'
                                }}>
                                    <div style={{ display: 'flex', "align-items": 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px',
                                            "background": 'transparent',
                                            border: `1px solid ${getToolStatusColor(tool.id)}`,
                                            display: 'flex', "align-items": 'center', "justify-content": 'center',
                                            "flex-shrink": 0
                                        }}>
                                            <Terminal size={20} color={getToolStatusColor(tool.id)} />
                                        </div>
                                        <div style={{ flex: 1, "overflow": 'hidden' }}>
                                            <div style={{ "font-weight": 700, "font-size": '16px', "text-transform": 'uppercase', "white-space": 'nowrap', "overflow": 'hidden', "text-overflow": 'ellipsis' }}>
                                                {tool.name}
                                            </div>
                                            <div style={{ "font-size": '11px', color: getToolStatusColor(tool.id), "font-family": 'var(--font-stack)', "height": '16px' }}>
                                                {isChecking() ?
                                                    <RandomCharAnimation length={12} class="fade-in" style={{ color: 'var(--accent-primary)' }} /> :
                                                    getToolStatusText(tool.id)
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Auth Status Display */}
                                    <Show when={authStatus() && (tool.id === 'railway' || tool.id === 'gh-cli')}>
                                        <div style={{
                                            padding: '4px 8px',
                                            background: authStatus()!.authenticated ? 'rgba(74, 222, 128, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                                            border: `1px solid ${authStatus()!.authenticated ? '#4ade80' : '#facc15'}`,
                                            "font-size": '11px',
                                            "font-family": 'var(--font-stack)'
                                        }}>
                                            <div style={{ display: 'flex', "align-items": 'center', gap: '8px' }}>
                                                <div style={{ color: authStatus()!.authenticated ? '#4ade80' : '#facc15' }}>
                                                    {authStatus()!.authenticated ? '✓ Authenticated' : '⚠ Not Logged In'}
                                                </div>
                                            </div>
                                        </div>
                                    </Show>

                                    <div style={{
                                        "font-size": '14px',
                                        color: 'var(--text-main)',
                                        "line-height": 1.4,
                                        "font-family": 'var(--font-stack)',
                                        "flex": 1,
                                        "overflow": 'hidden',
                                        "display": '-webkit-box',
                                        "-webkit-line-clamp": 8,
                                        "-webkit-box-orient": 'vertical'
                                    }}>
                                        {tool.description}
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', "margin-top": 'auto' }}>
                                        <button
                                            class="smooth-transition hover-scale"
                                            onClick={() => handleInstall(tool)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'transparent',
                                                border: '1px solid #4ade80',
                                                color: '#4ade80',
                                                "font-size": '13px',
                                                "font-weight": 700,
                                                display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '8px',
                                                "text-transform": 'uppercase',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#4ade80';
                                                e.currentTarget.style.color = 'var(--bg-app)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = '#4ade80';
                                            }}
                                        >
                                            <Download size={14} />
                                            {status()?.status === 'installed_wsl' ? 'REINSTALL' : 'INSTALL'}
                                        </button>

                                        <Show when={status()?.status !== 'not_installed'}>
                                            <button
                                                class="smooth-transition"
                                                onClick={() => handleUninstall(tool)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'transparent',
                                                    border: '1px solid #ff6b6b',
                                                    color: '#ff6b6b',
                                                    "font-size": '13px',
                                                    display: 'flex', "align-items": 'center', "justify-content": 'center',
                                                    cursor: 'pointer'
                                                }}
                                                title="Uninstall"
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#ff6b6b';
                                                    e.currentTarget.style.color = 'var(--bg-app)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = '#ff6b6b';
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </Show>

                                        {/* Auth button for Railway and GitHub CLI */}
                                        <Show when={tool.id === 'railway' || tool.id === 'gh-cli'}>
                                            <button
                                                class="smooth-transition"
                                                onClick={() => {
                                                    const loginCmd = tool.id === 'railway' ? 'railway login\r' : 'gh auth login\r';
                                                    props.onInstall(loginCmd);
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'transparent',
                                                    border: authStatus()?.authenticated ? '1px solid #4ade80' : '1px solid #facc15',
                                                    color: authStatus()?.authenticated ? '#4ade80' : '#facc15',
                                                    "font-size": '11px',
                                                    "font-weight": 700,
                                                    "text-transform": 'uppercase',
                                                    cursor: 'pointer',
                                                    "white-space": 'nowrap'
                                                }}
                                                title="Login"
                                                onMouseEnter={(e) => {
                                                    const color = authStatus()?.authenticated ? '#4ade80' : '#facc15';
                                                    e.currentTarget.style.background = color;
                                                    e.currentTarget.style.color = 'var(--bg-app)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    const color = authStatus()?.authenticated ? '#4ade80' : '#facc15';
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = color;
                                                }}
                                            >
                                                LOGIN
                                            </button>
                                        </Show>
                                    </div>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </div>
        </div>
    );
};

export default ToolsPanel;
