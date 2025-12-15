import { type Component, createSignal, onMount, Show, For } from 'solid-js';
import { Rocket, CheckCircle, Loader, AlertCircle, Terminal, Package, Settings as SettingsIcon } from 'lucide-solid';

interface DistroInfo {
  name: string;
  state: string;
  version: string;
  isDefault: boolean;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  output?: string;
  error?: string;
}

interface SetupPageProps {
  onComplete: () => void;
}

const SetupPage: Component<SetupPageProps> = (props) => {
  const [currentStage, setCurrentStage] = createSignal<'select' | 'installing' | 'complete'>('select');
  const [distros, setDistros] = createSignal<DistroInfo[]>([]);
  const [selectedDistro, setSelectedDistro] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [steps, setSteps] = createSignal<SetupStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = createSignal(0);

  const SETUP_STEPS: SetupStep[] = [
    {
      id: 'check-wsl',
      title: 'Check WSL Installation',
      description: 'Verifying Windows Subsystem for Linux is installed',
      status: 'pending'
    },
    {
      id: 'wsl-init',
      title: 'Initialize WSL Distribution',
      description: 'Starting and configuring the selected WSL distribution',
      status: 'pending'
    },
    {
      id: 'check-sudo',
      title: 'Verify Sudo Access',
      description: 'Checking sudo privileges for package installation',
      status: 'pending'
    },
    {
      id: 'install-curl',
      title: 'Install cURL',
      description: 'Installing cURL for downloading packages',
      status: 'pending'
    },
    {
      id: 'install-node',
      title: 'Install Node.js & npm',
      description: 'Installing Node.js runtime and package manager',
      status: 'pending'
    },
    {
      id: 'configure-npm',
      title: 'Configure npm',
      description: 'Setting up npm global prefix and PATH',
      status: 'pending'
    },
    {
      id: 'verify',
      title: 'Verify Installation',
      description: 'Checking all tools are working correctly',
      status: 'pending'
    }
  ];

  const fetchDistros = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/wsl/distros', {
        method: 'POST'
      });
      const data = await res.json();
      setDistros(data.distros || []);
      
      // Auto-select default distro
      const defaultDistro = data.distros?.find((d: DistroInfo) => d.isDefault);
      if (defaultDistro) {
        setSelectedDistro(defaultDistro.name);
      }
    } catch (err) {
      console.error('Failed to fetch distros:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStepStatus = (index: number, status: SetupStep['status'], output?: string, error?: string) => {
    setSteps(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status, output, error };
      return updated;
    });
  };

  const executeStep = async (stepId: string, index: number): Promise<boolean> => {
    updateStepStatus(index, 'running');
    setCurrentStepIndex(index);

    try {
      const res = await fetch('http://localhost:3001/api/setup/execute-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stepId,
          distro: selectedDistro()
        })
      });

      const data = await res.json();
      
      if (data.success) {
        updateStepStatus(index, 'complete', data.output);
        return true;
      } else {
        updateStepStatus(index, 'error', data.output, data.error);
        return false;
      }
    } catch (err: any) {
      updateStepStatus(index, 'error', undefined, err.message);
      return false;
    }
  };

  const startSetup = async () => {
    if (!selectedDistro()) {
      alert('Please select a WSL distribution first');
      return;
    }

    setCurrentStage('installing');
    setSteps(SETUP_STEPS.map(s => ({ ...s })));

    // Execute steps sequentially
    for (let i = 0; i < SETUP_STEPS.length; i++) {
      const success = await executeStep(SETUP_STEPS[i].id, i);
      if (!success) {
        // Stop on error
        return;
      }
    }

    // All steps complete
    setCurrentStage('complete');
  };

  const getStepIcon = (step: SetupStep) => {
    switch (step.status) {
      case 'complete':
        return <CheckCircle size={20} color="#4ade80" />;
      case 'running':
        return <Loader size={20} color="var(--accent-primary)" class="spin" />;
      case 'error':
        return <AlertCircle size={20} color="#ff6b6b" />;
      default:
        return <div style={{ 
          width: '20px', 
          height: '20px', 
          border: '2px solid var(--border-std)',
          'border-radius': '50%'
        }} />;
    }
  };

  onMount(() => {
    fetchDistros();
  });

  return (
    <div class="fade-in" style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      'align-items': 'center', 
      'justify-content': 'center',
      background: 'var(--bg-app)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        'max-width': '800px',
        background: 'var(--bg-panel)',
        border: '2px solid var(--accent-primary)',
        display: 'flex',
        'flex-direction': 'column',
        'max-height': '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          'border-bottom': '1px solid var(--border-std)',
          background: 'var(--bg-app)'
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '8px' }}>
            <Rocket size={32} color="var(--accent-primary)" />
            <h1 style={{ 
              margin: 0, 
              'font-size': '24px', 
              'text-transform': 'uppercase',
              'letter-spacing': '2px'
            }}>
              WSL Setup
            </h1>
          </div>
          <p style={{ 
            margin: 0, 
            color: 'var(--text-muted)', 
            'font-size': '13px'
          }}>
            Initialize your WSL environment with essential development tools
          </p>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Stage 1: Select Distro */}
          <Show when={currentStage() === 'select'}>
            <div class="fade-in">
              <div style={{ 'margin-bottom': '24px' }}>
                <h2 style={{ 
                  'font-size': '16px', 
                  'text-transform': 'uppercase',
                  'letter-spacing': '1px',
                  'margin-bottom': '8px'
                }}>
                  Step 1: Select WSL Distribution
                </h2>
                <p style={{ 
                  color: 'var(--text-muted)', 
                  'font-size': '13px',
                  margin: '0 0 16px 0'
                }}>
                  Choose the Linux distribution to set up
                </p>

                <Show when={loading()} fallback={
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
                    <For each={distros()} fallback={
                      <div style={{ 
                        padding: '16px', 
                        border: '1px solid var(--border-std)',
                        'text-align': 'center',
                        color: 'var(--text-muted)'
                      }}>
                        No WSL distributions found. Please install WSL first.
                      </div>
                    }>
                      {(distro) => (
                        <button
                          onClick={() => setSelectedDistro(distro.name)}
                          style={{
                            padding: '16px',
                            border: `2px solid ${selectedDistro() === distro.name ? 'var(--accent-primary)' : 'var(--border-std)'}`,
                            background: selectedDistro() === distro.name ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-app)',
                            'text-align': 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            'justify-content': 'space-between',
                            'align-items': 'center'
                          }}
                        >
                          <div>
                            <div style={{ 
                              'font-weight': 'bold', 
                              'font-size': '14px',
                              'margin-bottom': '4px'
                            }}>
                              {distro.name}
                              <Show when={distro.isDefault}>
                                <span style={{
                                  'margin-left': '8px',
                                  padding: '2px 6px',
                                  background: '#4ade80',
                                  color: 'var(--bg-app)',
                                  'font-size': '9px',
                                  'text-transform': 'uppercase'
                                }}>
                                  DEFAULT
                                </span>
                              </Show>
                            </div>
                            <div style={{ 
                              'font-size': '12px', 
                              color: 'var(--text-muted)',
                              'font-family': 'monospace'
                            }}>
                              {distro.state} • WSL {distro.version}
                            </div>
                          </div>
                          <Show when={selectedDistro() === distro.name}>
                            <CheckCircle size={24} color="var(--accent-primary)" />
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                }>
                  <div style={{ 
                    padding: '32px', 
                    'text-align': 'center',
                    color: 'var(--text-muted)'
                  }}>
                    <Loader size={32} color="var(--accent-primary)" class="spin" />
                    <p style={{ 'margin-top': '12px' }}>Loading distributions...</p>
                  </div>
                </Show>
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(74, 222, 128, 0.05)',
                border: '1px solid #4ade80',
                'margin-bottom': '24px'
              }}>
                <div style={{ 
                  'font-weight': 'bold', 
                  'font-size': '13px',
                  'margin-bottom': '8px',
                  color: '#4ade80'
                }}>
                  What will be installed:
                </div>
                <ul style={{ 
                  margin: '0',
                  padding: '0 0 0 20px',
                  'font-size': '12px',
                  color: 'var(--text-muted)',
                  'line-height': '1.6'
                }}>
                  <li>WSL (Windows Subsystem for Linux) - if not installed</li>
                  <li>Selected Linux Distribution</li>
                  <li>Sudo (privilege escalation)</li>
                  <li>cURL (download tool)</li>
                  <li>Node.js v20 LTS (JavaScript runtime)</li>
                  <li>npm (Node package manager)</li>
                  <li>Configured npm global directory</li>
                </ul>
              </div>
            </div>
          </Show>

          {/* Stage 2: Installing */}
          <Show when={currentStage() === 'installing'}>
            <div class="fade-in" style={{ display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
              <For each={steps()}>
                {(step, index) => (
                  <div style={{
                    padding: '16px',
                    border: `1px solid ${
                      step.status === 'complete' ? '#4ade80' :
                      step.status === 'running' ? 'var(--accent-primary)' :
                      step.status === 'error' ? '#ff6b6b' :
                      'var(--border-std)'
                    }`,
                    background: step.status === 'running' ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-app)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      'align-items': 'center', 
                      gap: '12px',
                      'margin-bottom': step.output ? '12px' : '0'
                    }}>
                      {getStepIcon(step)}
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          'font-weight': 'bold', 
                          'font-size': '14px',
                          'margin-bottom': '4px'
                        }}>
                          {step.title}
                        </div>
                        <div style={{ 
                          'font-size': '12px', 
                          color: 'var(--text-muted)'
                        }}>
                          {step.description}
                        </div>
                      </div>
                      <div style={{ 
                        'font-size': '11px',
                        color: 'var(--text-muted)',
                        'font-family': 'monospace'
                      }}>
                        {index() + 1} / {steps().length}
                      </div>
                    </div>

                    <Show when={step.output}>
                      <div style={{
                        padding: '12px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-std)',
                        'font-family': 'monospace',
                        'font-size': '11px',
                        color: 'var(--text-muted)',
                        'max-height': '150px',
                        overflow: 'auto',
                        'white-space': 'pre-wrap'
                      }}>
                        {step.output}
                      </div>
                    </Show>

                    <Show when={step.error}>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(255, 107, 107, 0.1)',
                        border: '1px solid #ff6b6b',
                        color: '#ff6b6b',
                        'font-family': 'monospace',
                        'font-size': '11px'
                      }}>
                        Error: {step.error}
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>

          {/* Stage 3: Complete */}
          <Show when={currentStage() === 'complete'}>
            <div class="fade-in" style={{ 
              'text-align': 'center',
              padding: '40px'
            }}>
              <CheckCircle size={64} color="#4ade80" style={{ margin: '0 auto 24px' }} />
              <h2 style={{ 
                'font-size': '20px',
                'margin-bottom': '12px',
                'text-transform': 'uppercase',
                'letter-spacing': '2px'
              }}>
                Setup Complete!
              </h2>
              <p style={{ 
                color: 'var(--text-muted)',
                'font-size': '14px',
                'margin-bottom': '32px'
              }}>
                Your WSL environment is ready for development
              </p>
              <div style={{
                padding: '16px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-std)',
                'text-align': 'left',
                'margin-bottom': '24px'
              }}>
                <div style={{ 
                  'font-weight': 'bold',
                  'font-size': '13px',
                  'margin-bottom': '12px'
                }}>
                  Installed Tools:
                </div>
                <div style={{ 
                  display: 'grid',
                  'grid-template-columns': '1fr 1fr',
                  gap: '8px',
                  'font-size': '12px',
                  'font-family': 'monospace'
                }}>
                  <div style={{ color: '#4ade80' }}>✓ WSL</div>
                  <div style={{ color: '#4ade80' }}>✓ Node.js</div>
                  <div style={{ color: '#4ade80' }}>✓ Sudo</div>
                  <div style={{ color: '#4ade80' }}>✓ npm</div>
                  <div style={{ color: '#4ade80' }}>✓ cURL</div>
                  <div style={{ color: '#4ade80' }}>✓ PATH configured</div>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          'border-top': '1px solid var(--border-std)',
          background: 'var(--bg-app)',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <Show when={currentStage() === 'select'}>
            <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>
              {distros().length} distribution{distros().length !== 1 ? 's' : ''} available
            </div>
            <button
              onClick={startSetup}
              disabled={!selectedDistro() || loading()}
              style={{
                padding: '10px 24px',
                background: selectedDistro() ? 'var(--accent-primary)' : 'var(--bg-app)',
                border: '1px solid var(--accent-primary)',
                color: selectedDistro() ? 'var(--bg-app)' : 'var(--text-muted)',
                'font-weight': 'bold',
                'font-size': '13px',
                'text-transform': 'uppercase',
                cursor: selectedDistro() ? 'pointer' : 'not-allowed',
                opacity: selectedDistro() ? 1 : 0.5,
                display: 'flex',
                'align-items': 'center',
                gap: '8px'
              }}
            >
              <Rocket size={16} />
              Start Setup
            </button>
          </Show>

          <Show when={currentStage() === 'installing'}>
            <div style={{ 
              'font-size': '12px', 
              color: 'var(--text-muted)',
              'font-family': 'monospace'
            }}>
              Step {currentStepIndex() + 1} of {steps().length}
            </div>
            <div style={{ 
              'font-size': '13px',
              color: 'var(--accent-primary)',
              'font-weight': 'bold'
            }}>
              Installing...
            </div>
          </Show>

          <Show when={currentStage() === 'complete'}>
            <div />
            <button
              onClick={props.onComplete}
              style={{
                padding: '10px 24px',
                background: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--bg-app)',
                'font-weight': 'bold',
                'font-size': '13px',
                'text-transform': 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                'align-items': 'center',
                gap: '8px'
              }}
            >
              <Terminal size={16} />
              Start Using Better CLI
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
