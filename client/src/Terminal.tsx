import { onMount, onCleanup, createSignal, createEffect } from 'solid-js';
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

        // Activity tracking (keep purely functional reference)
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
            },
            scrollback: 10000,
        });
        termInstance = term;

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef!);
        fitAddon.fit();
        term.focus();

        // Handle resize strictly for UI
        const handleResize = () => {
            fitAddon.fit();
            // Emit resize if socket exists (handled in effect)
            if (socket) {
                socket.emit('resize', { cols: term.cols, rows: term.rows });
            }
        };
        window.addEventListener('resize', handleResize);

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
                // AGGRESSIVE SANITIZATION:
                // Remove all newlines to prevent accidental execution.
                // We replace any sequence of CR/LF with a single space.
                const sanitized = text.replace(/[\r\n]+/g, ' ');
                if (sanitized) {
                    term.paste(sanitized);
                }
            }
        };
        terminalRef!.addEventListener('paste', handlePaste as any, true);

        term.attachCustomKeyEventHandler((e) => {
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
            return true;
        });

        // Setup Reactive Session Connection
        // This will run whenever props.sessionId changes
        createEffect(() => {
            const sId = props.sessionId;
            if (!sId) return;

            term.reset();
            term.writeln('\x1b[32m[Connecting...]\x1b[0m');

            const newSocket = io('http://localhost:3000', {
                query: { sessionId: sId }
            });

            // Update outer ref for resizing
            socket = newSocket;

            const onDataDisposable = term.onData((data) => {
                newSocket.emit('input', data);
                reportActivity();
            });

            newSocket.on('output', (data) => {
                term.write(data);
                reportActivity();
            });

            // Sync size on connect
            newSocket.emit('resize', { cols: term.cols, rows: term.rows });

            // Cleanup function for this effect run
            onCleanup(() => {
                newSocket.disconnect();
                onDataDisposable.dispose();
            });
        });

        onCleanup(() => {
            terminalRef?.removeEventListener('paste', handlePaste as any, true);
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
                /* Remove padding-right and overflow hidden to ensure scrollbar visibility */
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
