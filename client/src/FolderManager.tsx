import { type Component, createSignal, For } from 'solid-js';
import { ArrowRight, ArrowLeft, RefreshCcw, Folder, File, Trash2 } from 'lucide-solid';

interface FileItem {
    name: string;
    isDirectory: boolean;
    size: string;
    date: string;
    path: string;
}

const formatSize = (bytes: string | number) => {
    const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(size)) return '-';
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FolderManager: Component = () => {
    const [wslPath, setWslPath] = createSignal('~');
    const [winPath, setWinPath] = createSignal('C:\\');
    
    const [wslFiles, setWslFiles] = createSignal<FileItem[]>([]);
    const [winFiles, setWinFiles] = createSignal<FileItem[]>([]);
    
    const [selectedWsl, setSelectedWsl] = createSignal<Set<string>>(new Set());
    const [selectedWin, setSelectedWin] = createSignal<Set<string>>(new Set());
    
    const [loading, setLoading] = createSignal(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            // Fetch WSL
            const wslRes = await fetch('http://localhost:3000/api/fs/wsl/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: wslPath() })
            });
            const wslData = await wslRes.json();
            if (!wslRes.ok) throw new Error(wslData.error || 'Failed to list WSL files');
            if (Array.isArray(wslData)) setWslFiles(wslData);

            // Fetch Windows
            const winRes = await fetch('http://localhost:3000/api/fs/win/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: winPath() })
            });
            const winData = await winRes.json();
            if (!winRes.ok) throw new Error(winData.error || 'Failed to list Windows files');
            if (Array.isArray(winData)) setWinFiles(winData);
            
            // Clear selections
            setSelectedWsl(new Set<string>());
            setSelectedWin(new Set<string>());
        } catch (err: any) {
            console.error('Failed to fetch files:', err);
            alert(`Error: ${err.message || 'Failed to load file lists'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (direction: 'to_win' | 'to_wsl') => {
        const isToWin = direction === 'to_win';
        const items = isToWin ? Array.from(selectedWsl()) : Array.from(selectedWin());
        
        if (items.length === 0) return;
        
        if (!confirm(`Copy ${items.length} items to ${isToWin ? 'Windows' : 'WSL'}? Existing files will be overwritten.`)) return;

        setLoading(true);
        try {
            const body = {
                source: { 
                    type: isToWin ? 'wsl' : 'win', 
                    path: isToWin ? wslPath() : winPath() 
                },
                dest: { 
                    type: isToWin ? 'win' : 'wsl', 
                    path: isToWin ? winPath() : wslPath() 
                },
                items
            };

            const res = await fetch('http://localhost:3000/api/fs/copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (!res.ok) throw new Error('Copy failed');
            
            await fetchFiles();
            alert('Copy completed successfully');
        } catch (err) {
            console.error(err);
            alert('Copy operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleMount = async () => {
        const items = Array.from(selectedWin());
        
        if (items.length === 0) return;
        
        if (!confirm(`Mount ${items.length} items from Windows to WSL? This creates symlinks - changes sync instantly between Windows and WSL.`)) return;

        setLoading(true);
        try {
            const body = {
                source: { type: 'win', path: winPath() },
                dest: { type: 'wsl', path: wslPath() },
                items
            };

            const res = await fetch('http://localhost:3000/api/fs/mount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (!res.ok) throw new Error('Mount failed');
            
            await fetchFiles();
            alert('Mount completed successfully - changes will sync bidirectionally');
        } catch (err) {
            console.error(err);
            alert('Mount operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        // Determine which items to delete based on what is selected
        // We can only delete from one side at a time to avoid confusion, or both?
        // Let's support deleting from whichever side has selection.
        
        const wslItems = Array.from(selectedWsl());
        const winItems = Array.from(selectedWin());
        
        if (wslItems.length === 0 && winItems.length === 0) return;
        
        let confirmMsg = 'Delete selected items?';
        if (wslItems.length > 0 && winItems.length > 0) {
            confirmMsg = `Delete ${wslItems.length} items from WSL AND ${winItems.length} items from Windows? This cannot be undone.`;
        } else if (wslItems.length > 0) {
            confirmMsg = `Delete ${wslItems.length} items from WSL? This cannot be undone.`;
        } else {
            confirmMsg = `Delete ${winItems.length} items from Windows? This cannot be undone.`;
        }
        
        if (!confirm(confirmMsg)) return;
        
        setLoading(true);
        try {
            // Delete WSL items
            if (wslItems.length > 0) {
                await fetch('http://localhost:3000/api/fs/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'wsl',
                        path: wslPath(),
                        items: wslItems
                    })
                });
            }
            
            // Delete Windows items
            if (winItems.length > 0) {
                await fetch('http://localhost:3000/api/fs/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'win',
                        path: winPath(),
                        items: winItems
                    })
                });
            }
            
            await fetchFiles();
            alert('Deletion completed');
        } catch (err: any) {
            console.error('Delete failed:', err);
            alert(`Delete operation failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (name: string, isWsl: boolean) => {
        const current = isWsl ? new Set(selectedWsl()) : new Set(selectedWin());
        if (current.has(name)) current.delete(name);
        else current.add(name);
        
        if (isWsl) setSelectedWsl(current);
        else setSelectedWin(current);
    };

    const FileList = (props: { files: FileItem[], selected: Set<string>, isWsl: boolean, onToggle: (name: string) => void, onNavigate: (path: string) => void }) => (
        <div style={{ 
            flex: 1, 
            border: '1px solid var(--border-std)', 
            background: 'var(--bg-panel)',
            display: 'flex', 
            "flex-direction": 'column',
            overflow: 'hidden'
        }}>
            <div style={{ padding: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', "font-weight": 'bold', "text-align": 'center' }}>
                {props.isWsl ? 'WSL (Left)' : 'Windows (Right)'}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                <For each={props.files}>{(file) => (
                    <div 
                        style={{ 
                            display: 'flex', 
                            "align-items": 'center', 
                            padding: '4px', 
                            gap: '8px',
                            cursor: 'pointer',
                            background: props.selected.has(file.name) ? 'var(--bg-active)' : 'transparent'
                        }}
                        onClick={() => props.onToggle(file.name)}
                        onDblClick={() => file.isDirectory && props.onNavigate(file.path)}
                    >
                        <input 
                            type="checkbox" 
                            checked={props.selected.has(file.name)} 
                            style={{ "pointer-events": 'none' }}
                        />
                        <span style={{ color: file.isDirectory ? 'var(--accent-primary)' : 'inherit' }}>
                            {file.isDirectory ? <Folder size={14} /> : <File size={14} />}
                        </span>
                        <span style={{ 
                            "font-family": 'monospace', 
                            "white-space": 'nowrap', 
                            overflow: 'hidden', 
                            "text-overflow": 'ellipsis',
                            flex: 1
                        }}>
                            {file.name}
                        </span>
                        <span style={{ "font-size": '11px', opacity: 0.7, "white-space": 'nowrap' }}>
                            {formatSize(file.size)}
                        </span>
                    </div>
                )}</For>
            </div>
        </div>
    );

    return (
        <div class="fade-in" style={{ height: '100%', display: 'flex', "flex-direction": 'column', gap: '16px', padding: '16px' }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', gap: '12px', "align-items": 'center' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', "font-size": '12px', "margin-bottom": '4px' }}>WSL Path</label>
                    <input 
                        type="text" 
                        value={wslPath()} 
                        onInput={(e) => setWslPath(e.currentTarget.value)}
                        style={{ width: '100%', padding: '6px', background: 'var(--bg-panel)', border: '1px solid var(--border-std)', color: 'var(--text-std)' }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', "font-size": '12px', "margin-bottom": '4px' }}>Windows Path</label>
                    <input 
                        type="text" 
                        value={winPath()} 
                        onInput={(e) => setWinPath(e.currentTarget.value)}
                        style={{ width: '100%', padding: '6px', background: 'var(--bg-panel)', border: '1px solid var(--border-std)', color: 'var(--text-std)' }}
                    />
                </div>
                <button 
                    onClick={fetchFiles}
                    disabled={loading()}
                    style={{ "align-self": 'flex-end', padding: '8px 16px', background: 'var(--accent-primary)', color: 'var(--bg-app)', border: 'none', "font-weight": 'bold', cursor: 'pointer', display: 'flex', gap: '8px', "align-items": 'center' }}
                >
                    <RefreshCcw size={16} /> Load
                </button>
            </div>

            {/* Main Area */}
            <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
                {/* Left: WSL */}
                <FileList 
                    files={wslFiles()} 
                    selected={selectedWsl()} 
                    isWsl={true} 
                    onToggle={(n) => toggleSelection(n, true)}
                    onNavigate={(p) => { setWslPath(p); fetchFiles(); }}
                />

                {/* Middle: Control Panel */}
                <div style={{ display: 'flex', "flex-direction": 'column', gap: '12px', "justify-content": 'center', width: '140px' }}>
                    <button 
                        onClick={() => handleCopy('to_win')}
                        disabled={selectedWsl().size === 0 || loading()}
                        style={{ padding: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border-std)', cursor: 'pointer', "text-align": 'center' }}
                    >
                        <div style={{ "font-size": '12px', "margin-bottom": '4px' }}>WSL &gt; Win</div>
                        <ArrowRight size={20} />
                    </button>
                    
                    <button 
                        onClick={() => handleCopy('to_wsl')}
                        disabled={selectedWin().size === 0 || loading()}
                        style={{ padding: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border-std)', cursor: 'pointer', "text-align": 'center' }}
                    >
                        <div style={{ "font-size": '12px', "margin-bottom": '4px' }}>Win &gt; WSL (Copy)</div>
                        <ArrowLeft size={20} />
                    </button>
                    
                    <button 
                        onClick={handleMount}
                        disabled={selectedWin().size === 0 || loading()}
                        style={{ 
                            padding: '12px', 
                            background: 'var(--accent-primary)', 
                            border: '1px solid var(--accent-primary)', 
                            color: 'var(--bg-app)',
                            cursor: 'pointer', 
                            "text-align": 'center',
                            "font-weight": 'bold'
                        }}
                    >
                        <div style={{ "font-size": '12px', "margin-bottom": '4px' }}>Win &gt; WSL (Mount)</div>
                        <ArrowLeft size={20} />
                    </button>
                    
                    <div style={{ height: '16px' }}></div>
                    
                    <button 
                        onClick={handleDelete}
                        disabled={(selectedWsl().size === 0 && selectedWin().size === 0) || loading()}
                        style={{ 
                            padding: '12px', 
                            background: 'var(--bg-panel)', 
                            border: '1px solid var(--accent-danger)', 
                            color: 'var(--accent-danger)',
                            cursor: 'pointer', 
                            "text-align": 'center' 
                        }}
                    >
                        <div style={{ "font-size": '12px', "margin-bottom": '4px' }}>Delete</div>
                        <Trash2 size={20} />
                    </button>
                </div>

                {/* Right: Windows */}
                <FileList 
                    files={winFiles()} 
                    selected={selectedWin()} 
                    isWsl={false} 
                    onToggle={(n) => toggleSelection(n, false)}
                    onNavigate={(p) => { setWinPath(p); fetchFiles(); }}
                />
            </div>
        </div>
    );
};

export default FolderManager;
