import { createSignal, onMount, Show, Switch, Match, ErrorBoundary } from 'solid-js';
import TerminalComponent from './Terminal';
import Sidebar from './Sidebar';
import ToolsPanel from './Tools';
import WelcomeScreen from './WelcomeScreen';
import SettingsPage from './Settings';
import ErrorScreen from './ErrorScreen';
import FileBrowser from './FileBrowser';
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
}

function App() {
  const [sessions, setSessions] = createSignal<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = createSignal<string | null>(null);
  const [currentView, setCurrentView] = createSignal<'sessions' | 'tools' | 'settings' | 'clipboard'>('sessions');
  const initialCtrlC = ((): 'copy' | 'cancel' => {
    const v = localStorage.getItem('ctrlCBehavior');
    return v === 'cancel' ? 'cancel' : 'copy';
  })();
  const [ctrlCBehavior, setCtrlCBehavior] = createSignal<'copy' | 'cancel'>(initialCtrlC);
  const [currentProject, setCurrentProject] = createSignal<string | null>(null);
  const [gitInfo, setGitInfo] = createSignal<GitInfo | null>(null);
  const [sessionStates, setSessionStates] = createSignal<Record<string, 'waiting' | 'processing'>>({});
  const [showNewSessionBrowser, setShowNewSessionBrowser] = createSignal(false);

  // System Status
  const [checkingStatus, setCheckingStatus] = createSignal(true);
  const [systemReady, setSystemReady] = createSignal(false);
  const [bridgeReady, setBridgeReady] = createSignal(true);

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
    try {
      const res = await fetch('http://localhost:3000/api/system/status');
      const data = await res.json();
      setSystemReady(data.wslInstalled);
      const bb = data.browserBridge;
      const ok = bb && (bb.wslviewInstalled || bb.xdgOpenInstalled);
      setBridgeReady(!!ok);
    } catch (err) {
      console.error("System check failed", err);
      setSystemReady(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/sessions');
      const data = await res.json();
      // Filter sessions for current project
      const projectSessions = data.filter((s: Session) => s.project === currentProject());
      setSessions(projectSessions);

      if (projectSessions.length > 0 && !activeSessionId()) {
        setActiveSessionId(projectSessions[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
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

  // Poll for sessions occasionally
  onMount(() => {
    checkSystem();
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
        <Show when={!checkingStatus()} fallback={
          <div class="fade-in-slow" style={{
            width: '100%', height: '100%', display: 'flex',
            "align-items": 'center', "justify-content": 'center', color: 'var(--text-muted)'
          }}>
            <span class="pulse-slow">Initializing Better WSL...</span>
          </div>
        }>
          <Show when={systemReady()} fallback={<ErrorScreen />}>
            <Show when={currentProject()} fallback={
              <WelcomeScreen onSelectProject={handleProjectSelect} />
            }>
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
                        onActivity={(active) => {
                            setSessionStates(prev => ({ ...prev, [id()]: active ? 'processing' : 'waiting' }));
                        }}
                    />}
                  </Show>
                </Match>
                <Match when={currentView() === 'tools'}>
                  <ToolsPanel onInstall={handleInstallTool} />
                </Match>
                <Match when={currentView() === 'settings'}>
                  <SettingsPage
                    value={ctrlCBehavior()}
                    onChange={(v) => { setCtrlCBehavior(v); localStorage.setItem('ctrlCBehavior', v); }}
                  />
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
                         <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                             <FileBrowser
                                 onSelect={handleSessionCreate}
                                 onCancel={() => setShowNewSessionBrowser(false)}
                             />
                         </div>
                    </div>
                </div>
              </Show>
            </Show>
          </Show>
        </Show>
      </ErrorBoundary>
    </div>
  );
}

export default App;
