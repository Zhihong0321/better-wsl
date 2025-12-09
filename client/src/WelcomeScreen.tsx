import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { Folder, Plus, Upload, ArrowRight, Loader } from 'lucide-solid';
import FileBrowser from './FileBrowser';
import RandomCharAnimation from './components/RandomCharAnimation';
import { io, type Socket } from 'socket.io-client';

interface WelcomeScreenProps {
    onSelectProject: (name: string) => void;
}

export default function WelcomeScreen(props: WelcomeScreenProps) {
    const [projects, setProjects] = createSignal<string[]>([]);
    const [loading, setLoading] = createSignal(true);
    const [newProjectName, setNewProjectName] = createSignal('');
    const [importPath, setImportPath] = createSignal('');
    const [mode, setMode] = createSignal<'list' | 'create' | 'import'>('list');
    const [error, setError] = createSignal('');
    const [showBrowser, setShowBrowser] = createSignal(false);
    const [progressFile, setProgressFile] = createSignal('');
    let socket: Socket;

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/projects');
            const data = await res.json();
            setProjects(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newProjectName()) return;
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName() })
            });
            const data = await res.json();
            if (data.success) {
                props.onSelectProject(newProjectName());
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!importPath()) return;
        setLoading(true);
        setProgressFile('Preparing...');
        try {
            const res = await fetch('http://localhost:3000/api/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ windowsPath: importPath() })
            });
            const data = await res.json();
            if (data.success) {
                props.onSelectProject(data.name);
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setProgressFile('');
        }
    };

    onMount(() => {
        fetchProjects();
        socket = io('http://localhost:3000');
        socket.on('import-progress', (data: { file: string }) => {
            setProgressFile(data.file);
        });
    });

    onCleanup(() => {
        if (socket) socket.disconnect();
    });

    return (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', "align-items": 'center', "justify-content": 'center',
            background: 'var(--bg-app)',
            color: 'var(--text-std)',
            position: 'relative',
            "font-family": 'var(--font-stack)'
        }}>
            <div class="scale-in" style={{
                width: '600px',
                "min-height": '400px',
                "max-height": '90vh',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-std)',
                display: 'flex',
                "flex-direction": 'column',
                "box-shadow": '0 20px 50px rgba(0,0,0,0.5)',
                "overflow": 'hidden'
            }}>
                {/* Header */}
                <div class="fade-in" style={{
                    padding: '24px',
                    "border-bottom": '1px solid var(--border-std)',
                    display: 'flex', "align-items": 'center', gap: '12px'
                }}>
                    <div class="glow-pulse" style={{
                        width: '40px', height: '40px',
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-app)',
                        display: 'flex', "align-items": 'center', "justify-content": 'center'
                    }}>
                        <span style={{ "font-size": '24px', "font-weight": 'bold' }}>B</span>
                    </div>
                    <div>
                        <h1 style={{ margin: 0, "font-size": '20px', "text-transform": 'uppercase', "letter-spacing": '2px' }}>Better WSL</h1>
                        <div style={{ "font-size": '12px', color: 'var(--text-muted)' }}>WSL Development Environment</div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ 
                    flex: 1, 
                    padding: showBrowser() ? '0' : '24px', 
                    position: 'relative',
                    display: 'flex',
                    "flex-direction": 'column',
                    overflow: 'hidden',
                    "min-height": 0 // Critical for flex scrolling
                }}>
                    <Show when={!loading()} fallback={
                        <div class="fade-in-slow" style={{ 
                            display: 'flex', 
                            "flex-direction": 'column',
                            "align-items": 'center', 
                            "justify-content": 'center', 
                            height: '100%', 
                            gap: '20px' 
                        }}>
                            <RandomCharAnimation 
                                length={32} 
                                gradient={true} 
                                style={{ "font-size": '24px' }}
                            />
                            <div style={{ display: 'flex', "align-items": 'center', gap: '10px', color: 'var(--text-muted)' }}>
                                <Loader class="spin" /> 
                                <span>
                                    {progressFile() ? 'Importing Files...' : 'Initializing...'}
                                </span>
                            </div>
                            <Show when={progressFile()}>
                                <div style={{
                                    "font-family": 'monospace',
                                    "font-size": '12px',
                                    "color": 'var(--text-muted)',
                                    "max-width": '400px',
                                    "white-space": 'nowrap',
                                    "overflow": 'hidden',
                                    "text-overflow": 'ellipsis'
                                }}>
                                    {progressFile()}
                                </div>
                            </Show>
                        </div>
                    }>
                        <Show when={error()}>
                            <div style={{
                                padding: '12px', background: 'rgba(255, 0, 0, 0.1)',
                                border: '1px solid red', color: 'red', "margin-bottom": '16px'
                            }}>
                                {error()}
                            </div>
                        </Show>

                        <Show when={mode() === 'list'}>
                            <h2 class="fade-in" style={{ "font-size": '14px', "text-transform": 'uppercase', color: 'var(--text-muted)', "margin-bottom": '16px' }}>Select Project</h2>

                            <div style={{
                                display: 'grid', "grid-template-columns": '1fr 1fr', gap: '12px', "margin-bottom": '24px',
                                "max-height": '300px', "overflow-y": 'auto'
                            }}>
                                <For each={projects()}>
                                    {(project) => (
                                        <button
                                            class="fade-in smooth-transition hover-lift"
                                            onClick={() => props.onSelectProject(project)}
                                            style={{
                                                display: 'flex', "align-items": 'center', gap: '10px',
                                                padding: '16px',
                                                background: 'var(--bg-app)',
                                                border: '1px solid var(--border-subtle)',
                                                color: 'var(--text-std)',
                                                cursor: 'pointer',
                                                "text-align": 'left'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                            }}
                                        >
                                            <Folder size={20} color="var(--accent-primary)" />
                                            <span style={{ "font-weight": 600 }}>{project}</span>
                                        </button>
                                    )}
                                </For>
                            </div>

                            <div style={{ display: 'grid', "grid-template-columns": '1fr 1fr', gap: '12px', "border-top": '1px solid var(--border-subtle)', "padding-top": '24px' }}>
                                <button
                                    class="smooth-transition"
                                    onClick={() => setMode('create')}
                                    style={{
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px dashed var(--text-muted)',
                                        color: 'var(--text-muted)',
                                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-std)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <Plus size={16} /> Create New Folder
                                </button>
                                <button
                                    class="smooth-transition"
                                    onClick={() => { setMode('import'); setShowBrowser(false); }}
                                    style={{
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px dashed var(--text-muted)',
                                        color: 'var(--text-muted)',
                                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-std)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <Upload size={16} /> Import from Windows
                                </button>
                            </div>
                        </Show>

                        <Show when={mode() === 'create'}>
                            <h2 style={{ "font-size": '14px', "text-transform": 'uppercase', color: 'var(--text-muted)', "margin-bottom": '16px' }}>Create New Project</h2>
                            <input
                                class="fade-in smooth-transition"
                                type="text"
                                placeholder="Project Name (e.g. my-app)"
                                value={newProjectName()}
                                onInput={(e) => setNewProjectName(e.currentTarget.value)}
                                style={{
                                    width: '100%', padding: '12px', background: 'var(--bg-app)',
                                    border: '1px solid var(--border-std)', color: 'var(--text-std)',
                                    "font-family": 'var(--font-stack)', "margin-bottom": '16px'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    class="smooth-transition hover-scale"
                                    onClick={handleCreate}
                                    disabled={!newProjectName()}
                                    style={{
                                        flex: 1, padding: '12px', background: 'var(--accent-primary)',
                                        color: 'var(--bg-app)', border: 'none', "font-weight": 'bold',
                                        cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '8px'
                                    }}
                                >
                                    CREATE <ArrowRight size={16} />
                                </button>
                                <button
                                    class="smooth-transition"
                                    onClick={() => { setMode('list'); setError(''); }}
                                    style={{
                                        width: '100px', padding: '12px', background: 'transparent',
                                        color: 'var(--text-muted)', border: '1px solid var(--border-std)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    CANCEL
                                </button>
                            </div>
                        </Show>

                        <Show when={mode() === 'import'}>
                            <Show when={!showBrowser()}>
                                <h2 style={{ "font-size": '14px', "text-transform": 'uppercase', color: 'var(--text-muted)', "margin-bottom": '16px' }}>Import Folder</h2>
                                <p style={{ "font-size": '12px', color: 'var(--text-muted)', "margin-bottom": '16px' }}>
                                    Select a folder from your Windows PC. It will be copied into the secure WSL workspace.
                                </p>

                                <div style={{ "margin-bottom": '16px' }}>
                                    <div style={{
                                        display: 'flex', gap: '8px', "margin-bottom": '8px',
                                        padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-std)',
                                        color: 'var(--text-std)', "font-family": 'monospace'
                                    }}>
                                        {importPath() || 'No folder selected'}
                                    </div>
                                    <button
                                        onClick={() => setShowBrowser(true)}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'var(--bg-panel)',
                                            border: '1px solid var(--border-std)',
                                            color: 'var(--accent-primary)',
                                            cursor: 'pointer',
                                            "font-size": '12px',
                                            "font-weight": 'bold'
                                        }}
                                    >
                                        BROWSE...
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={handleImport}
                                        disabled={!importPath()}
                                        style={{
                                            flex: 1, padding: '12px', background: 'var(--accent-primary)',
                                            color: 'var(--bg-app)', border: 'none', "font-weight": 'bold',
                                            cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '8px',
                                            opacity: importPath() ? 1 : 0.5
                                        }}
                                    >
                                        IMPORT SELECTED <Upload size={16} />
                                    </button>
                                    <button
                                        onClick={() => { setMode('list'); setError(''); setImportPath(''); }}
                                        style={{
                                            width: '100px', padding: '12px', background: 'transparent',
                                            color: 'var(--text-muted)', border: '1px solid var(--border-std)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </Show>

                            <Show when={showBrowser()}>
                                <div style={{ 
                                    flex: 1, 
                                    height: '100%', 
                                    overflow: 'hidden',
                                    display: 'flex', 
                                    "flex-direction": 'column',
                                    "min-height": 0 // Critical for flex scrolling
                                }}>
                                    <FileBrowser
                                        initialPath="~/better-cli-workspace"
                                        onSelect={(path) => {
                                            setImportPath(path);
                                            setShowBrowser(false);
                                        }}
                                        onCancel={() => setShowBrowser(false)}
                                    />
                                </div>
                            </Show>
                        </Show>

                    </Show>
                </div>
            </div>
        </div>
    );
}
