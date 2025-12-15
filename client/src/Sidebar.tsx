import { type Component, For, Show, createSignal } from 'solid-js';
import { Terminal, Plus, Wrench, Monitor, Settings as SettingsIcon, GitBranch, Clock, Clipboard, Network, FolderOpen, RotateCcw, Send, X } from 'lucide-solid';
import ClipboardManager from './components/ClipboardManager';

interface GitInfo {
    isGit: boolean;
    remoteUrl?: string;
    branch?: string;
    lastCommit?: {
        hash: string;
        date: string;
        message: string;
    };
    commits?: {
        hash: string;
        date: string;
        message: string;
    }[];
}

interface SidebarProps {
    sessions: { id: string; project?: string }[];
    activeId: string | null;
    activeView: 'sessions' | 'tools' | 'settings' | 'clipboard' | 'autopilot';
    onSelect: (id: string | null) => void;
    onCreate: () => void;
    onViewChange: (view: 'sessions' | 'tools' | 'settings' | 'clipboard' | 'autopilot') => void;
    onInsert: (text: string) => void;
    projectName: string;
    sessionStates?: Record<string, 'waiting' | 'processing'>;
    gitInfo?: GitInfo | null;
    ctrlCBehavior: 'copy' | 'cancel';
    newlineKey?: 'shift+enter' | 'ctrl+enter' | 'alt+enter' | 'none';
    cancelKey?: 'ctrl+end' | 'ctrl+break' | 'ctrl+d' | 'esc' | 'none';
    onDuplicate: () => void;
    onOpenExplorer: (sessionId: string) => void;
    onCheckout: (hash: string) => void;
    onCommit?: () => void;
    onCloseSession: (sessionId: string) => void;
}

const Sidebar: Component<SidebarProps> = (props) => {
    const [showHistory, setShowHistory] = createSignal(false);
    const [showCommit, setShowCommit] = createSignal(false);
    const [commitMsg, setCommitMsg] = createSignal('');
    const [isCommitting, setIsCommitting] = createSignal(false);

    const handleCommit = async () => {
        if (!commitMsg()) return;
        setIsCommitting(true);
        try {
             const res = await fetch(`http://localhost:3000/api/projects/${props.projectName}/git-commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: commitMsg() })
            });
            if (res.ok) {
                setCommitMsg('');
                setShowCommit(false);
                props.onCommit?.();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCommitting(false);
        }
    };

    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    return (
        <div class="slide-in-left" style={{
            width: '340px',
            height: '100%',
            "background-color": 'var(--bg-sidebar)',
            "border-right": '1px solid var(--border-subtle)',
            display: 'flex',
            "flex-direction": 'column',
            "z-index": 10
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                display: 'flex',
                "flex-direction": 'column',
                gap: '8px',
                "border-bottom": '1px solid var(--border-std)'
            }}>
                <div style={{ display: 'flex', "align-items": 'center', gap: '8px', "font-weight": 600 }}>
                    <div style={{
                        width: '24px', height: '24px',
                        "background": 'var(--accent-primary)',
                        color: 'var(--bg-app)',
                        display: 'flex', "align-items": 'center', "justify-content": 'center'
                    }}>
                        <Terminal size={14} />
                    </div>
                    <span style={{ "letter-spacing": '2px', "text-transform": 'uppercase' }}>Better WSL</span>
                </div>
                <div style={{ "font-size": '10px', color: 'var(--text-muted)', "font-family": 'var(--font-stack)', "padding-left": '32px' }}>
                    ~/{props.projectName}
                </div>

                <Show when={props.gitInfo?.isGit}>
                    <div class="fade-in" style={{
                        "margin-top": '8px',
                        "padding": '8px',
                        "background": 'rgba(255, 255, 255, 0.03)',
                        "border": '1px solid var(--border-subtle)',
                        "font-size": '10px',
                        "display": 'flex', "flex-direction": 'column', gap: '4px'
                    }}>
                        <div style={{ display: 'flex', "align-items": 'center', "justify-content": 'space-between' }}>
                            <div style={{ display: 'flex', "align-items": 'center', gap: '6px', color: 'var(--accent-primary)' }}>
                                <GitBranch size={12} />
                                <span style={{ "text-overflow": 'ellipsis', overflow: 'hidden', "white-space": 'nowrap' }}>
                                    {props.gitInfo?.remoteUrl ? props.gitInfo.remoteUrl.split('/').pop()?.replace('.git', '') : 'Local Repo'}
                                </span>
                                <Show when={props.gitInfo?.branch}>
                                    <span style={{ 
                                        color: props.gitInfo?.branch?.includes('HEAD') ? 'orange' : 'var(--text-muted)',
                                        "margin-left": '4px' 
                                    }}>
                                        [{props.gitInfo?.branch}]
                                    </span>
                                </Show>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div 
                                    onClick={() => setShowCommit(!showCommit())}
                                    style={{ cursor: 'pointer', color: showCommit() ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                    title="Commit Changes"
                                >
                                    <Send size={12} />
                                </div>
                                <div 
                                    onClick={() => setShowHistory(!showHistory())}
                                    style={{ cursor: 'pointer', color: showHistory() ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                    title="History / Time Travel"
                                >
                                    <RotateCcw size={12} />
                                </div>
                            </div>
                        </div>
                        
                        <Show when={showCommit()}>
                            <div class="fade-in" style={{
                                "margin-top": '4px', "padding": '4px',
                                "background": 'rgba(0,0,0,0.2)', "border-radius": '4px',
                                "display": 'flex', "flex-direction": 'column', gap: '4px'
                            }}>
                                <input
                                    type="text"
                                    value={commitMsg()}
                                    onInput={(e) => setCommitMsg(e.currentTarget.value)}
                                    placeholder="Commit message..."
                                    style={{
                                        "background": 'transparent', "border": 'none', "border-bottom": '1px solid var(--border-subtle)',
                                        "color": 'white', "font-size": '11px', "padding": '4px', "outline": 'none', "width": '100%'
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                                />
                                <button
                                    onClick={handleCommit}
                                    disabled={isCommitting() || !commitMsg()}
                                    style={{
                                        "align-self": 'flex-end', "background": 'var(--accent-primary)', "color": 'var(--bg-app)',
                                        "border": 'none', "border-radius": '2px', "padding": '2px 8px', "font-size": '10px',
                                        "font-weight": 700, "cursor": 'pointer', "opacity": (isCommitting() || !commitMsg()) ? 0.5 : 1
                                    }}
                                >
                                    {isCommitting() ? '...' : 'Commit'}
                                </button>
                            </div>
                        </Show>

                        <Show when={props.gitInfo?.lastCommit}>
                            <div style={{ display: 'flex', "align-items": 'center', gap: '6px', color: '#ececec', "font-size": '11px', "font-weight": 500 }}>
                                <Clock size={12} />
                                <span>{timeAgo(props.gitInfo!.lastCommit!.date)}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', "padding-left": '18px', "font-style": 'italic' }}>
                                {props.gitInfo!.lastCommit!.message.length > 30
                                    ? props.gitInfo!.lastCommit!.message.substring(0, 30) + '...'
                                    : props.gitInfo!.lastCommit!.message}
                            </div>
                        </Show>
                        
                        <Show when={showHistory() && props.gitInfo?.commits}>
                            <div class="fade-in" style={{
                                "margin-top": '8px',
                                "padding-top": '8px',
                                "border-top": '1px dashed var(--border-subtle)',
                                "display": 'flex', "flex-direction": 'column', gap: '8px',
                                "max-height": '300px',
                                "overflow-y": 'auto'
                            }}>
                                <For each={props.gitInfo!.commits}>
                                    {(commit) => (
                                        <div style={{ display: 'flex', "flex-direction": 'column', gap: '2px', "font-size": '10px', "padding": '4px', "background": 'rgba(0,0,0,0.2)', "border-radius": '4px' }}>
                                            <div style={{ display: 'flex', "align-items": 'center', "justify-content": 'space-between' }}>
                                                <span style={{ color: 'var(--accent-primary)', "font-family": 'monospace' }}>{commit.hash.substring(0, 7)}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>{timeAgo(commit.date)}</span>
                                            </div>
                                            <div style={{ color: '#ececec', "white-space": 'nowrap', "overflow": 'hidden', "text-overflow": 'ellipsis' }}>
                                                {commit.message}
                                            </div>
                                            <button 
                                                onClick={() => props.onCheckout(commit.hash)}
                                                style={{
                                                    "margin-top": '4px',
                                                    "background": 'rgba(255,255,255,0.1)',
                                                    "border": '1px solid var(--border-subtle)',
                                                    "color": 'var(--text-std)',
                                                    "cursor": 'pointer',
                                                    "padding": '2px 4px',
                                                    "border-radius": '2px',
                                                    "align-self": 'flex-start'
                                                }}
                                                class="hover-scale"
                                            >
                                                Checkout
                                            </button>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* Navigation Tabs */}
            <div class="fade-in" style={{ display: 'flex', padding: '12px 12px 0 12px', gap: '0px' }}>
                <button
                    class="smooth-transition"
                    onClick={() => props.onViewChange('sessions')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        "font-size": '12px',
                        "font-weight": 700,
                        "border": '1px solid var(--border-std)',
                        "border-bottom": props.activeView === 'sessions' ? 'none' : '1px solid var(--border-std)',
                        background: props.activeView === 'sessions' ? 'var(--bg-app)' : 'var(--bg-panel)',
                        color: props.activeView === 'sessions' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '6px'
                    }}
                    title="Sessions"
                >
                    <Monitor size={14} />
                </button>
                <button
                    class="smooth-transition"
                    onClick={() => props.onViewChange('autopilot')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        "font-size": '12px',
                        "font-weight": 700,
                        "border": '1px solid var(--border-std)',
                        "border-left": 'none',
                        "border-bottom": props.activeView === 'autopilot' ? 'none' : '1px solid var(--border-std)',
                        background: props.activeView === 'autopilot' ? 'var(--bg-app)' : 'var(--bg-panel)',
                        color: props.activeView === 'autopilot' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '6px'
                    }}
                    title="Auto-Pilot"
                >
                    <Network size={14} />
                </button>
                <button
                    class="smooth-transition"
                    onClick={() => props.onViewChange('clipboard')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        "font-size": '12px',
                        "font-weight": 700,
                        "border": '1px solid var(--border-std)',
                        "border-left": 'none',
                        "border-bottom": props.activeView === 'clipboard' ? 'none' : '1px solid var(--border-std)',
                        background: props.activeView === 'clipboard' ? 'var(--bg-app)' : 'var(--bg-panel)',
                        color: props.activeView === 'clipboard' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '6px'
                    }}
                    title="Clipboard"
                >
                    <Clipboard size={14} />
                </button>
                <button
                    class="smooth-transition"
                    onClick={() => props.onViewChange('tools')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        "font-size": '12px',
                        "font-weight": 700,
                        "border": '1px solid var(--border-std)',
                        "border-left": 'none',
                        "border-bottom": props.activeView === 'tools' ? 'none' : '1px solid var(--border-std)',
                        background: props.activeView === 'tools' ? 'var(--bg-app)' : 'var(--bg-panel)',
                        color: props.activeView === 'tools' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '6px'
                    }}
                    title="Tools"
                >
                    <Wrench size={14} />
                </button>
                <button
                    class="smooth-transition"
                    onClick={() => props.onViewChange('settings')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        "font-size": '12px',
                        "font-weight": 700,
                        "border": '1px solid var(--border-std)',
                        "border-left": 'none',
                        "border-bottom": props.activeView === 'settings' ? 'none' : '1px solid var(--border-std)',
                        background: props.activeView === 'settings' ? 'var(--bg-app)' : 'var(--bg-panel)',
                        color: props.activeView === 'settings' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '6px'
                    }}
                    title="Settings"
                >
                    <SettingsIcon size={14} />
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: '12px', "overflow-y": 'auto' }}>
                <Show when={props.activeView === 'clipboard'} fallback={
                    <>
                        <div style={{
                            "margin-bottom": '8px',
                            display: 'flex', "align-items": 'center', "justify-content": 'space-between'
                        }}>
                            <div style={{
                                "font-size": '11px',
                                "text-transform": 'uppercase',
                                "letter-spacing": '0.5px',
                                color: 'var(--text-muted)'
                            }}>
                                Active Sessions
                            </div>
                            <button
                                onClick={props.onDuplicate}
                                class="smooth-transition hover-scale"
                                style={{
                                    background: 'transparent', border: '1px solid var(--border-std)',
                                    color: 'var(--text-muted)', cursor: 'pointer',
                                    padding: '2px 6px', "border-radius": '4px', "font-size": '10px',
                                    display: 'flex', "align-items": 'center', gap: '4px'
                                }}
                                title="Open new terminal in current project"
                            >
                                <Plus size={10} /> Add
                            </button>
                        </div>

                        <div style={{ display: 'flex', "flex-direction": 'column', gap: '4px' }}>
                            <For each={props.sessions}>
                                {(session) => {
                                    const isActive = () => props.activeId === session.id && (props.activeView === 'sessions' || props.activeView === 'clipboard');
                                    const state = () => props.sessionStates?.[session.id] || 'waiting';
                                    return (
                                        <button
                                            class={`smooth-transition ${isActive() ? (state() === 'processing' ? 'processing-breath' : 'aurora-breath') : 'fade-in'}`}
                                            onClick={() => {
                                                props.onSelect(session.id);
                                                if (props.activeView !== 'clipboard') {
                                                    props.onViewChange('sessions');
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                "align-items": 'center',
                                                gap: '10px',
                                                padding: '8px 12px',
                                                "font-size": '13px',
                                                "text-align": 'left',
                                                background: isActive() ? 'var(--accent-primary)' : 'transparent',
                                                color: isActive() ? 'var(--bg-app)' : 'var(--text-muted)',
                                                "border": '1px solid transparent',
                                                "border-bottom": '1px dotted var(--border-std)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', "flex-direction": 'column', "line-height": '1.2', flex: 1 }}>
                                                <span style={{ "font-family": 'var(--font-stack)', "font-weight": 500 }}>
                                                    {session.project || 'Session'}
                                                </span>
                                                <span style={{
                                                    "font-size": '9px',
                                                    "font-family": 'monospace',
                                                    opacity: 0.7
                                                }}>
                                                    MACHINE: better-cli-{session.id.substring(0, 6)}
                                                </span>
                                            </div>

                                            {/* File Browser Trigger */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    props.onOpenExplorer(session.id);
                                                }}
                                                title="Open File Browser"
                                                style={{
                                                    padding: '4px',
                                                    "border-radius": '4px',
                                                    color: isActive() ? 'var(--bg-app)' : 'var(--text-muted)',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <FolderOpen size={14} />
                                            </div>

                                            {/* Close Session Button */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Close session ${session.project || session.id.substring(0, 6)}?`)) {
                                                        props.onCloseSession(session.id);
                                                    }
                                                }}
                                                title="Close Session"
                                                style={{
                                                    padding: '4px',
                                                    "border-radius": '4px',
                                                    color: isActive() ? 'var(--bg-app)' : '#ff6b6b',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <X size={14} />
                                            </div>
                                        </button>
                                    );
                                }}
                            </For>
                        </div>
                    </>
                }>
                    <ClipboardManager onInsert={props.onInsert} sessionId={props.activeId} />
                </Show>
            </div>

            {/* Shortcuts Guide */}
            <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', "border-top": '1px solid var(--border-std)' }}>
                <div style={{ "margin-bottom": '8px', "font-size": '10px', "font-weight": 'bold', color: 'var(--text-muted)', "text-transform": 'uppercase', "letter-spacing": '1px' }}>
                    Shortcuts
                </div>
                <div style={{ display: 'grid', "grid-template-columns": 'auto 1fr', gap: '6px', "font-size": '11px', color: 'var(--text-std)' }}>
                    <Show when={props.newlineKey && props.newlineKey !== 'none'}>
                        <span style={{ color: 'var(--accent-primary)', "font-family": 'monospace' }}>
                            {props.newlineKey === 'shift+enter' ? 'Shift+Enter' : 
                             props.newlineKey === 'ctrl+enter' ? 'Ctrl+Enter' : 
                             'Alt+Enter'}
                        </span>
                        <span>New Line (AI CLIs)</span>
                    </Show>

                    <span style={{ color: 'var(--accent-primary)', "font-family": 'monospace' }}>Ctrl+C</span>
                    <span style={{ "text-transform": 'capitalize' }}>{props.ctrlCBehavior || 'Copy'}</span>

                    <Show when={props.ctrlCBehavior === 'copy' && props.cancelKey && props.cancelKey !== 'none'}>
                        <span style={{ color: 'var(--accent-primary)', "font-family": 'monospace' }}>
                            {props.cancelKey === 'ctrl+end' ? 'Ctrl+End' : 
                             props.cancelKey === 'ctrl+break' ? 'Ctrl+Break' : 
                             props.cancelKey === 'ctrl+d' ? 'Ctrl+D' : 
                             'Esc'}
                        </span>
                        <span>Cancel/Interrupt</span>
                    </Show>

                    <span style={{ color: 'var(--accent-primary)', "font-family": 'monospace' }}>Paste</span>
                    <span>Use Paste Inserter</span>
                </div>
            </div>

            {/* Footer Controls */}
            <div style={{ padding: '16px', "border-top": '1px solid var(--border-std)' }}>
                <button
                    class="smooth-transition hover-lift"
                    onClick={props.onCreate}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: 'transparent',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-primary)',
                        "font-weight": 700,
                        "font-size": '13px',
                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-primary)';
                        e.currentTarget.style.color = 'var(--bg-app)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                >
                    <span class="hover-rotate" style={{ display: 'inline-flex', "align-items": 'center' }}>
                        <Plus size={16} />
                    </span>
                    NEW SESSION
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
