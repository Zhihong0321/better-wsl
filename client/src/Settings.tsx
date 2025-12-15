import { type Component, createSignal, Show, For, onMount } from 'solid-js';
import { Settings as SettingsIcon, Server, RefreshCcw, Power, Download, Check, AlertTriangle } from 'lucide-solid';

interface SettingsProps {
  value: 'copy' | 'cancel';
  onChange: (v: 'copy' | 'cancel') => void;
  onOpenSetup?: () => void;
  newlineKey?: 'shift+enter' | 'ctrl+enter' | 'alt+enter' | 'none';
  onNewlineKeyChange?: (v: 'shift+enter' | 'ctrl+enter' | 'alt+enter' | 'none') => void;
  cancelKey?: 'ctrl+end' | 'ctrl+break' | 'ctrl+d' | 'esc' | 'none';
  onCancelKeyChange?: (v: 'ctrl+end' | 'ctrl+break' | 'ctrl+d' | 'esc' | 'none') => void;
}

interface DistroInfo {
  name: string;
  state: string;
  version: string;
  isDefault: boolean;
}

interface SystemInfo {
  distro: string;
  packageManager: string;
  hasSudo: boolean;
  hasCurl: boolean;
  hasNode: boolean;
}

const SettingsPage: Component<SettingsProps> = (props) => {
  const [distros, setDistros] = createSignal<DistroInfo[]>([]);
  const [systemInfo, setSystemInfo] = createSignal<SystemInfo | null>(null);
  const [wslVersion, setWslVersion] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal('');

  const fetchDistros = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/wsl/distros', {
        method: 'POST'
      });
      const data = await res.json();
      setDistros(data.distros || []);
    } catch (err) {
      console.error('Failed to fetch distros:', err);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/tools/system-info', {
        method: 'POST'
      });
      const data = await res.json();
      setSystemInfo(data);
    } catch (err) {
      console.error('Failed to fetch system info:', err);
    }
  };

  const fetchWslVersion = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/wsl/version', {
        method: 'POST'
      });
      const data = await res.json();
      setWslVersion(data.version);
    } catch (err) {
      console.error('Failed to fetch WSL version:', err);
    }
  };

  const setDefaultDistro = async (distro: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/wsl/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distro })
      });
      const data = await res.json();
      setMessage(data.message);
      setTimeout(() => setMessage(''), 3000);
      await fetchDistros();
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const terminateDistro = async (distro: string) => {
    if (!confirm(`Terminate ${distro}? This will stop all processes.`)) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/wsl/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distro })
      });
      const data = await res.json();
      setMessage(data.message);
      setTimeout(() => setMessage(''), 3000);
      await fetchDistros();
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const shutdownAll = async () => {
    if (!confirm('Shutdown ALL WSL distros? This will stop Better CLI.')) return;
    setLoading(true);
    try {
      await fetch('http://localhost:3000/api/wsl/shutdown-all', {
        method: 'POST'
      });
      setMessage('WSL shutdown initiated...');
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateWsl = async () => {
    if (!confirm('Update WSL? This may take a few minutes.')) return;
    setLoading(true);
    try {
      await fetch('http://localhost:3000/api/wsl/update', {
        method: 'POST'
      });
      setMessage('WSL update initiated...');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchDistros();
    fetchSystemInfo();
    fetchWslVersion();
  };

  onMount(() => {
    refresh();
  });
  return (
    <div class="fade-in" style={{ padding: '0', height: '100%', background: 'var(--bg-app)', color: 'var(--text-std)', display: 'flex', "flex-direction": 'column' }}>
       {/* Tab Navigation */}
       <div style={{ display: 'flex', "border-bottom": '1px solid var(--border-std)', background: 'var(--bg-panel)' }}>
           <button 
               style={{
                   padding: '12px 24px',
                   background: 'var(--bg-app)',
                   border: 'none',
                   "border-bottom": '2px solid var(--accent-primary)',
                   "font-weight": 'bold',
                   color: 'var(--text-std)',
                   cursor: 'default'
               }}
           >
               Settings
           </button>
       </div>

       {/* Content */}
       <div style={{ flex: 1, overflow: 'auto' }}>
           <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '24px', 'max-width': '900px' }}>
                <div style={{ 'border-bottom': '1px solid var(--border-std)', padding: '12px 0' }}>
                  <h1 style={{ margin: 0, 'font-size': '20px', 'text-transform': 'uppercase', 'letter-spacing': '2px' }}>Settings</h1>
                  <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>Better CLI Configuration</div>
                </div>

                {/* Message Banner */}
                <Show when={message()}>
                  <div style={{
                    padding: '12px 16px',
                    background: message().includes('Error') ? 'rgba(255, 107, 107, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                    border: `1px solid ${message().includes('Error') ? '#ff6b6b' : '#4ade80'}`,
                    color: message().includes('Error') ? '#ff6b6b' : '#4ade80',
                    'font-size': '12px',
                    'font-family': 'monospace'
                  }}>
                    {message()}
                  </div>
                </Show>

                {/* WSL Management Section */}
                <div style={{ border: '1px solid var(--border-std)', background: 'var(--bg-panel)' }}>
                  <div style={{ 
                    padding: '16px', 
                    'border-bottom': '1px solid var(--border-subtle)', 
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center'
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                      <Server size={20} color="var(--accent-primary)" />
                      <span style={{ 'font-weight': 700, 'text-transform': 'uppercase', 'letter-spacing': '1px' }}>WSL Management</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={refresh}
                        disabled={loading()}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid var(--accent-primary)',
                          color: 'var(--accent-primary)',
                          'font-size': '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '4px',
                          opacity: loading() ? 0.5 : 1
                        }}
                      >
                        <RefreshCcw size={12} />
                        REFRESH
                      </button>
                      <Show when={props.onOpenSetup}>
                        <button
                          onClick={props.onOpenSetup}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid #4ade80',
                            color: '#4ade80',
                            'font-size': '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '4px'
                          }}
                        >
                          RUN SETUP
                        </button>
                      </Show>
                    </div>
                  </div>

                  <div style={{ padding: '16px', display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
                    {/* Current Distro Info */}
                    <Show when={systemInfo()}>
                      <div style={{
                        padding: '12px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-std)'
                      }}>
                        <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-bottom': '8px', 'text-transform': 'uppercase' }}>Current Distribution</div>
                        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '12px', 'font-size': '12px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Name: </span>
                            <span style={{ 'font-family': 'monospace', 'font-weight': 'bold' }}>{systemInfo()!.distro}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Package Manager: </span>
                            <span style={{ 'font-family': 'monospace', 'font-weight': 'bold', 'text-transform': 'uppercase' }}>{systemInfo()!.packageManager}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>WSL Version: </span>
                            <span style={{ 'font-family': 'monospace', 'font-weight': 'bold' }}>{wslVersion().split('\n')[0] || 'WSL 2'}</span>
                          </div>
                        </div>
                      </div>
                    </Show>

                    {/* Installed Distros List */}
                    <div>
                      <div style={{ 'font-size': '12px', 'font-weight': 'bold', 'margin-bottom': '8px', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Installed Distributions</div>
                      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                        <For each={distros()} fallback={
                          <div style={{ 'font-size': '12px', color: 'var(--text-muted)', padding: '12px' }}>Loading...</div>
                        }>
                          {(distro) => (
                            <div style={{
                              padding: '12px',
                              background: distro.isDefault ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-app)',
                              border: `1px solid ${distro.isDefault ? '#4ade80' : 'var(--border-std)'}`,
                              display: 'flex',
                              'justify-content': 'space-between',
                              'align-items': 'center'
                            }}>
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', flex: 1 }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  border: `1px solid ${distro.state === 'Running' ? '#4ade80' : 'var(--border-std)'}`,
                                  display: 'flex',
                                  'align-items': 'center',
                                  'justify-content': 'center'
                                }}>
                                  <Server size={16} color={distro.state === 'Running' ? '#4ade80' : 'var(--text-muted)'} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                                    <span style={{ 'font-weight': 'bold', 'font-size': '14px' }}>{distro.name}</span>
                                    <Show when={distro.isDefault}>
                                      <span style={{
                                        padding: '2px 6px',
                                        background: '#4ade80',
                                        color: 'var(--bg-app)',
                                        'font-size': '9px',
                                        'font-weight': 'bold',
                                        'text-transform': 'uppercase'
                                      }}>DEFAULT</span>
                                    </Show>
                                  </div>
                                  <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'font-family': 'monospace' }}>
                                    {distro.state} • WSL {distro.version}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Show when={!distro.isDefault}>
                                  <button
                                    onClick={() => setDefaultDistro(distro.name)}
                                    disabled={loading()}
                                    style={{
                                      padding: '6px 12px',
                                      background: 'transparent',
                                      border: '1px solid var(--accent-secondary)',
                                      color: 'var(--accent-secondary)',
                                      'font-size': '10px',
                                      cursor: 'pointer',
                                      'text-transform': 'uppercase'
                                    }}
                                  >
                                    Set Default
                                  </button>
                                </Show>
                                <Show when={distro.state === 'Running'}>
                                  <button
                                    onClick={() => terminateDistro(distro.name)}
                                    disabled={loading()}
                                    style={{
                                      padding: '6px 12px',
                                      background: 'transparent',
                                      border: '1px solid #ff6b6b',
                                      color: '#ff6b6b',
                                      'font-size': '10px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      'align-items': 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Power size={10} />
                                    Terminate
                                  </button>
                                </Show>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>

                    {/* WSL Actions */}
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '12px' }}>
                      <button
                        onClick={updateWsl}
                        disabled={loading()}
                        style={{
                          padding: '12px',
                          background: 'transparent',
                          border: '1px solid var(--accent-primary)',
                          color: 'var(--accent-primary)',
                          'font-weight': 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          gap: '8px',
                          'font-size': '12px'
                        }}
                      >
                        <Download size={14} />
                        UPDATE WSL
                      </button>
                      <button
                        onClick={shutdownAll}
                        disabled={loading()}
                        style={{
                          padding: '12px',
                          background: 'transparent',
                          border: '1px solid #ff6b6b',
                          color: '#ff6b6b',
                          'font-weight': 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          gap: '8px',
                          'font-size': '12px'
                        }}
                      >
                        <Power size={14} />
                        SHUTDOWN ALL
                      </button>
                    </div>

                    {/* Info Note */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(250, 204, 21, 0.1)',
                      border: '1px solid #facc15',
                      'font-size': '11px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <AlertTriangle size={14} color="#facc15" style={{ 'flex-shrink': 0 }} />
                      <div>
                        <strong style={{ color: '#facc15' }}>Note:</strong> Terminating a distro stops all processes. Shutdown All will also stop Better CLI. To install new distros, use Microsoft Store or <code style={{ 'font-family': 'monospace', background: 'var(--bg-app)', padding: '2px 4px' }}>wsl --install</code>.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-std)', background: 'var(--bg-panel)' }}>
                  <div style={{ padding: '16px', 'border-bottom': '1px solid var(--border-subtle)', 'font-weight': 700, 'text-transform': 'uppercase', 'letter-spacing': '1px' }}>Terminal Behavior</div>
                  <div style={{ padding: '16px', display: 'grid', 'grid-template-columns': '1fr', gap: '16px' }}>
                    {/* Ctrl+C Behavior */}
                    <div>
                      <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '8px' }}>Ctrl+C behavior</div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <label style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border-std)', background: props.value === 'copy' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                          <input type="radio" name="ctrlc" checked={props.value === 'copy'} onChange={() => props.onChange('copy')} />
                          <span style={{ 'font-size': '13px', 'font-weight': 700 }}>Copy selection</span>
                        </label>
                        <label style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border-std)', background: props.value === 'cancel' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                          <input type="radio" name="ctrlc" checked={props.value === 'cancel'} onChange={() => props.onChange('cancel')} />
                          <span style={{ 'font-size': '13px', 'font-weight': 700 }}>Cancel (SIGINT)</span>
                        </label>
                      </div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-top': '8px' }}>When set to Copy, Ctrl+C will not terminate the running process.</div>
                    </div>

                    {/* Newline Key Mapping */}
                    <Show when={props.onNewlineKeyChange}>
                      <div>
                        <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '8px' }}>New line shortcut (sends Alt+Enter to CLI)</div>
                        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', gap: '8px' }}>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.newlineKey === 'shift+enter' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="newline" checked={props.newlineKey === 'shift+enter'} onChange={() => props.onNewlineKeyChange?.('shift+enter')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>Shift+Enter</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.newlineKey === 'ctrl+enter' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="newline" checked={props.newlineKey === 'ctrl+enter'} onChange={() => props.onNewlineKeyChange?.('ctrl+enter')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>Ctrl+Enter</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.newlineKey === 'alt+enter' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="newline" checked={props.newlineKey === 'alt+enter'} onChange={() => props.onNewlineKeyChange?.('alt+enter')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>Alt+Enter</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.newlineKey === 'none' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="newline" checked={props.newlineKey === 'none'} onChange={() => props.onNewlineKeyChange?.('none')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>None</span>
                          </label>
                        </div>
                        <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-top': '8px' }}>For AI CLIs (Gemini, Codex): Map your preferred key to Alt+Enter for multi-line input.</div>
                      </div>
                    </Show>

                    {/* Cancel Key Mapping */}
                    <Show when={props.onCancelKeyChange && props.value === 'copy'}>
                      <div>
                        <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '8px' }}>Cancel/Interrupt shortcut (sends SIGINT)</div>
                        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(5, 1fr)', gap: '8px' }}>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.cancelKey === 'ctrl+end' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="cancel" checked={props.cancelKey === 'ctrl+end'} onChange={() => props.onCancelKeyChange?.('ctrl+end')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>Ctrl+End</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.cancelKey === 'ctrl+break' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="cancel" checked={props.cancelKey === 'ctrl+break'} onChange={() => props.onCancelKeyChange?.('ctrl+break')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>Ctrl+Break</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.cancelKey === 'ctrl+d' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="cancel" checked={props.cancelKey === 'ctrl+d'} onChange={() => props.onCancelKeyChange?.('ctrl+d')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>Ctrl+D</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.cancelKey === 'esc' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="cancel" checked={props.cancelKey === 'esc'} onChange={() => props.onCancelKeyChange?.('esc')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>Esc</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px', padding: '8px', border: '1px solid var(--border-std)', background: props.cancelKey === 'none' ? 'var(--bg-active)' : 'transparent', cursor: 'pointer' }}>
                            <input type="radio" name="cancel" checked={props.cancelKey === 'none'} onChange={() => props.onCancelKeyChange?.('none')} />
                            <span style={{ 'font-size': '12px', 'font-family': 'monospace', 'font-weight': 700 }}>None</span>
                          </label>
                        </div>
                        <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-top': '8px' }}>Only available when Ctrl+C is set to Copy. Use this to cancel running processes.</div>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
           </div>
       </div>
    </div>
  );
};

export default SettingsPage;
