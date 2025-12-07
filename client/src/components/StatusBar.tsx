import { createSignal, onMount, Show, For } from 'solid-js';
import { Activity, Server } from 'lucide-solid';

interface StatusBarProps {
    sessionId: string;
}

interface PingResult {
    ip: string;
    hostname: string;
    service: string;
    success: boolean;
    min?: number;
    avg?: number;
    max?: number;
    packetLoss: number;
    error?: string;
}

interface NetworkInfo {
    activeConnections: number;
    detectedTools: string[];
    pingResults: PingResult[];
    summary: {
        totalTargets: number;
        successfulPings: number;
        avgLatency: string | null;
    };
}

export default function StatusBar(props: StatusBarProps) {
    const [data, setData] = createSignal<NetworkInfo | null>(null);
    const [loading, setLoading] = createSignal(false);
    const [showDetails, setShowDetails] = createSignal(false);

    const fetchNetworkInfo = async () => {
        if (loading()) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/api/sessions/${props.sessionId}/network-info`);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const json = await res.json();
            
            // Validate data shape before setting
            if (json && typeof json.activeConnections === 'number' && Array.isArray(json.pingResults)) {
                setData(json);
            } else {
                console.warn('Invalid network info format', json);
            }
        } catch (err) {
            console.error('Failed to fetch network info', err);
        } finally {
            setLoading(false);
        }
    };

    const getLatencyColor = (ms: number) => {
        if (ms < 100) return '#00ff41'; // Green
        if (ms < 300) return '#ffa500'; // Orange
        return '#ff0000'; // Red
    };

    onMount(() => {
        // Initial fetch
        fetchNetworkInfo();
        // Poll every 30 seconds
        const interval = setInterval(fetchNetworkInfo, 30000);
        return () => clearInterval(interval);
    });

    return (
        <div style={{
            height: '24px',
            width: '100%',
            background: 'var(--bg-panel)',
            "border-top": '1px solid var(--border-subtle)',
            display: 'flex',
            "align-items": 'center',
            "justify-content": 'space-between',
            padding: '0 12px',
            "font-size": '10px',
            "font-family": 'var(--font-stack)',
            color: 'var(--text-muted)',
            "z-index": 10,
            position: 'relative'
        }}>
            {/* Left: General Info */}
            <div style={{ display: 'flex', gap: '16px', "align-items": 'center' }}>
                <div 
                    onClick={() => setShowDetails(!showDetails())}
                    style={{ display: 'flex', "align-items": 'center', gap: '6px', cursor: 'pointer', "user-select": 'none' }}
                    title="Click for details"
                >
                    <Activity size={12} color={loading() ? 'var(--accent-primary)' : 'currentColor'} />
                    <Show when={data()} fallback={<span>Initializing...</span>}>
                        <span>
                            Ping: <span style={{ color: data()!.summary.avgLatency ? getLatencyColor(parseFloat(data()!.summary.avgLatency!)) : 'inherit' }}>
                                {data()!.summary.avgLatency || '-'}ms
                            </span>
                        </span>
                        <span>Conn: {data()!.activeConnections}</span>
                    </Show>
                </div>

                <Show when={data()?.detectedTools?.length}>
                    <div style={{ display: 'flex', "align-items": 'center', gap: '4px' }}>
                        <Server size={12} />
                        <For each={data()!.detectedTools}>
                            {(tool) => (
                                <span style={{ 
                                    background: 'var(--accent-primary)', 
                                    color: 'var(--bg-app)', 
                                    padding: '0 4px', 
                                    "border-radius": '2px',
                                    "font-weight": 'bold'
                                }}>{tool}</span>
                            )}
                        </For>
                    </div>
                </Show>
            </div>

            {/* Right: Status/Refresh */}
            <div style={{ display: 'flex', gap: '12px', "align-items": 'center' }}>
                <button 
                    onClick={() => fetchNetworkInfo()}
                    disabled={loading()}
                    style={{
                        background: 'none', border: 'none', padding: 0,
                        color: loading() ? 'var(--accent-primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex', "align-items": 'center', gap: '4px'
                    }}
                >
                    {loading() ? 'Scanning...' : 'Refresh'}
                </button>
            </div>

            {/* Details Popover (Upwards) */}
            <Show when={showDetails() && data()}>
                <div class="scale-in" style={{
                    position: 'absolute',
                    bottom: '28px',
                    left: '0',
                    width: '300px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-std)',
                    "box-shadow": '0 -5px 20px rgba(0,0,0,0.5)',
                    padding: '12px',
                    "border-radius": '4px'
                }}>
                    <div style={{ "margin-bottom": '8px', "font-weight": 'bold', "text-transform": 'uppercase' }}>Active Connections</div>
                    <div style={{ "max-height": '200px', "overflow-y": 'auto', display: 'flex', "flex-direction": 'column', gap: '4px' }}>
                         <For each={data()!.pingResults}>
                            {(ping) => (
                                <div style={{
                                    display: 'flex', "justify-content": 'space-between',
                                    padding: '4px 8px', background: 'var(--bg-app)', "border-radius": '2px'
                                }}>
                                    <span>{ping.service !== 'Unknown' ? ping.service : ping.hostname}</span>
                                    <span style={{ color: getLatencyColor(ping.avg || 999) }}>{ping.avg ? `${ping.avg}ms` : 'FAIL'}</span>
                                </div>
                            )}
                        </For>
                        <Show when={data()!.pingResults.length === 0}>
                            <div style={{ "font-style": 'italic', opacity: 0.7 }}>No external connections active</div>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
}
