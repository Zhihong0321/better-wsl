import { type Component, createSignal, Show } from 'solid-js';
import FolderManager from './FolderManager';

interface SettingsProps {
  value: 'copy' | 'cancel';
  onChange: (v: 'copy' | 'cancel') => void;
}

const SettingsPage: Component<SettingsProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'settings' | 'folder'>('settings');

  return (
    <div class="fade-in" style={{ padding: '0', height: '100%', background: 'var(--bg-app)', color: 'var(--text-std)', display: 'flex', "flex-direction": 'column' }}>
       {/* Tab Navigation */}
       <div style={{ display: 'flex', "border-bottom": '1px solid var(--border-std)', background: 'var(--bg-panel)' }}>
           <button 
               onClick={() => setActiveTab('settings')}
               style={{
                   padding: '12px 24px',
                   background: activeTab() === 'settings' ? 'var(--bg-app)' : 'transparent',
                   border: 'none',
                   "border-bottom": activeTab() === 'settings' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                   "font-weight": 'bold',
                   color: activeTab() === 'settings' ? 'var(--text-std)' : 'var(--text-muted)',
                   cursor: 'pointer'
               }}
           >
               Settings
           </button>
           <button 
               onClick={() => setActiveTab('folder')}
               style={{
                   padding: '12px 24px',
                   background: activeTab() === 'folder' ? 'var(--bg-app)' : 'transparent',
                   border: 'none',
                   "border-bottom": activeTab() === 'folder' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                   "font-weight": 'bold',
                   color: activeTab() === 'folder' ? 'var(--text-std)' : 'var(--text-muted)',
                   cursor: 'pointer'
               }}
           >
               Folder Manager
           </button>
       </div>

       {/* Content */}
       <div style={{ flex: 1, overflow: 'hidden' }}>
           <Show when={activeTab() === 'settings'}>
               <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '24px', 'max-width': '800px' }}>
                    <div style={{ 'border-bottom': '1px solid var(--border-std)', padding: '12px 0' }}>
                      <h1 style={{ margin: 0, 'font-size': '20px', 'text-transform': 'uppercase', 'letter-spacing': '2px' }}>Settings</h1>
                      <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>Better CLI Configuration</div>
                    </div>

                    <div style={{ border: '1px solid var(--border-std)', background: 'var(--bg-panel)' }}>
                      <div style={{ padding: '16px', 'border-bottom': '1px solid var(--border-subtle)', 'font-weight': 700, 'text-transform': 'uppercase', 'letter-spacing': '1px' }}>Key & Shortcut</div>
                      <div style={{ padding: '16px', display: 'grid', 'grid-template-columns': '1fr', gap: '12px' }}>
                        <div style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>Ctrl+C behavior</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <label style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border-std)', background: props.value === 'copy' ? 'var(--bg-active)' : 'transparent' }}>
                            <input type="radio" name="ctrlc" checked={props.value === 'copy'} onChange={() => props.onChange('copy')} />
                            <span style={{ 'font-size': '13px', 'font-weight': 700 }}>Copy selection</span>
                          </label>
                          <label style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border-std)', background: props.value === 'cancel' ? 'var(--bg-active)' : 'transparent' }}>
                            <input type="radio" name="ctrlc" checked={props.value === 'cancel'} onChange={() => props.onChange('cancel')} />
                            <span style={{ 'font-size': '13px', 'font-weight': 700 }}>Cancel (SIGINT)</span>
                          </label>
                        </div>
                        <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>When set to Copy, Ctrl+C will not terminate the running process.</div>
                      </div>
                    </div>
                  </div>
               </div>
           </Show>
           <Show when={activeTab() === 'folder'}>
               <FolderManager />
           </Show>
       </div>
    </div>
  );
};

export default SettingsPage;
