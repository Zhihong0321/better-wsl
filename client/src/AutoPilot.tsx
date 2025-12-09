import { createSignal, Show } from 'solid-js';
import TerminalComponent from './Terminal';
import { Network, Play, Square } from 'lucide-solid';

export default function AutoPilot(props: { project: string }) {
    const [agent1Id, setAgent1Id] = createSignal<string | null>(null);
    const [agent2Id, setAgent2Id] = createSignal<string | null>(null);
    const [isRunning, setIsRunning] = createSignal(false);
    const [instruction, setInstruction] = createSignal('');
    const [, setStatus] = createSignal<'idle' | 'running' | 'error'>('idle');
    const [instructorPrompt, setInstructorPrompt] = createSignal('export PS1="\\[\\e[36m\\][INSTRUCTOR] \\[\\e[m\\]\\w $ "\r\navoid_history() { history -d $((HISTCMD-1)); }; avoid_history\r');
    const [coderPrompt, setCoderPrompt] = createSignal('export PS1="\\[\\e[35m\\][CODER] \\[\\e[m\\]\\w $ "\r\navoid_history() { history -d $((HISTCMD-1)); }; avoid_history\r');

    const startSession = async () => {
        setStatus('running');
        try {
            // Create Agent 1
            const res1 = await fetch('http://localhost:3000/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: props.project, cols: 80, rows: 24 })
            });
            const d1 = await res1.json();
            setAgent1Id(d1.id);

            // Create Agent 2
            const res2 = await fetch('http://localhost:3000/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: props.project, cols: 80, rows: 24 })
            });
            const d2 = await res2.json();
            setAgent2Id(d2.id);

            // Link them
            await fetch('http://localhost:3000/api/autopilot/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent1Id: d1.id, agent2Id: d2.id })
            });

            setIsRunning(true);

            // Set Titles/Prompts (Optional)
            // Agent 1 is Instructor
            await fetch(`http://localhost:3000/api/sessions/${d1.id}/input`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: instructorPrompt() })
            });
            // Agent 2 is Coder
            await fetch(`http://localhost:3000/api/sessions/${d2.id}/input`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: coderPrompt() })
            });

        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    const stopSession = async () => {
        setIsRunning(false);
        setStatus('idle');
        await fetch('http://localhost:3000/api/autopilot/unlink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent1Id: agent1Id(), agent2Id: agent2Id(), kill: true })
        });
        setAgent1Id(null);
        setAgent2Id(null);
    };

    const sendInstruction = async () => {
        if (!agent1Id() || !instruction()) return;

        // Send to Agent 1 (Instructor)
        await fetch(`http://localhost:3000/api/sessions/${agent1Id()}/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: instruction() + '\r' })
        });
        setInstruction('');
    };

    return (
        <div style={{ display: 'flex', "flex-direction": 'column', height: '100%', width: '100%', background: 'var(--bg-app)' }}>
            {/* Header / Controls */}
            <div style={{
                height: '60px',
                "border-bottom": '1px solid var(--border-std)',
                display: 'flex',
                "align-items": 'center',
                padding: '0 20px',
                "justify-content": 'space-between'
            }}>
                <div style={{ display: 'flex', "align-items": 'center', gap: '10px' }}>
                    <Network size={20} color="var(--accent-primary)" />
                    <span style={{ "font-weight": 'bold', "font-size": '18px' }}>Auto-Pilot Mode</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Show when={!isRunning()}>
                        <button onClick={startSession} style={{
                            display: 'flex', "align-items": 'center', gap: '6px',
                            background: 'var(--accent-primary)', color: 'var(--bg-app)',
                            border: 'none', padding: '8px 16px', "border-radius": '4px',
                            "font-weight": 'bold', cursor: 'pointer'
                        }}>
                            <Play size={16} /> Start Dual Agents
                        </button>
                    </Show>
                    <Show when={isRunning()}>
                        <button onClick={stopSession} style={{
                            display: 'flex', "align-items": 'center', gap: '6px',
                            background: 'var(--status-error)', color: 'white',
                            border: 'none', padding: '8px 16px', "border-radius": '4px',
                            "font-weight": 'bold', cursor: 'pointer'
                        }}>
                            <Square size={16} /> Stop
                        </button>
                    </Show>
                </div>
            </div>

            {/* Main Area */}
            <div style={{ flex: 1, display: 'flex', "overflow": 'hidden' }}>
                <Show when={isRunning()} fallback={
                    <div style={{ flex: 1, display: 'flex', "align-items": 'center', "justify-content": 'center', color: 'var(--text-muted)' }}>
                        <div style={{ "text-align": 'center', display: 'flex', "flex-direction": 'column', gap: '20px', "align-items": 'center' }}>
                            <Network size={64} style={{ opacity: 0.5 }} />
                            <div>
                                <h3>Ready to Pair Program</h3>
                                <p style={{ "max-width": '400px', "margin-top": '10px', "font-size": '14px', color: 'var(--text-dim)' }}>
                                    Configure your agents below before starting the session.
                                </p>
                            </div>

                            {/* Configuration Panel */}
                            <div style={{
                                width: '600px',
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border-std)',
                                padding: '20px',
                                display: 'flex', "flex-direction": 'column', gap: '16px',
                                "text-align": 'left'
                            }}>
                                <div>
                                    <label style={{ display: 'block', "font-size": '12px', "font-weight": 'bold', "margin-bottom": '6px', color: 'var(--action-info)' }}>
                                        AGENT 1: INSTRUCTOR PROMPT
                                    </label>
                                    <textarea
                                        value={instructorPrompt()}
                                        onInput={(e) => setInstructorPrompt(e.currentTarget.value)}
                                        style={{
                                            width: '100%', height: '80px',
                                            background: 'var(--bg-app)', border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-std)', padding: '8px', "font-family": 'monospace', "font-size": '12px',
                                            resize: 'none'
                                        }}
                                    />
                                    <div style={{ "font-size": '10px', color: 'var(--text-dim)', "margin-top": '4px' }}>
                                        This hidden prompt creates the "Instructor" persona. It should define how they delegate tasks.
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', "font-size": '12px', "font-weight": 'bold', "margin-bottom": '6px', color: 'var(--accent-primary)' }}>
                                        AGENT 2: CODER PROMPT
                                    </label>
                                    <textarea
                                        value={coderPrompt()}
                                        onInput={(e) => setCoderPrompt(e.currentTarget.value)}
                                        style={{
                                            width: '100%', height: '80px',
                                            background: 'var(--bg-app)', border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-std)', padding: '8px', "font-family": 'monospace', "font-size": '12px',
                                            resize: 'none'
                                        }}
                                    />
                                    <div style={{ "font-size": '10px', color: 'var(--text-dim)', "margin-top": '4px' }}>
                                        This hidden prompt creates the "Coder" persona. It should define how they accept tasks and write code.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }>
                    {/* Agent 1 (Instructor) */}
                    <div style={{ flex: 1, display: 'flex', "flex-direction": 'column', "border-right": '1px solid var(--border-std)' }}>
                        <div style={{ padding: '8px', background: 'var(--bg-panel)', "border-bottom": '1px solid var(--border-std)', "font-weight": 'bold', color: 'var(--action-info)' }}>
                            AGENT 1 (Instructor/Tester)
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Show when={agent1Id()}>
                                <TerminalComponent sessionId={agent1Id()!} />
                            </Show>
                        </div>
                        {/* Instruction Input */}
                        <div style={{ height: '100px', padding: '10px', "border-top": '1px solid var(--border-std)', display: 'flex', "flex-direction": 'column' }}>
                            <textarea
                                value={instruction()}
                                onInput={(e) => setInstruction(e.currentTarget.value)}
                                placeholder="Enter instruction for Agent 1..."
                                style={{
                                    flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-std)',
                                    color: 'var(--text-std)', resize: 'none', padding: '8px', "font-family": 'monospace'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (e.shiftKey || e.ctrlKey) {
                                            // Allow newline
                                            return;
                                        } else {
                                            e.preventDefault();
                                            sendInstruction();
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Agent 2 (Coder) */}
                    <div style={{ flex: 1, display: 'flex', "flex-direction": 'column' }}>
                        <div style={{ padding: '8px', background: 'var(--bg-panel)', "border-bottom": '1px solid var(--border-std)', "font-weight": 'bold', color: 'var(--accent-primary)' }}>
                            AGENT 2 (Coder)
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Show when={agent2Id()}>
                                <TerminalComponent sessionId={agent2Id()!} />
                            </Show>
                        </div>
                    </div>
                </Show>
            </div>
        </div>
    );
}
