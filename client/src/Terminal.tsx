import { onMount, onCleanup, createSignal } from 'solid-js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, type Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';
import StatusBar from './components/StatusBar';

interface TerminalProps {
    sessionId: string;
    ctrlCBehavior?: 'copy' | 'cancel';
    onActivity?: (active: boolean) => void;
}

export default function TerminalComponent(props: TerminalProps) {
    let terminalRef: HTMLDivElement | undefined;
    let socket: Socket | undefined;
    const [focused, setFocused] = createSignal(false);
    let termInstance: Terminal | undefined;

    const handleFocus = () => {
        setFocused(true);
        termInstance?.focus();
    };
    const handleBlur = () => setFocused(false);

    onMount(() => {
        if (!terminalRef) return;

        // Activity tracking
        let activityTimeout: number;
        const reportActivity = () => {
            if (props.onActivity) {
                props.onActivity(true);
                window.clearTimeout(activityTimeout);
                activityTimeout = window.setTimeout(() => {
                    props.onActivity?.(false);
                }, 1000);
            }
        };

        // 1. Initialize xterm.js
        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'block',
            fontSize: 14,
            fontFamily: '"Space Mono", "Courier New", Courier, monospace',
            theme: {
                background: '#000000',
                foreground: '#e0e0e0',
                cursor: '#00ff41',
                selectionBackground: '#00ff4144'
            }
        });
        termInstance = term;

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef!);
        fitAddon.fit();
        term.focus();

        // Custom paste handler
        const handlePaste = async (e: ClipboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // 1. Check for Images first
            if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    term.write('\x1b[33m[Uploading image...]\x1b[0m');
                    
                    try {
                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                            const base64 = evt.target?.result;
                            if (typeof base64 !== 'string') return;

                            const res = await fetch('http://localhost:3000/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    image: base64,
                                    filename: file.name
                                })
                            });
                            const data = await res.json();
                            
                            // Clear "Uploading..." line
                            term.write('\r\x1b[K'); 
                            
                            if (data.path) {
                                term.paste(data.path);
                            } else {
                                term.write('\x1b[31m[Upload Failed: No path returned]\x1b[0m\r\n');
                            }
                        };
                        reader.readAsDataURL(file);
                    } catch (err) {
                        term.write('\r\x1b[K\x1b[31m[Upload Failed]\x1b[0m\r\n');
                    }
                    return;
                }
            }

            // 2. Fallback to text
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                term.paste(text);
            }
        };
        terminalRef!.addEventListener('paste', handlePaste as any, true);

        term.attachCustomKeyEventHandler((e) => {
            // Only process keydown events to avoid double-firing on keyup
            if (e.type !== 'keydown') return true;

            if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                const mode = props.ctrlCBehavior || 'copy';
                if (mode === 'copy') {
                    const text = term.hasSelection() ? term.getSelection() : '';
                    if (text) navigator.clipboard.writeText(text);
                    return false;
                }
                return true;
            }
            // Remove custom Ctrl+V handler to avoid triple-paste issue:
            // 1. Keydown handler (removed)
            // 2. Keyup handler (removed)
            // 3. Native browser paste -> xterm onData (kept)
            return true;
        });


        // 2. Connect to Backend
        socket = io('http://localhost:3000', {
            query: { sessionId: props.sessionId }
        });

        // 3. Handle data flow
        term.onData((data) => {
            socket?.emit('input', data);
            reportActivity();
        });

        socket.on('output', (data) => {
            term.write(data);
            reportActivity();
        });

        // 4. Handle resize
        const handleResize = () => {
            fitAddon.fit();
            socket?.emit('resize', { cols: term.cols, rows: term.rows });
        };

        window.addEventListener('resize', handleResize);
        // Initial size sync
        socket.emit('resize', { cols: term.cols, rows: term.rows });

        term.writeln('\x1b[32m[Connected to Session Manager]\x1b[0m');

        onCleanup(() => {
            terminalRef?.removeEventListener('paste', handlePaste as any, true);
            socket?.disconnect();
            term.dispose();
            window.removeEventListener('resize', handleResize);
        });
    });

    return (
        <div
            class={focused() ? 'focus-ring-active' : 'focus-ring-inactive'}
            tabIndex={0}
            onClick={() => setFocused(true)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ 
                width: 'calc(100% - 2px)', 
                height: 'calc(100% - 2px)', 
                margin: '1px',
                "box-sizing": 'border-box',
                position: 'relative',
                display: 'flex',
                "flex-direction": 'column'
            }}
        >
            <div style={{ 
                flex: 1, 
                width: '100%', 
                "background-color": "#000000", 
                padding: 'var(--terminal-padding)',
                "padding-right": '10px', /* Avoid scrollbar overlap */
                overflow: 'hidden' 
            }}>
                <div
                    ref={terminalRef}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
            <StatusBar sessionId={props.sessionId} />
        </div>
    );
}
