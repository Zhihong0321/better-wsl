import { createSignal } from 'solid-js';
import SetupPage from './Setup';
import './App.css';

function SetupApp() {
  const [setupComplete, setSetupComplete] = createSignal(false);

  const handleComplete = () => {
    setSetupComplete(true);
    setTimeout(() => {
      alert('Setup Complete!\n\nYou can now close this window and run start.bat to launch Better CLI.');
    }, 500);
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: 'var(--bg-app)' }}>
      <SetupPage onComplete={handleComplete} />
    </div>
  );
}

export default SetupApp;
