# Network Latency Monitoring - Quick Start Guide

## 🎯 Overview

The Better WSL now has built-in network monitoring to track latency and performance when using AI coding tools. This helps you:
- **Detect which AI APIs** your tools are connecting to
- **Measure latency** (ping times) to those endpoints
- **Track packet loss** and connection stability
- **Compare VPN performance** by testing before/after connecting to VPN

---

## 🚀 API Endpoint

### `GET /api/sessions/:id/network-info`

Get real-time network information and latency metrics for a specific session.

**Response Format:**
```json
{
  "sessionId": "abc1234",
  "timestamp": "2025-12-06T14:20:00.000Z",
  "activeConnections": 3,
  "connections": [
    {
      "localAddress": "192.168.1.100:54321",
      "remoteAddress": "13.107.42.14:443",
      "remoteIp": "13.107.42.14",
      "remotePort": "443",
      "state": "ESTAB"
    }
  ],
  "detectedTools": ["codex", "aider"],
  "pingResults": [
    {
      "ip": "13.107.42.14",
      "hostname": "api.openai.com",
      "service": "OpenAI API",
      "target": "13.107.42.14",
      "success": true,
      "min": 12.5,
      "avg": 15.8,
      "max": 20.1,
      "packetLoss": 0
    }
  ],
  "summary": {
    "totalTargets": 1,
    "avgLatency": "15.80",
    "successfulPings": 1
  }
}
```

---

## 📋 How to Use

### Method 1: Using the Test Script

1. **Start your Better WSL** and create a session
2. **Run an AI coding tool** in that session (e.g., `codex`, `aider`)
3. **Run the test script:**
   ```bash
   cd server
   node test-network-monitor.js
   ```

### Method 2: Direct API Call

```bash
# Get all sessions
curl http://localhost:3000/api/sessions

# Get network info for a specific session
curl http://localhost:3000/api/sessions/YOUR_SESSION_ID/network-info
```

### Method 3: From JavaScript

```javascript
const sessionId = 'abc1234';
const response = await fetch(`http://localhost:3000/api/sessions/${sessionId}/network-info`);
const networkInfo = await response.json();

console.log('Average Latency:', networkInfo.summary.avgLatency, 'ms');
console.log('Detected APIs:', networkInfo.pingResults.map(r => r.service));
```

---

## 📊 Understanding the Metrics

### Latency (Ping Times)
- **Min**: Best case latency
- **Avg**: Average latency (most important for coding experience)
- **Max**: Worst case latency
- **Unit**: Milliseconds (ms)

**What's good?**
- `< 50ms`: Excellent (feels instant)
- `50-100ms`: Good (smooth experience)
- `100-200ms`: Acceptable (noticeable delay)
- `> 200ms`: Poor (frustrating delays)

### Packet Loss
- **0%**: Perfect connection
- **1-5%**: Minor issues, still usable
- **> 5%**: Significant problems, may timeout

---

## 🔧 VPN Performance Testing

To compare VPN performance:

### Step 1: Test WITHOUT VPN
```bash
node test-network-monitor.js
```
Note the average latency.

### Step 2: Connect to VPN
Connect to your VPN service.

### Step 3: Test WITH VPN
```bash
node test-network-monitor.js
```
Compare the latencies!

### Example Comparison:
```
Without VPN:  Avg: 45ms  → Excellent
With VPN A:   Avg: 180ms → Acceptable
With VPN B:   Avg: 85ms  → Good (Better choice!)
```

---

## 🤖 Supported AI Tools

The system automatically detects:
- **Codex** (OpenAI)
- **Aider** (Anthropic/OpenAI)
- **Cursor** (OpenAI)
- **GitHub Copilot**
- **Claude Code** (Anthropic)
- **Gemini** (Google)
- **Cline** (Anthropic)

---

## 🔍 What Gets Detected?

1. **Active Network Connections**: All established TCP connections from WSL
2. **Process Names**: Scans for running AI tool processes
3. **Target IPs**: External IPs being connected to
4. **Hostnames**: Reverse DNS lookup to identify services
5. **Ping Stats**: Real latency measurements to each target

---

## ⚙️ Technical Details

### How It Works:
1. Uses `ss` (socket statistics) to list active connections
2. Filters local connections (127.x, 192.168.x)
3. Performs reverse DNS on IPs to get hostnames
4. Pings each unique target (4 packets)
5. Parses results and identifies known AI APIs

### Requirements:
- WSL must be running
- Active session with network activity
- `ping` and `host` commands available in WSL

---

## 🎨 Next Steps

This is **Option A** - a working API endpoint. Here are ideas for expansion:

### Potential Enhancements:
- ✅ Add continuous monitoring (poll every 10s)
- ✅ Store historical data for trend analysis
- ✅ Create UI dashboard with graphs
- ✅ Add alerts when latency > threshold
- ✅ Export logs to CSV/JSON
- ✅ Compare multiple VPNs side-by-side

Want any of these? Let me know! 🚀

---

## 🐛 Troubleshooting

**"No active connections detected"**
- Make sure an AI tool is actually running
- Check that the tool is making network requests
- Verify WSL networking is working: `wsl ping google.com`

**"PING failed"**
- Some IPs may block ICMP (ping) packets
- The API handles this gracefully and reports 100% packet loss

**"Session not found"**
- Ensure you have an active session
- Check session IDs with: `curl http://localhost:3000/api/sessions`

---

## 📝 Example Output

```
🔍 Network Monitoring Test

1. Fetching active sessions...
✅ Found 1 session(s):
   - Session ID: xyz789 (Project: my-project)

2. Getting network info for session: xyz789...

📊 Network Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session ID: xyz789
Timestamp: 2025-12-06T14:25:00.000Z
Active Connections: 2

🤖 Detected AI Tools:
   ✓ aider

🔗 Active Connections:
   1. 13.107.42.14:443 (ESTAB)
   2. 142.250.185.10:443 (ESTAB)

🏓 Ping Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Target: 13.107.42.14
   Hostname: api.openai.com
   Service: OpenAI API
   ✅ Status: SUCCESS
   📈 Latency:
      - Min: 42.3ms
      - Avg: 48.7ms
      - Max: 55.2ms
   📦 Packet Loss: 0%

2. Target: 142.250.185.10
   Hostname: generativelanguage.googleapis.com
   Service: Google Gemini API
   ✅ Status: SUCCESS
   📈 Latency:
      - Min: 15.1ms
      - Avg: 18.9ms
      - Max: 23.4ms
   📦 Packet Loss: 0%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:
   Total Targets: 2
   Successful Pings: 2
   Average Latency: 33.80ms

✅ Test complete!
```
