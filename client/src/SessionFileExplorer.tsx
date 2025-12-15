import { createSignal, onMount, For, Show } from 'solid-js';
import { Folder, FileText, ArrowLeft, X, Loader2 } from 'lucide-solid';

interface FileItem {
    name: string;
    type: 'file' | 'dir';
    isText?: boolean;
}

interface SessionFileExplorerProps {
    initialPath: string; // The session project root usually
    onClose: () => void;
}

export default function SessionFileExplorer(props: SessionFileExplorerProps) {
    const [currentPath, setCurrentPath] = createSignal(props.initialPath);
    const [items, setItems] = createSignal<FileItem[]>([]);
    const [previewContent, setPreviewContent] = createSignal<string | null>(null);
    const [previewFile, setPreviewFile] = createSignal<string | null>(null);
    const [loading, setLoading] = createSignal(false);
    const [reading, setReading] = createSignal(false);
    const [dragging, setDragging] = createSignal(false);
    const [, setError] = createSignal('');

    const fetchItems = async (path: string) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:3000/api/system/ls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setItems(data);
            setCurrentPath(path);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = async (item: FileItem) => {
        if (item.type === 'dir') {
            const sep = currentPath() === '/' ? '' : '/';
            fetchItems(`${currentPath()}${sep}${item.name}`);
        } else {
            // Preview file
            if (item.isText) {
                setReading(true);
                const sep = currentPath() === '/' ? '' : '/';
                const fullPath = `${currentPath()}${sep}${item.name}`;
                setPreviewFile(item.name);
                try {
                    const res = await fetch('http://localhost:3000/api/system/files/read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: fullPath })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    setPreviewContent(data.content);
                } catch (err) {
                    setPreviewContent('Error reading file');
                } finally {
                    setReading(false);
                }
            }
        }
    };

    const handleBack = () => {
        const path = currentPath();
        if (path === '~' || path === '$HOME' || path === '/') {
            // Maybe go up to root?
            if (path !== '/') fetchItems('/');
            return;
        }

        const sep = '/';
        let lastIdx = path.lastIndexOf(sep);
        const up = path.substring(0, lastIdx);
        fetchItems(up || '/');
    };

    onMount(() => {
        fetchItems(props.initialPath);
    });

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            "z-index": 9999,
            display: 'flex', "align-items": 'center', "justify-content": 'center',
            "font-family": 'var(--font-stack)',
            "backdrop-filter": 'blur(4px)'
        }}>
            <div style={{
                width: '80%', height: '80%',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-std)',
                "border-radius": '8px',
                display: 'flex', "flex-direction": 'column',
                "box-shadow": '0 20px 50px rgba(0,0,0,0.5)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '12px',
                    "border-bottom": '1px solid var(--border-std)',
                    background: 'var(--bg-panel)',
                    display: 'flex', "align-items": 'center', "justify-content": 'space-between'
                }}>
                    <div style={{ display: 'flex', "align-items": 'center', gap: '8px', flex: 1 }}>
                        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-std)', cursor: 'pointer' }}>
                            <ArrowLeft size={16} />
                        </button>
                        <div style={{ "font-family": 'monospace', "font-size": '12px', color: 'var(--text-std)' }}>
                            {currentPath()}
                        </div>
                    </div>
                    <button onClick={props.onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* File List */}
                    <div style={{
                        width: '300px',
                        "border-right": '1px solid var(--border-std)',
                        overflow: 'auto',
                        padding: '8px',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <div
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
                            onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragging(false);

                                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                                    // Handle File Upload
                                    for (let i = 0; i < e.dataTransfer.files.length; i++) {
                                        const file = e.dataTransfer.files[i];
                                        if (!file) continue; // Skip null files
                                        // Read file as ArrayBuffer/Base64
                                        const reader = new FileReader();
                                        reader.onload = async (evt) => {
                                            const base64 = evt.target?.result as string;
                                            // Sending to upload API. 
                                            // Ideally we want to upload to SPECIFIC path: currentPath()

                                            // For now, let's reuse api/upload but maybe add targetPath support?
                                            // Or use the existing flow and then mv it?
                                            // Let's implement a quick direct upload if possible or reuse existing.
                                            // The existing /api/upload puts it in a temp folder or similar and returns path.
                                            // We probably want to put it IN currentPath().

                                            try {
                                                // Using existing upload which returns a path, then we move it?
                                                // Or better: Modify /api/upload to accept target path.
                                                // Let's assume /api/upload for now and then we might need to 'mv' it using exec.
                                                // ACTUALLY: Let's just use the current API and tell user "Uploaded to..."
                                                // The USER asked to "copy into the selected wsl folder".
                                                // So we need to ensure it lands in currentPath().

                                                // Let's call a new endpoint or update existing?
                                                // Let's use the generic /api/upload but pass a 'targetDir' param if supported?
                                                // Checking server/index.js... /api/upload takes 'image' and 'filename'.
                                                // It puts it in .better-cli/uploads.
                                                // We can simply 'cp' it after.

                                                const res = await fetch('http://localhost:3000/api/upload', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        image: base64, // The API expects 'image' key for base64 data
                                                        filename: file.name
                                                    })
                                                });
                                                const data = await res.json();

                                                if (data.path) {
                                                    // Now move it to currentPath()
                                                    await fetch('http://localhost:3000/api/system/exec', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            // cp /home/user/.better-cli/uploads/file.txt /home/user/workspace/project/
                                                            // Use 'cp' to copy.
                                                            // Important: Replace ~ with $HOME because bash quotes inhibit ~ expansion
                                                            command: `cp "${data.path}" "${currentPath().replace(/^~/, '$HOME')}/"`
                                                        })
                                                    });
                                                    // Refresh list
                                                    fetchItems(currentPath());
                                                }
                                            } catch (err) {
                                                console.error("Upload failed", err);
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }
                            }}
                            style={{
                                border: '2px dashed ' + (dragging() ? 'var(--accent-primary)' : 'var(--border-std)'),
                                "border-radius": '6px',
                                margin: '8px',
                                padding: '16px',
                                "text-align": 'center',
                                background: dragging() ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                                color: 'var(--text-muted)',
                                "font-size": '12px',
                                transition: 'all 0.2s ease',
                                cursor: 'default'
                            }}
                        >
                            <Show when={!dragging()} fallback={<span style={{ color: 'var(--accent-primary)' }}>Drop to Upload</span>}>
                                Drag & Drop files here
                            </Show>
                        </div>

                        <Show when={loading()}>
                            <div style={{ padding: '20px', "text-align": 'center', color: 'var(--text-muted)' }}>Loading...</div>
                        </Show>

                        <Show when={!loading()}>
                            <div style={{ display: 'flex', "flex-direction": 'column', gap: '2px' }}>
                                <For each={items()}>
                                    {(item) => (
                                        <button
                                            onClick={() => handleItemClick(item)}
                                            style={{
                                                display: 'flex', "align-items": 'center', gap: '8px',
                                                padding: '6px 12px',
                                                background: previewFile() === item.name ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                border: 'none',
                                                "text-align": 'left',
                                                color: item.type === 'dir' ? 'var(--text-std)' : (item.isText ? 'var(--accent-primary)' : 'var(--text-muted)'),
                                                cursor: 'pointer',
                                                "font-size": '13px',
                                                "border-radius": '4px'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => {
                                                if (previewFile() !== item.name) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {item.type === 'dir' ? <Folder size={14} color="var(--text-muted)" /> : <FileText size={14} />}
                                            <span style={{ "white-space": 'nowrap', overflow: 'hidden', "text-overflow": 'ellipsis' }}>{item.name}</span>
                                        </button>
                                    )}
                                </For>
                                {items().length === 0 && <div style={{ color: 'var(--text-muted)', padding: '10px' }}>Empty directory</div>}
                            </div>
                        </Show>
                    </div>

                    {/* Preview Pane */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', "flex-direction": 'column', background: '#1e1e1e' }}>
                        <Show when={previewFile()} fallback={
                            <div style={{ flex: 1, display: 'flex', "align-items": 'center', "justify-content": 'center', color: 'var(--text-muted)' }}>
                                Select a text file to preview
                            </div>
                        }>
                            <div style={{
                                padding: '8px 16px',
                                "border-bottom": '1px solid var(--border-std)',
                                "font-size": '12px',
                                color: 'var(--text-std)',
                                background: 'var(--bg-panel)'
                            }}>
                                {previewFile()}
                            </div>

                            <div style={{ flex: 1, overflow: 'auto', padding: '16px', position: 'relative' }}>
                                <Show when={reading()} fallback={
                                    <pre style={{ margin: 0, "font-family": 'monospace', "font-size": '12px', color: '#e0e0e0', "white-space": 'pre-wrap' }}>
                                        {previewContent()}
                                    </pre>
                                }>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', "align-items": 'center', "justify-content": 'center' }}>
                                        <Loader2 class="spin" size={24} color="var(--accent-primary)" />
                                    </div>
                                </Show>
                            </div>
                        </Show>
                    </div>
                </div>
            </div>
        </div>
    );
}
