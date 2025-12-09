const pty = require('node-pty');
const os = require('os');

console.log("1. [SETUP] Spawning 'Coding IDE' (WSL Session)...");

// 1. Setup Shell
// We don't set PS1 here because .bashrc will likely overwrite it.
const ptyProcess = pty.spawn('wsl.exe', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
});

const PROMPT_MARKER = '___CMD_DONE___';
let buffer = '';
let state = 'INIT'; // INIT -> SETTING_PROMPT -> READY -> RUNNING_CMD -> DONE

ptyProcess.onData((data) => {
    // Log raw output for debugging
    process.stdout.write(data);
    buffer += data;

    // State Machine
    if (state === 'INIT') {
        // Wait for some output indicating shell is alive (e.g., standard prompt or just data)
        // We'll just wait a bit in the setTimeout, or assume first data is good enough.
        // Actually, let's rely on the timeout to send the PS1 setup to be safe against noise.
    } else if (state === 'SETTING_PROMPT') {
        // Use stricter check to avoid matching the command echo
        // The prompt should be on its own line
        if (buffer.match(/[\r\n]___CMD_DONE___[\r\n]/)) {
            console.log('\n2. [EVENT] Controlled Prompt Established.');
            state = 'READY';
            buffer = ''; // Clear buffer for next command
            
            // Trigger the actual test command
            runTestCommand();
        }
    } else if (state === 'RUNNING_CMD') {
        if (buffer.match(/[\r\n]___CMD_DONE___[\r\n]/)) {
            console.log('\n4. [EVENT] Command Finished. Extracting...');
            state = 'DONE';
            
            // Extract response
            // 1. Clean ANSI
            // eslint-disable-next-line no-control-regex
            const cleanBuffer = buffer.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
            
            // 2. Split by Marker
            // We use the marker string directly
            const parts = cleanBuffer.split(PROMPT_MARKER);
            let rawResponse = parts[0];
            
            // 3. Strip Input Echo
            // Since we used stty -echo, we might not have echo!
            // But if we did, we'd look for the first newline.
            // Let's just trim.
            let cleanResponse = rawResponse.trim();
            
            console.log('\n5. [PROOF] Extracted Pure Response:');
            console.log('---------------------------------------------------');
            console.log(cleanResponse);
            console.log('---------------------------------------------------');
            
            process.exit(0);
        }
    }
});

// Boot sequence
setTimeout(() => {
    console.log("\n2. [ACTION] Setting up controlled prompt...");
    state = 'SETTING_PROMPT';
    // We send export PS1=... and a clear to make sure we get a clean slate
    // Also disable echo to make extraction cleaner
    ptyProcess.write(`export PS1="\\n${PROMPT_MARKER}\\n"; stty -echo\r`);
}, 2000); // Give WSL 2 seconds to boot and source .bashrc

function runTestCommand() {
    console.log("\n3. [ACTION] Sending Complex Command to IDE...");
    state = 'RUNNING_CMD';
    
    // Complex command with Markdown
    const complexCommand = `echo "Creating component..."; echo '\`\`\`tsx'; echo 'export default function Test() {'; echo '  return <div>Hello</div>;'; echo '}'; echo '\`\`\`'; echo "Done."`;
    
    ptyProcess.write(complexCommand + '\r');
}
