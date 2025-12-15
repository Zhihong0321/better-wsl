import { type Component, For, createSignal, onMount, Show, createMemo } from 'solid-js';
import { Download, Terminal, Copy, Check, AlertTriangle, RefreshCcw, Code, Box, Sparkles } from 'lucide-solid';

interface Tool {
    id: string;
    name: string;
    description: string;
    category: 'essential' | 'dev' | 'ai';
    detectCommands: string[]; // Multiple ways to detect (broader detection)
    priority: number; // Installation order priority
}

interface SystemInfo {
    distro: string;
    packageManager: 'apt' | 'dnf' | 'unknown';
    hasNode: boolean;
    hasCurl: boolean;
    hasSudo: boolean;
}

interface ToolDetection {
    id: string;
    detected: boolean;
    path?: string;
    version?: string;
}

type TabType = 'ESSENTIAL' | 'DEV' | 'AI';

// Comprehensive tool definitions with multiple detection strategies
const TOOLS: Tool[] = [
    // Essential System Tools
    {
        id: 'sudo',
        name: 'Sudo',
        description: 'Required for installing packages with elevated privileges',
        category: 'essential',
        detectCommands: ['sudo', 'command -v sudo'],
        priority: 1
    },
    {
        id: 'package-manager',
        name: 'Package Manager',
        description: 'DNF (Fedora) or APT (Ubuntu/Debian) for installing system packages',
        category: 'essential',
        detectCommands: ['dnf', 'apt', 'apt-get', 'yum'],
        priority: 2
    },
    {
        id: 'curl',
        name: 'cURL',
        description: 'Essential for downloading files and making HTTP requests',
        category: 'essential',
        detectCommands: ['curl', 'wget'],
        priority: 3
    },
    {
        id: 'git',
        name: 'Git',
        description: 'Version control system - essential for any development work',
        category: 'essential',
        detectCommands: ['git'],
        priority: 4
    },
    {
        id: 'wslview',
        name: 'WSL Browser Bridge',
        description: 'Open URLs in Windows browser from WSL (wslview or xdg-open)',
        category: 'essential',
        detectCommands: ['wslview', 'xdg-open', 'wslu'],
        priority: 5
    },
    
    // Development Tools
    {
        id: 'nodejs',
        name: 'Node.js & npm',
        description: 'JavaScript runtime required for modern development',
        category: 'dev',
        detectCommands: ['node', 'nodejs', 'npm'],
        priority: 10
    },
    {
        id: 'python',
        name: 'Python 3',
        description: 'Python runtime and pip package manager',
        category: 'dev',
        detectCommands: ['python3', 'python', 'pip3', 'pip'],
        priority: 11
    },
    {
        id: 'rust',
        name: 'Rust',
        description: 'Rust programming language and cargo',
        category: 'dev',
        detectCommands: ['rustc', 'cargo'],
        priority: 12
    },
    {
        id: 'docker',
        name: 'Docker',
        description: 'Container runtime for development',
        category: 'dev',
        detectCommands: ['docker'],
        priority: 13
    },
    {
        id: 'postgresql',
        name: 'PostgreSQL',
        description: 'Relational database for development',
        category: 'dev',
        detectCommands: ['psql', 'postgres'],
        priority: 14
    },
    
    // AI Coding Tools
    {
        id: 'gh-cli',
        name: 'GitHub CLI',
        description: 'GitHub command-line tool for PRs, issues, and more',
        category: 'ai',
        detectCommands: ['gh'],
        priority: 20
    },
    {
        id: 'railway',
        name: 'Railway CLI',
        description: 'Deploy applications to Railway from terminal',
        category: 'ai',
        detectCommands: ['railway'],
        priority: 21
    },
    {
        id: 'gemini',
        name: 'Gemini CLI',
        description: 'Google Gemini AI assistant',
        category: 'ai',
        detectCommands: ['gemini'],
        priority: 22
    }
];

interface ToolsNewProps {
    onExecute: (cmd: string) => void;
}

const ToolsNew: Component<ToolsNewProps> = (props) => {
    const [systemInfo, setSystemInfo] = createSignal<SystemInfo | null>(null);
    const [detections, setDetections] = createSignal<Map<string, ToolDetection>>(new Map());
    const [selectedTools, setSelectedTools] = createSignal<Set<string>>(new Set());
    const [activeTab, setActiveTab] = createSignal<TabType>('ESSENTIAL');
    const [scanning, setScanning] = createSignal(false);
    const [promptGenerated, setPromptGenerated] = createSignal(false);
    const [generatedPrompt, setGeneratedPrompt] = createSignal('');

    const detectSystemInfo = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/tools/system-info', {
                method: 'POST'
            });
            const data = await res.json();
            setSystemInfo(data);
        } catch (err) {
            console.error('Failed to detect system info:', err);
        }
    };

    const scanTools = async () => {
        setScanning(true);
        const detected = new Map<string, ToolDetection>();

        try {
            for (const tool of TOOLS) {
                const res = await fetch('http://localhost:3000/api/tools/detect-broad', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        toolId: tool.id,
                        detectCommands: tool.detectCommands 
                    })
                });
                const data = await res.json();
                detected.set(tool.id, data);
            }
            setDetections(detected);
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setScanning(false);
        }
    };

    const toggleTool = (toolId: string) => {
        const current = new Set(selectedTools());
        if (current.has(toolId)) {
            current.delete(toolId);
        } else {
            current.add(toolId);
        }
        setSelectedTools(current);
    };

    const generatePrompt = () => {
        const sysInfo = systemInfo();
        if (!sysInfo) return;

        const missing = TOOLS
            .filter(t => selectedTools().has(t.id) && !detections().get(t.id)?.detected)
            .sort((a, b) => a.priority - b.priority);

        if (missing.length === 0) {
            alert('All selected tools are already installed!');
            return;
        }

        const distroInfo = `${sysInfo.distro} with ${sysInfo.packageManager.toUpperCase()} package manager`;
        
        let prompt = `# AI Agent Installation Task

## System Environment
- **Environment**: WSL (Windows Subsystem for Linux)
- **Distribution**: ${distroInfo}
- **Package Manager**: ${sysInfo.packageManager}
- **Available Tools**: ${sysInfo.hasSudo ? 'sudo ✓' : 'sudo ✗'}, ${sysInfo.hasCurl ? 'curl ✓' : 'curl ✗'}, ${sysInfo.hasNode ? 'Node.js ✓' : 'Node.js ✗'}

## Task: Install Required Development Tools

**IMPORTANT INSTRUCTIONS:**
1. **Understand the system first** - Check the distribution and available package managers
2. **Follow CDE Rules** (Check-Detect-Execute):
   - CHECK: Verify each tool isn't already installed before installing
   - DETECT: Identify the correct package manager and installation method
   - EXECUTE: Run installation commands with proper error handling
3. **Cross-Distribution Compatibility**: Use conditional commands that work on both Fedora (dnf) and Ubuntu (apt)
4. **Verify After Install**: Confirm each tool is accessible after installation

## Tools to Install (Priority Order)

`;

        missing.forEach((tool, idx) => {
            prompt += `${idx + 1}. **${tool.name}**
   - Description: ${tool.description}
   - Detection: Check for ${tool.detectCommands.join(' or ')}
   
`;
        });

        prompt += `
## Installation Guidelines

### Cross-Distro Installation Pattern
\`\`\`bash
# Example pattern for each tool
if command -v <tool> &> /dev/null; then
    echo "✓ <tool> already installed"
else
    if command -v dnf &> /dev/null; then
        sudo dnf install -y <package-name>
    else
        sudo apt update && sudo apt install -y <package-name>
    fi
fi
\`\`\`

### Special Cases
- **Node.js**: Use fnm or nvm for version management, avoid system Node.js
- **WSL Browser**: Fedora needs manual wslu build, Ubuntu has package
- **npm globals**: Install to ~/.npm-global to avoid permission issues

## Expected Output
After completion, verify each tool:
\`\`\`bash
${missing.map(t => t.detectCommands[0] + ' --version').join('\n')}
\`\`\`

---
**Remember**: Always check first, handle errors gracefully, and verify installation success.
`;

        setGeneratedPrompt(prompt);
        setPromptGenerated(true);
    };

    const copyPrompt = () => {
        navigator.clipboard.writeText(generatedPrompt());
        alert('Prompt copied to clipboard! Paste it to your AI coding agent.');
    };

    const resetSelection = () => {
        setSelectedTools(new Set<string>());
        setPromptGenerated(false);
        setGeneratedPrompt('');
    };

    const autoSelectMissing = () => {
        const missing = new Set<string>();
        TOOLS.forEach(tool => {
            if (!detections().get(tool.id)?.detected) {
                missing.add(tool.id);
            }
        });
        setSelectedTools(missing);
    };

    onMount(() => {
        detectSystemInfo();
        scanTools();
    });

    const getTabTools = createMemo(() => {
        const tab = activeTab();
        return TOOLS.filter(t => {
            if (tab === 'ESSENTIAL') return t.category === 'essential';
            if (tab === 'DEV') return t.category === 'dev';
            if (tab === 'AI') return t.category === 'ai';
            return false;
        });
    });

    const getDetectionStatus = (toolId: string) => {
        const detection = detections().get(toolId);
        if (!detection) return { color: 'var(--text-muted)', text: 'Scanning...', detected: false };
        if (detection.detected) {
            return { 
                color: '#4ade80', 
                text: `✓ Installed${detection.version ? ` (${detection.version})` : ''}`,
                detected: true
            };
        }
        return { color: '#ff6b6b', text: '✗ Not Found', detected: false };
    };

    const missingCount = createMemo(() => {
        let count = 0;
        detections().forEach(d => { if (!d.detected) count++; });
        return count;
    });

    const selectedCount = createMemo(() => selectedTools().size);

    return (
        <div style={{ 
            padding: '24px', 
            height: '100%', 
            display: 'flex', 
            'flex-direction': 'column',
            background: 'var(--bg-app)',
            gap: '24px'
        }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                'justify-content': 'space-between', 
                'align-items': 'center',
                'border-bottom': '1px solid var(--border-std)',
                'padding-bottom': '16px'
            }}>
                <div>
                    <h1 style={{ margin: 0, 'font-size': '20px', 'text-transform': 'uppercase' }}>
                        Tool Manager 2.0
                    </h1>
                    <Show when={systemInfo()}>
                        <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-top': '4px' }}>
                            {systemInfo()!.distro} • {systemInfo()!.packageManager.toUpperCase()} • {missingCount()} Missing
                        </div>
                    </Show>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => { detectSystemInfo(); scanTools(); }}
                        disabled={scanning()}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid var(--accent-primary)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            opacity: scanning() ? 0.5 : 1
                        }}
                    >
                        <RefreshCcw size={14} />
                        {scanning() ? 'SCANNING...' : 'RESCAN'}
                    </button>

                    <button
                        onClick={autoSelectMissing}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid var(--accent-secondary)',
                            color: 'var(--accent-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        SELECT ALL MISSING
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '16px' }}>
                <button
                    onClick={() => setActiveTab('ESSENTIAL')}
                    style={{
                        padding: '8px 16px',
                        background: activeTab() === 'ESSENTIAL' ? 'var(--bg-active)' : 'transparent',
                        border: `1px solid ${activeTab() === 'ESSENTIAL' ? 'var(--accent-primary)' : 'transparent'}`,
                        color: activeTab() === 'ESSENTIAL' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        'font-weight': activeTab() === 'ESSENTIAL' ? 'bold' : 'normal',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '8px'
                    }}
                >
                    <Box size={16} /> ESSENTIAL
                </button>

                <button
                    onClick={() => setActiveTab('DEV')}
                    style={{
                        padding: '8px 16px',
                        background: activeTab() === 'DEV' ? 'var(--bg-active)' : 'transparent',
                        border: `1px solid ${activeTab() === 'DEV' ? 'var(--accent-primary)' : 'transparent'}`,
                        color: activeTab() === 'DEV' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        'font-weight': activeTab() === 'DEV' ? 'bold' : 'normal',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '8px'
                    }}
                >
                    <Terminal size={16} /> DEVELOPMENT
                </button>

                <button
                    onClick={() => setActiveTab('AI')}
                    style={{
                        padding: '8px 16px',
                        background: activeTab() === 'AI' ? 'var(--bg-active)' : 'transparent',
                        border: `1px solid ${activeTab() === 'AI' ? 'var(--accent-primary)' : 'transparent'}`,
                        color: activeTab() === 'AI' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        'font-weight': activeTab() === 'AI' ? 'bold' : 'normal',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '8px'
                    }}
                >
                    <Code size={16} /> AI TOOLS
                </button>
            </div>

            {/* Tools List */}
            <div style={{ flex: 1, 'overflow-y': 'auto', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
                <For each={getTabTools()}>
                    {(tool) => {
                        const status = getDetectionStatus(tool.id);
                        const isSelected = () => selectedTools().has(tool.id);

                        return (
                            <div 
                                onClick={() => toggleTool(tool.id)}
                                style={{
                                    padding: '16px',
                                    border: `2px solid ${isSelected() ? 'var(--accent-primary)' : status.color}`,
                                    background: isSelected() ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-panel)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '16px',
                                    'align-items': 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {/* Checkbox */}
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    border: `2px solid ${isSelected() ? 'var(--accent-primary)' : 'var(--border-std)'}`,
                                    background: isSelected() ? 'var(--accent-primary)' : 'transparent',
                                    display: 'flex',
                                    'align-items': 'center',
                                    'justify-content': 'center'
                                }}>
                                    <Show when={isSelected()}>
                                        <Check size={16} color="var(--bg-app)" />
                                    </Show>
                                </div>

                                {/* Icon */}
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    border: `1px solid ${status.color}`,
                                    display: 'flex',
                                    'align-items': 'center',
                                    'justify-content': 'center'
                                }}>
                                    <Terminal size={20} color={status.color} />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        'font-weight': 'bold', 
                                        'font-size': '16px',
                                        'margin-bottom': '4px'
                                    }}>
                                        {tool.name}
                                    </div>
                                    <div style={{ 
                                        'font-size': '12px', 
                                        color: 'var(--text-muted)',
                                        'margin-bottom': '8px'
                                    }}>
                                        {tool.description}
                                    </div>
                                    <div style={{ 
                                        'font-size': '11px', 
                                        color: status.color,
                                        'font-family': 'monospace'
                                    }}>
                                        {status.text}
                                    </div>
                                </div>

                                {/* Priority Badge */}
                                <div style={{
                                    padding: '4px 8px',
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border-std)',
                                    'font-size': '10px',
                                    'font-family': 'monospace'
                                }}>
                                    P{tool.priority}
                                </div>
                            </div>
                        );
                    }}
                </For>
            </div>

            {/* Action Bar */}
            <Show when={selectedCount() > 0}>
                <div style={{
                    padding: '16px',
                    background: 'var(--bg-panel)',
                    border: '2px solid var(--accent-primary)',
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center'
                }}>
                    <div>
                        <div style={{ 'font-weight': 'bold', 'font-size': '14px' }}>
                            {selectedCount()} Tool{selectedCount() > 1 ? 's' : ''} Selected
                        </div>
                        <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>
                            Ready to generate AI installation prompt
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={resetSelection}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid var(--text-muted)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            CLEAR
                        </button>

                        <Show when={!promptGenerated()}>
                            <button
                                onClick={generatePrompt}
                                style={{
                                    padding: '8px 24px',
                                    background: 'var(--accent-primary)',
                                    border: 'none',
                                    color: 'var(--bg-app)',
                                    'font-weight': 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '8px'
                                }}
                            >
                                <Sparkles size={16} />
                                GENERATE AI PROMPT
                            </button>
                        </Show>

                        <Show when={promptGenerated()}>
                            <button
                                onClick={copyPrompt}
                                style={{
                                    padding: '8px 24px',
                                    background: '#4ade80',
                                    border: 'none',
                                    color: 'var(--bg-app)',
                                    'font-weight': 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '8px'
                                }}
                            >
                                <Copy size={16} />
                                COPY PROMPT
                            </button>
                        </Show>
                    </div>
                </div>
            </Show>

            {/* Prompt Display */}
            <Show when={promptGenerated()}>
                <div style={{
                    padding: '16px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--accent-secondary)',
                    'max-height': '300px',
                    'overflow-y': 'auto'
                }}>
                    <pre style={{ 
                        margin: 0, 
                        'font-size': '11px', 
                        'line-height': '1.5',
                        'white-space': 'pre-wrap',
                        'font-family': 'monospace'
                    }}>
                        {generatedPrompt()}
                    </pre>
                </div>
            </Show>
        </div>
    );
};

export default ToolsNew;
