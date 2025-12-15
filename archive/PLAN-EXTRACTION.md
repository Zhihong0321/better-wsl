# Auto-Pilot Response Extraction Plan

## 1. The Challenge
We need to reliably extract the output of a command run in a "Coding IDE" (WSL Shell) session, filtering out:
- The command itself (input echo).
- Shell prompts.
- Terminal control codes (ANSI).
- Noise from `.bashrc` or other background processes.

## 2. The Solution: "Controlled Prompt Handshake"

Instead of guessing when a command finishes (which is flaky), we **enforce** a unique End-of-Transmission (EOT) signal by manipulating the shell's prompt (`PS1`).

### Phase 1: Handshake (Session Initialization)
1. **Connect**: Attach to the `node-pty` process of the target session.
2. **Silence**: Send `stty -echo` to prevent the shell from echoing our commands back. This solves the "input echo" problem at the source.
3. **Mark**: Send `export PS1="\n___CMD_DONE___\n"`.
   - We use a newline before and after to ensure the marker is isolated.
   - `___CMD_DONE___` acts as our unique EOT signal.
4. **Verify**: Wait for the first `___CMD_DONE___` to appear in the output stream.
   - Once detected, the session is "Ready" and "Controlled".

### Phase 2: Execution Loop (The "Extract" Operation)
1. **Send**: Write the command to the pty (e.g., `npm test\r`).
2. **Listen**: Accumulate data chunks into a buffer.
3. **Detect**: Check the buffer for `\n___CMD_DONE___\n`.
4. **Extract**:
   - **Stop** listening when marker is found.
   - **Clean** ANSI codes from the buffer (colors, cursor movements).
   - **Trim** whitespace.
   - The result is the **Pure Response**.

### Phase 3: Bridging (Dual Agent Communication)
Once we have the Pure Response string:
1. **Package**: Wrap it in a structured message:
   ```json
   {
     "from": "Agent-IDE",
     "to": "Agent-Architect",
     "type": "execution_result",
     "content": "Tests passed: 5/5"
   }
   ```
2. **Route**: Send this packet via the existing WebSocket/IPC link to the other agent.

## 3. Proof of Concept Verification
We have successfully implemented and verified this logic in `server/proof_of_extraction.js`.
- **Test**: Simulated a coder writing a React component.
- **Result**: Extracted *only* the file content and "Done" message, with zero noise.
- **Reliability**: Tested with `wsl.exe` and full environment loading.

## 4. Implementation Steps
1. **Refactor**: Move the logic from `proof_of_extraction.js` into a reusable `ShellSession` class in `server/lib/ShellSession.js`.
2. **Integrate**: Update `server/index.js` to use `ShellSession` for Auto-Pilot links.
3. **Deploy**: Update the frontend to visualize this "Clean Output" mode.
