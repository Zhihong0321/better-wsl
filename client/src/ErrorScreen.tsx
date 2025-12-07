import { type Component } from 'solid-js';
import { AlertTriangle, Terminal, ArrowRight } from 'lucide-solid';

const ErrorScreen: Component = () => {
    return (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', "align-items": 'center', "justify-content": 'center',
            background: 'var(--bg-app)',
            color: 'var(--text-std)',
            "font-family": 'var(--font-stack)',
            padding: '20px'
        }}>
            <div style={{
                "max-width": '600px',
                background: 'rgba(255, 0, 0, 0.05)',
                border: '1px solid var(--accent-danger)',
                padding: '40px',
                display: 'flex', "flex-direction": 'column', "align-items": 'center', "text-align": 'center',
                "box-shadow": '0 0 50px rgba(0,0,0,0.5)'
            }}>
                <div style={{
                    width: '64px', height: '64px',
                    "border-radius": '50%',
                    background: 'rgba(255, 0, 0, 0.1)',
                    display: 'flex', "align-items": 'center', "justify-content": 'center',
                    "margin-bottom": '24px',
                    color: 'var(--accent-danger)'
                }}>
                    <AlertTriangle size={32} />
                </div>

                <h1 style={{ "font-size": '24px', "margin-bottom": '12px', "text-transform": 'uppercase', "letter-spacing": '2px' }}>
                    System Requirements Not Met
                </h1>

                <p style={{ "font-size": '14px', "line-height": '1.6', "margin-bottom": '32px', color: 'var(--text-muted)' }}>
                    Better WSL relies on the <strong>Windows Subsystem for Linux (WSL)</strong> to provide a secure, isolated development environment.
                    We could not detect a valid WSL installation on your system.
                </p>

                <div style={{ "text-align": 'left', width: '100%', "margin-bottom": '32px' }}>
                    <div style={{ "font-weight": 'bold', "margin-bottom": '12px', "font-size": '12px', "text-transform": 'uppercase' }}>
                        How to Install WSL
                    </div>
                    <div style={{
                        background: '#000', padding: '16px',
                        "border-radius": '4px', "font-family": 'monospace', "font-size": '13px',
                        display: 'flex', "align-items": 'center', "justify-content": 'space-between',
                        border: '1px solid var(--border-std)'
                    }}>
                        <span>wsl --install</span>
                    </div>
                    <p style={{ "font-size": '12px', "margin-top": '8px', color: 'var(--text-muted)' }}>
                        Open PowerShell as Administrator and run the command above. Then restart your computer.
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--accent-danger)',
                        color: 'white',
                        border: 'none',
                        "font-weight": 'bold',
                        cursor: 'pointer',
                        display: 'flex', "align-items": 'center', gap: '8px',
                        "text-transform": 'uppercase',
                        "letter-spacing": '1px'
                    }}
                >
                    <Terminal size={16} /> Check Again <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default ErrorScreen;
