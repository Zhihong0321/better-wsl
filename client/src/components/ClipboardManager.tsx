import { createSignal, Show } from 'solid-js';
import { Clipboard, ArrowRight, Trash2, Loader2 } from 'lucide-solid';

interface ClipboardManagerProps {
    onInsert: (text: string) => void;
    sessionId?: string | null;
}

const ClipboardManager = (props: ClipboardManagerProps) => {
    const [content, setContent] = createSignal<string>('');
    const [imageFile, setImageFile] = createSignal<File | null>(null);
    const [imagePreview, setImagePreview] = createSignal<string | null>(null);
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [lastPath, setLastPath] = createSignal<string | null>(null);

    const handlePaste = async (e: ClipboardEvent) => {
        e.preventDefault();
        setError(null);
        setLastPath(null);

        // 1. Check for Images
        if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
            const file = e.clipboardData.files[0];
            if (file && file.type.startsWith('image/')) {
                // Validate image size (50MB limit)
                const MAX_SIZE = 45 * 1024 * 1024; // 45MB
                if (file.size > MAX_SIZE) {
                    setError('Image too large. Maximum size: 45MB');
                    return;
                }

                setImageFile(file);
                setContent('');

                // Create preview with error handling
                try {
                    const preview = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        
                        reader.onload = (evt) => {
                            const result = evt.target?.result;
                            if (typeof result === 'string') {
                                resolve(result);
                            } else {
                                reject(new Error('Failed to read image'));
                            }
                        };
                        
                        reader.onerror = () => {
                            reject(new Error(reader.error?.message || 'FileReader error'));
                        };
                        
                        reader.readAsDataURL(file);
                    });
                    
                    setImagePreview(preview);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to load image preview');
                    setImageFile(null);
                }
                return;
            }
        }

        // 2. Check for Text
        const text = e.clipboardData?.getData('text/plain');
        if (text) {
            setContent(text);
            setImageFile(null);
            setImagePreview(null);
        }
    };

    const handleUploadAndInsert = async () => {
        if (!imageFile() && !content()) return;

        setLoading(true);
        setError(null);

        try {
            let textToInsert = content();

            if (imageFile()) {
                // Validate image preview exists
                if (!imagePreview()) {
                    throw new Error('Image preview not ready');
                }

                // Upload image to server
                const res = await fetch('http://localhost:3000/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: imagePreview(),
                        filename: imageFile()!.name,
                        sessionId: props.sessionId
                    })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Upload failed');
                }

                const data = await res.json();
                const filePath = data.path;
                setLastPath(filePath);

                // Combine path and text if needed
                // Format: "path text" or just "path"
                if (textToInsert) {
                    textToInsert = `${filePath} ${textToInsert}`;
                } else {
                    textToInsert = filePath;
                }
            }

            // Insert to terminal
            props.onInsert(textToInsert);

            // Clear after success to allow fresh input
            clear();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Operation failed';
            setError(errorMsg);
            console.error('Clipboard upload error:', err);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => {
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setError(null);
        setLastPath(null);
    };

    return (
        <div style={{
            display: 'flex',
            "flex-direction": 'column',
            height: '100%',
            gap: '12px',
            padding: '12px',
            "font-family": 'var(--font-stack)'
        }}>
            <div style={{
                "font-size": '12px',
                "font-weight": 'bold',
                color: 'var(--text-std)',
                display: 'flex', "align-items": 'center', gap: '8px'
            }}>
                <Clipboard size={16} />
                CLIPBOARD MANAGER
            </div>

            {/* Paste Area */}
            <div
                onPaste={handlePaste}
                style={{
                    flex: 1,
                    background: 'var(--bg-active)',
                    border: '1px dashed var(--border-std)',
                    "border-radius": '4px',
                    padding: '12px',
                    display: 'flex',
                    "flex-direction": 'column',
                    "align-items": 'center',
                    "justify-content": 'center',
                    cursor: 'text',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                // Make it focusable to accept paste
                tabIndex={0}
            >
                <Show when={!content() && !imageFile()}>
                    <div style={{ color: 'var(--text-muted)', "text-align": 'center' }}>
                        <div style={{ "margin-bottom": '8px' }}>Paste (Ctrl+V) Here</div>
                        <div style={{ "font-size": '10px' }}>Supports Text & Images</div>
                    </div>
                </Show>

                <Show when={imagePreview()}>
                    <div style={{ display: 'flex', "flex-direction": 'column', "align-items": 'center', gap: '8px', width: '100%' }}>
                        <img src={imagePreview()!} style={{ "max-width": '100%', "max-height": '150px', "object-fit": 'contain', border: '1px solid var(--border-std)' }} />
                        <div style={{ "font-size": '10px', color: 'var(--text-std)' }}>{imageFile()?.name}</div>
                        <div style={{ "font-size": '10px', color: 'var(--text-muted)' }}>{imageFile()?.size ? (imageFile()!.size / 1024).toFixed(1) + ' KB' : 'Unknown size'}</div>
                    </div>
                </Show>

                <Show when={content()}>
                    <textarea
                        value={content()}
                        onInput={(e) => setContent(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (e.shiftKey || e.ctrlKey) {
                                    // Explicitly allow event propagation for new line (Shift or Ctrl + Enter)
                                    return;
                                }
                                // Default behavior: Submit (Only on plain Enter)
                                e.preventDefault();
                                handleUploadAndInsert();
                            }
                        }}
                        style={{
                            width: '100%',
                            height: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-std)',
                            resize: 'none',
                            outline: 'none',
                            "font-family": 'monospace',
                            "font-size": '12px'
                        }}
                    />
                </Show>

                {/* Clear Button */}
                <Show when={content() || imageFile()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); clear(); }}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            border: 'none',
                            "border-radius": '4px',
                            padding: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={12} />
                    </button>
                </Show>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', "flex-direction": 'column', gap: '8px' }}>
                <Show when={error()}>
                    <div style={{
                        "font-size": '11px',
                        color: '#ef4444',
                        padding: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        "border-radius": '4px'
                    }}>
                        {error()}
                    </div>
                </Show>

                <Show when={lastPath()}>
                    <div style={{
                        "font-size": '11px',
                        color: 'var(--accent-primary)',
                        padding: '8px',
                        background: 'rgba(0, 255, 0, 0.05)',
                        "border-radius": '4px',
                        "word-break": 'break-all'
                    }}>
                        Uploaded: {lastPath()}
                    </div>
                </Show>

                <button
                    onClick={handleUploadAndInsert}
                    disabled={(!content() && !imageFile()) || loading()}
                    style={{
                        padding: '10px',
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-app)',
                        border: 'none',
                        "font-weight": 'bold',
                        "font-size": '12px',
                        "text-transform": 'uppercase',
                        display: 'flex', "align-items": 'center', "justify-content": 'center', gap: '8px',
                        cursor: (!content() && !imageFile()) || loading() ? 'not-allowed' : 'pointer',
                        opacity: (!content() && !imageFile()) || loading() ? 0.5 : 1
                    }}
                >
                    <Show when={loading()} fallback={<><ArrowRight size={14} /> INSERT TO TERMINAL</>}>
                        <Loader2 size={14} class="spin" /> PROCESSING...
                    </Show>
                </button>
            </div>
        </div>
    );
};

export default ClipboardManager;
