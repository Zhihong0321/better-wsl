import { createSignal, onMount, For, Show } from 'solid-js';
import { Folder, HardDrive, ArrowLeft, Check } from 'lucide-solid';

interface FileBrowserProps {
    onSelect: (path: string) => void;
    onCancel: () => void;
}

export default function FileBrowser(props: FileBrowserProps) {
    const [currentPath, setCurrentPath] = createSignal<string>('');
    const [drives, setDrives] = createSignal<string[]>([]);
    const [folders, setFolders] = createSignal<string[]>([]);
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal('');

    const fetchDrives = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/system/drives');
            const data = await res.json();
            setDrives(data);
            setCurrentPath(''); // Root
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDirs = async (path: string) => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/system/dirs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setFolders(data);
            setCurrentPath(path);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getSeparator = (path: string) => {
        if (path.startsWith('/') || path.startsWith('~')) return '/';
        return '\\';
    };

    const handleBack = () => {
        const path = currentPath();
        if (!path) return;
        
        if (drives().includes(path)) {
            setCurrentPath('');
            return;
        }

        const sep = getSeparator(path);
        const lastIdx = path.lastIndexOf(sep);
        
        // Handle /usr -> /
        if (path.startsWith('/') && lastIdx === 0) {
            fetchDirs('/');
            return;
        }

        const up = path.substring(0, lastIdx);
        
        if (up === '' && path.startsWith('/')) { 
             fetchDirs('/');
             return;
        }
        
        // If we went back and up is empty string (and not root), it means we should go to drives
        if (up === '') {
            setCurrentPath('');
            return;
        }

        fetchDirs(up);
    };

    const handleFolderClick = (folder: string) => {
        const path = currentPath();
        const sep = getSeparator(path);
        let newPath = `${path}${sep}${folder}`;
        // Avoid //usr
        if (path === '/') newPath = `/${folder}`;
        fetchDirs(newPath);
    };

    onMount(() => {
        fetchDrives();
    });

    return (
        <div style={{
            display: 'flex', "flex-direction": 'column',
            height: '100%', width: '100%', 
            background: 'var(--bg-app)',
            "font-family": 'var(--font-stack)'
        }}>
            {/* Header / Breadcrumb */}
            <div style={{
                padding: '12px',
                "border-bottom": '1px solid var(--border-std)',
                display: 'flex', "align-items": 'center', gap: '8px',
                background: 'var(--bg-panel)'
            }}>
                <button
                    onClick={handleBack}
                    disabled={currentPath() === ''}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: currentPath() === '' ? 'var(--text-muted)' : 'var(--accent-primary)',
                        cursor: currentPath() === '' ? 'default' : 'pointer'
                    }}
                >
                    <ArrowLeft size={16} />
                </button>
                <div style={{ "font-size": '12px', "font-weight": 'bold', color: 'var(--text-std)', flex: 1 }}>
                    {currentPath() || 'This PC'}
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                <Show when={error()}>
                    <div style={{ color: 'red', "font-size": '12px', padding: '8px' }}>{error()}</div>
                </Show>

                <Show when={loading()}>
                    <div style={{ padding: '20px', "text-align": 'center', color: 'var(--text-muted)' }}>Loading...</div>
                </Show>

                <Show when={!loading() && currentPath() === ''}>
                    <div style={{ display: 'grid', "grid-template-columns": 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                        <For each={drives()}>
                            {(drive) => (
                                <button
                                    onClick={() => fetchDirs(drive)}
                                    style={{
                                        display: 'flex', "flex-direction": 'column', "align-items": 'center',
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px solid transparent',
                                        cursor: 'pointer',
                                        color: 'var(--text-std)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <HardDrive size={32} color="var(--text-muted)" />
                                    <span style={{ "margin-top": '4px', "font-size": '12px', "font-weight": 'bold' }}>{drive}</span>
                                </button>
                            )}
                        </For>
                    </div>
                </Show>

                <Show when={!loading() && currentPath() !== ''}>
                    <div style={{ display: 'flex', "flex-direction": 'column', gap: '2px' }}>
                        <For each={folders()}>
                            {(folder) => (
                                <button
                                    onClick={() => handleFolderClick(folder)}
                                    style={{
                                        display: 'flex', "align-items": 'center', gap: '8px',
                                        padding: '6px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        "text-align": 'left',
                                        color: 'var(--text-std)',
                                        cursor: 'pointer',
                                        "font-size": '13px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Folder size={14} color="var(--accent-primary)" />
                                    {folder}
                                </button>
                            )}
                        </For>
                        {folders().length === 0 && (
                            <div style={{ padding: '20px', "text-align": 'center', color: 'var(--text-muted)', "font-size": '12px' }}>
                                (Empty or Access Denied)
                            </div>
                        )}
                    </div>
                </Show>
            </div>

            {/* Footer Actions */}
            <div style={{
                padding: '12px',
                "border-top": '1px solid var(--border-std)',
                display: 'flex', "justify-content": 'flex-end', gap: '8px',
                background: 'var(--bg-panel)'
            }}>
                <button
                    onClick={props.onCancel}
                    style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid var(--border-std)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    Cancel
                </button>
                <button
                    disabled={currentPath() === ''}
                    onClick={() => props.onSelect(currentPath())}
                    style={{
                        padding: '8px 16px',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        color: 'var(--bg-app)',
                        cursor: currentPath() === '' ? 'not-allowed' : 'pointer',
                        display: 'flex', "align-items": 'center', gap: '6px',
                        "font-weight": 'bold',
                        opacity: currentPath() === '' ? 0.5 : 1
                    }}
                >
                    <Check size={14} /> Select This Folder
                </button>
            </div>
        </div>
    );
}
