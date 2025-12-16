import { createSignal, onMount, Show, Switch, Match, ErrorBoundary } from 'solid-js';
import TerminalComponent from './Terminal';
import Sidebar from './Sidebar';
import ToolsPanel from './Tools';
import ToolsNew from './ToolsNew';
import WelcomeScreen from './WelcomeScreen';
import SettingsPage from './Settings';
import SetupPage from './Setup';
import ErrorScreen from './ErrorScreen';
import FileBrowser from './FileBrowser';
import AutoPilot from './AutoPilot';
import SessionFileExplorer from './SessionFileExplorer';
import './App.css';

interface Session {
  id: string;
  project?: string;
}

interface GitInfo {
    isGit: boolean;
    remoteUrl?: string;
    lastCommit?: {
        hash: string;
        date: string;
        message: string;
    };
    commits?: {
        hash: string;
        date: string;
        message: string;
    }[];
}

function App() {
  const [sessions, setSessions] = createSignal<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = createSignal<string | null>(null);
  const [currentView, setCurrentView] = createSignal<'sessions' | 'tools' | 'settings' | 'clipboard' | 'autopilot'>('sessions');
  const initialCtrlC = ((): 'copy' | 'cancel' => {
    const v = localStorage.getItem('ctrlCBehavior');
    return v === 'cancel' ? 'cancel' : 'copy';
  })();
  const [ctrlCBehavior, setCtrlCBehavior] = createSignal<'copy' | 'cancel'>(initialCtrlC);
  
  const initialNewlineKey = ((): 'shift+enter' | 'ctrl+enter' | 'alt+enter' | 'none' => {
    const v = localStorage.getItem('newlineKey');
    return (v as any) || 'shift+enter';
  })();
  const [newlineKey, setNewlineKey] = createSignal<'shift+enter' | 'ctrl+enter' | 'alt+enter' | 'none'>(initialNewlineKey);
  
  const initialCancelKey = ((): 'ctrl+end' | 'ctrl+break' | 'ctrl+d' | 'esc' | 'none' => {
    const v = localStorage.getItem('cancelKey');
    return (v as any) || 'ctrl+end';
  })();
  const [cancelKey, setCancelKey] = createSignal<'ctrl+end' | 'ctrl+break' | 'ctrl+d' | 'esc' | 'none'>(initialCancelKey);
  const [currentProject, setCurrentProject] = createSignal<string | null>(null);
  const [gitInfo, setGitInfo] = createSignal<GitInfo | null>(null);
  const [sessionStates, setSessionStates] = createSignal<Record<string, 'waiting' | 'processing'>>({});
  const [showNewSessionBrowser, setShowNewSessionBrowser] = createSignal(false);
  const [explorerSessionId, setExplorerSessionId] = createSignal<string | null>(null);

  // System Status
  const [checkingStatus, setCheckingStatus] = createSignal(true);
  const [systemReady, setSystemReady] = createSignal(false);
  const [bridgeReady, setBridgeReady] = createSignal(true);
  const [backendAlive, setBackendAlive] = createSignal(true);
  const [needsSetup, setNeedsSetup] = createSignal(false);
  const [setupComplete, setSetupComplete] = createSignal(false);

  const fetchGitInfo = async (projectName: string) => {
    try {
        const res = await fetch(`http://localhost:3000/api/projects/${projectName}/git-status`);
        if (res.ok) {
            const data = await res.json();
            setGitInfo(data);
        } else {
            setGitInfo(null);
        }
    } catch (err) {
        console.error("Failed to fetch git info", err);
        setGitInfo(null);
    }
  };

  const checkSystem = async () => {
    // Check cache first (30 min TTL)
    const CACHE_KEY = 'system_health_cache';
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          console.log('[Cache] Using cached health check');
          setBackendAlive(true);
          setSystemReady(data.wslInstalled);
          setBridgeReady(data.bridgeReady);
          setNeedsSetup(data.needsSetup);
          setCheckingStatus(false);
          return;
        }
      } catch (e) {
        console.warn('[Cache] Invalid cache, will refresh');
      }
    }
    
    try {
      const res = await fetch('http://localhost:3000/api/system/status');
      const data = await res.json();
      setBackendAlive(true);
      setSystemReady(data.wslInstalled);
      const bb = data.browserBridge;
      const ok = bb && (bb.wslviewInstalled || bb.xdgOpenInstalled);
      setBridgeReady(!!ok);
      
      // Always check if setup is needed (even if WSL not installed yet)
      try {
        const sysInfoRes = await fetch('http://localhost:3000/api/tools/system-info', { method: 'POST' });
        const sysInfo = await sysInfoRes.json();
        
        // Show setup if WSL not installed OR essential tools missing
        const setupNeeded = !data.wslInstalled || !sysInfo.hasSudo || !sysInfo.hasCurl || !sysInfo.hasNode;
        setNeedsSetup(setupNeeded);
        
        // Cache the results
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: {
            wslInstalled: data.wslInstalled,
            bridgeReady: !!ok,
            needsSetup: setupNeeded
          },
          timestamp: Date.now()
        }));
      } catch (err) {
        // If can't check system info, assume setup is needed
        console.warn('Could not check system info, showing setup:', err);
        setNeedsSetup(true);
      }
    } catch (err) {
      console.error("System check failed", err);
      setBackendAlive(false);
      setSystemReady(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/sessions');
      const data = await res.json();
      
      // DON'T filter - show ALL sessions across all projects
      setSessions(data);

      // If no active session, select the first one
      if (data.length > 0 && !activeSessionId()) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const detectExistingSessions = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/sessions');
      const data = await res.json();
      
      if (data.length > 0) {
        // Show ALL sessions, not just from one project
        setSessions(data);
        
        // Set active session to first one
        const firstSession = data[0];
        setActiveSessionId(firstSession.id);
        setCurrentProject(firstSession.project);
        
        // Fetch git info for the first project
        if (firstSession.project) {
          await fetchGitInfo(firstSession.project);
        }
      }
    } catch (err) {
      console.error("Failed to detect existing sessions", err);
    }
  };

  const handleSessionCreate = async (path: string) => {
    setShowNewSessionBrowser(false);
    if (!path) return;

    setCurrentProject(path);
    try {
      const res = await fetch('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: path })
      });
      const data = await res.json();
      await fetchSessions();
      await fetchGitInfo(path);
      setActiveSessionId(data.id);
      setCurrentView('sessions');
    } catch (err) {
      alert("Failed to create session");
    }
  };

  const createSession = () => {
    setShowNewSessionBrowser(true);
  };

  const handleProjectSelect = async (projectName: string) => {
    setCurrentProject(projectName);
    await fetchSessions();
    await fetchGitInfo(projectName);
    // If no sessions, create one automatically
    if (sessions().length === 0) {
      await handleSessionCreate(projectName);
    }
  };

  const handleInstallTool = async (command: string) => {
    const id = activeSessionId();
    if (!id) {
      alert("Please create or select a session first.");
      return;
    }

    try {
      await fetch(`http://localhost:3000/api/sessions/${id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: command })
      });
      if (confirm(`Command sent to session ${id}. Switch to terminal to view progress?`)) {
        setCurrentView('sessions');
      }
    } catch (err) {
      alert("Failed to send command.");
    }
  };

  const handleInsert = async (text: string) => {
      const id = activeSessionId();
      if (!id) return;

      try {
          await fetch(`http://localhost:3000/api/sessions/${id}/input`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: text })
          });
      } catch (err) {
          console.error("Failed to insert text", err);
      }
  };

  const handleCheckout = async (hash: string) => {
    if (!currentProject()) return;
    if (!confirm(`Are you sure you want to checkout ${hash}? This will update your working directory.`)) return;

    try {
        const res = await fetch(`http://localhost:3000/api/projects/${currentProject()}/git-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash })
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            await fetchGitInfo(currentProject()!);
        } else {
            alert(data.error || 'Checkout failed');
        }
    } catch (err) {
        console.error("Failed to checkout", err);
        alert("Failed to checkout");
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    console.log('[App] Closing session:', sessionId);
    try {
      const res = await fetch(`http://localhost:3000/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      console.log('[App] Delete response status:', res.status);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to close session');
      }
      
      const data = await res.json();
      console.log('[App] Session closed:', data);
      
      // If we closed the active session, select another one
      if (activeSessionId() === sessionId) {
        const remaining = sessions().filter(s => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      await fetchSessions();
    } catch (err: any) {
      console.error('[App] Failed to close session:', err);
      alert(`Failed to close session: ${err.message}`);
    }
  };

  // Poll for sessions occasionally
  onMount(() => {
    checkSystem();
    
    // Detect existing sessions on mount
    setTimeout(() => {
      detectExistingSessions();
    }, 500);
    
    setInterval(() => {
      fetchSessions();
      if (currentProject()) {
        fetchGitInfo(currentProject()!);
      }
    }, 5000);
  });

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg-app)', position: 'relative' }}>
      <div class="scanline"></div>

      <ErrorBoundary fallback={(err) => (
        <div style={{ color: 'red', padding: '20px', "font-family": 'monospace' }}>
          <h1>CRITICAL SYSTEM FAILURE</h1>
          <pre>{err.toString()}</pre>
        </div>
      )}>
        <Show
          when={!checkingStatus()}
          fallback={
            <div class="fade-in-slow" style={{
              width: '100%', height: '100%', display: 'flex',
              "align-items": 'center', "justify-content": 'center', color: 'var(--text-muted)'
            }}>
              <span class="pulse-slow">Initializing Better WSL...</span>
            </div>
          }
        >
          <Show
            when={backendAlive()}
            fallback={
              <div class="fade-in" style={{
                width: '100%', height: '100%', display: 'flex', "flex-direction": 'column',
                "align-items": 'center', "justify-content": 'center', color: 'var(--text-muted)'
              }}>
                <div style={{ "font-size": '18px', "font-weight": 700, "margin-bottom": '8px' }}>Backend stopped</div>
                <div style={{ "font-size": '13px', "margin-bottom": '12px' }}>
                  The Better WSL server was shut down. You can safely close this tab or restart using start.bat.
                </div>
                <button
                  class="smooth-transition"
                  onClick={() => { setCheckingStatus(true); checkSystem(); }}
                  style={{
                    padding: '8px 14px', border: '1px solid var(--accent-primary)', background: 'transparent',
                    color: 'var(--accent-primary)', "font-weight": 700, cursor: 'pointer'
                  }}
                >Retry</button>
              </div>
            }
          >
            {/* Show setup first if needed, even before checking WSL */}
            <Show when={!needsSetup() || setupComplete()} fallback={
              <SetupPage onComplete={() => {
                setSetupComplete(true);
                setNeedsSetup(false);
                checkSystem(); // Re-check after setup
              }} />
            }>
            <Show when={systemReady()} fallback={<ErrorScreen />}>
                <Show
                  when={currentProject()}
                  fallback={<WelcomeScreen onSelectProject={handleProjectSelect} />}
                >
              <Sidebar
                sessions={sessions()}
                activeId={activeSessionId()}
                activeView={currentView()}
                onSelect={setActiveSessionId}
                onCreate={createSession}
                onViewChange={setCurrentView}
                onInsert={handleInsert}
                projectName={currentProject()!}
                sessionStates={sessionStates()}
                gitInfo={gitInfo()}
                ctrlCBehavior={ctrlCBehavior()}
                newlineKey={newlineKey()}
                cancelKey={cancelKey()}
                onDuplicate={() => currentProject() && handleSessionCreate(currentProject()!)}
                onOpenExplorer={(id) => setExplorerSessionId(id)}
                onCheckout={handleCheckout}
                onCloseSession={handleCloseSession}
                onCommit={() => fetchGitInfo(currentProject()!)}
              />

              <div class="fade-in" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <Show when={!bridgeReady()}>
                  <div class="fade-in" style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    padding: '10px 16px', background: 'var(--bg-panel)',
                    border: '1px solid var(--border-std)', color: 'var(--text-std)',
                    display: 'flex', "align-items": 'center', "justify-content": 'space-between',
                    "z-index": 20
                  }}>
                    <span style={{ "font-size": '12px' }}>Install WSL Browser Bridge to open login URLs in Windows.</span>
                    <button onClick={() => setCurrentView('tools')} style={{
                      padding: '6px 10px', background: 'var(--accent-primary)',
                      color: 'var(--bg-app)', border: 'none', "font-weight": 700, "font-size": '12px'
                    }}>Open Tools</button>
                  </div>
                </Show>
                <Switch>
                  <Match when={['sessions', 'clipboard'].includes(currentView())}>
                    <Show
                      when={activeSessionId()}
                      fallback={
                        <div class="fade-in" style={{
                          height: '100%', display: 'flex', "flex-direction": 'column',
                          "align-items": 'center', "justify-content": 'center',
                          color: 'var(--text-muted)'
                        }}>
                          <div class="pulse-slow" style={{
                            width: '80px', height: '80px', "margin-bottom": '20px',
                            border: '1px solid var(--border-std)',
                            display: 'flex', "align-items": 'center', "justify-content": 'center'
                          }}>
                            <span style={{ "font-size": '32px', "font-family": 'var(--font-stack)', "font-weight": 700 }}>{'> _'}</span>
                          </div>
                          <p style={{ "font-family": 'var(--font-stack)', "text-transform": 'uppercase' }}>Initialize Better WSL...</p>
                        </div>
                      }
                    >
                    {(id) => <TerminalComponent 
                        sessionId={id()} 
                        ctrlCBehavior={ctrlCBehavior()}
                        newlineKey={newlineKey()}
                        cancelKey={cancelKey()}
                        onActivity={(active) => {
                            setSessionStates(prev => ({ ...prev, [id()]: active ? 'processing' : 'waiting' }));
                        }}
                    />}
                  </Show>
                </Match>
                <Match when={currentView() === 'tools'}>
                  <ToolsNew 
                    onExecute={handleInstallTool}
                  />
                </Match>
                <Match when={currentView() === 'settings'}>
                  <SettingsPage
                    value={ctrlCBehavior()}
                    onChange={(v) => { setCtrlCBehavior(v); localStorage.setItem('ctrlCBehavior', v); }}
                    newlineKey={newlineKey()}
                    onNewlineKeyChange={(v) => { setNewlineKey(v); localStorage.setItem('newlineKey', v); }}
                    cancelKey={cancelKey()}
                    onCancelKeyChange={(v) => { setCancelKey(v); localStorage.setItem('cancelKey', v); }}
                    onOpenSetup={() => {
                      setNeedsSetup(true);
                      setSetupComplete(false);
                    }}
                  />
                </Match>
                <Match when={currentView() === 'autopilot'}>
                  <AutoPilot project={currentProject()!} />
                </Match>
              </Switch>
              </div>
              
              <Show when={showNewSessionBrowser()}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    "z-index": 100,
                    display: 'flex', "align-items": 'center', "justify-content": 'center'
                }}>
                    <div style={{
                        width: '600px', height: '500px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--accent-primary)',
                        display: 'flex', "flex-direction": 'column',
                        "box-shadow": '0 0 20px rgba(0,0,0,0.5)'
                    }}>
                         <div style={{
                             padding: '12px',
                             background: 'var(--accent-primary)',
                             color: 'var(--bg-app)',
                             "font-weight": 'bold',
                             display: 'flex', "align-items": 'center', gap: '8px'
                         }}>
                             <span>Select Folder for New Session</span>
                         </div>
                         <div style={{ 
                             flex: 1, 
                             overflow: 'hidden', 
                             position: 'relative',
                             display: 'flex',
                             "flex-direction": 'column',
                             "min-height": 0
                         }}>
                             <FileBrowser
                                 initialPath="~/better-cli-workspace"
                                 onSelect={handleSessionCreate}
                                 onCancel={() => setShowNewSessionBrowser(false)}
                             />
                         </div>
                    </div>
                </div>
              </Show>

              <Show when={explorerSessionId()}>
                  <SessionFileExplorer 
                      initialPath={`~/better-cli-workspace/${sessions().find(s => s.id === explorerSessionId())?.project || ''}`}
                      onClose={() => setExplorerSessionId(null)}
                  />
              </Show>
            </Show>
            </Show>
          </Show>
        </Show>
        </Show>
      </ErrorBoundary>
    </div>
  );
}

export default App;
