import { type Component, For, Show } from 'solid-js';
import { Terminal, Plus, Wrench, Monitor, Settings as SettingsIcon, GitBranch, Clock, Clipboard } from 'lucide-solid';
import ClipboardManager from './components/ClipboardManager';

interface GitInfo {
    isGit: boolean;
    remoteUrl?: string;
    lastCommit?: {
        hash: string;
        date: string;
        message: string;
    };
}

interface SidebarProps {
    sessions: { id: string; project?: string }[];
    activeId: string | null;
    activeView: 'sessions' | 'tools' | 'settings' | 'clipboard';
    onSelect: (id: string | null) => void;
    onCreate: () => void;
    onViewChange: (view: 'sessions' | 'tools' | 'settings' | 'clipboard') => void;
    onInsert: (text: string) => void;
    projectName: string;
    sessionStates?: Record<string, 'waiting' | 'processing'>;
    gitInfo?: GitInfo | null;
}

const Sidebar: Component<SidebarProps> = (props) => {
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
                        <div style={{ display: 'flex', "align-items": 'center', gap: '6px', color: 'var(--accent-primary)' }}>
                            <GitBranch size={12} />
                            <span style={{ "text-overflow": 'ellipsis', overflow: 'hidden', "white-space": 'nowrap' }}>
                                {props.gitInfo?.remoteUrl ? props.gitInfo.remoteUrl.split('/').pop()?.replace('.git', '') : 'Local Repo'}
                            </span>
                        </div>
                        <Show when={props.gitInfo?.lastCommit}>
                             <div style={{ display: 'flex', "align-items": 'center', gap: '6px', color: 'var(--text-muted)' }}>
                                <Clock size={12} />
                                <span>{new Date(props.gitInfo!.lastCommit!.date).toLocaleString(undefined, {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}</span>
                            </div>
                             <div style={{ color: 'var(--text-dim)', "padding-left": '18px', "font-style": 'italic' }}>
                                {props.gitInfo!.lastCommit!.message.length > 30 
                                    ? props.gitInfo!.lastCommit!.message.substring(0, 30) + '...' 
                                    : props.gitInfo!.lastCommit!.message}
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
                            "font-size": '11px',
                            "text-transform": 'uppercase',
                            "letter-spacing": '0.5px',
                            color: 'var(--text-muted)'
                        }}>
                            Active Sessions
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
                                                // Keep view as is if clipboard, else switch to sessions?
                                                // If user clicks a session, they probably want to see it.
                                                // If they are in clipboard mode, they might want to stay there.
                                                // But usually clicking a session implies switching to it.
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
                                            <span style={{ "font-family": 'var(--font-stack)', "font-weight": 700 }}>
                                                {isActive() ? '>' : '#'}
                                            </span>
                                            <span style={{ "font-family": 'var(--font-stack)' }}>{session.project || 'Session'}</span>
                                        </button>
                                    );
                                }}
                            </For>
                        </div>
                    </>
                }>
                    <ClipboardManager onInsert={props.onInsert} />
                </Show>
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
