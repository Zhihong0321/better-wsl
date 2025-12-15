# 📌 Network Monitoring - Quick Reference

## 🚀 Quick Commands

### Test Current Session
```bash
cd server
node ping-test.js
```

### Detailed Analysis
```bash
cd server
node test-network-monitor.js
```

### Direct API Call
```bash
# List all sessions
curl http://localhost:3000/api/sessions

# Get network info for specific session
curl http://localhost:3000/api/sessions/{SESSION_ID}/network-info
```

---

## 📊 Reading the Results

### Latency Guide
| Range | Icon | Rating | Experience |
|-------|------|--------|------------|
| < 50ms | 🚀 | Excellent | Instant, perfect |
| 50-100ms | ✅ | Good | Smooth |
| 100-200ms | ⚡ | Acceptable | Slight delay |
| > 200ms | ⚠️ | Poor | Frustrating |

### Packet Loss Guide
| Loss % | Status | Impact |
|--------|--------|--------|
| 0% | Perfect | No issues |
| 1-5% | Minor | Barely noticeable |
| 5-10% | Moderate | Some timeouts |
| > 10% | Severe | Frequent failures |

---

## 🔧 VPN Testing Workflow

### 1️⃣ Baseline Test (No VPN)
```bash
# Start AI tool in Better WSL
aider

# In another terminal
cd better-cli/server
node ping-test.js

# Record results
# Example: Avg: 45ms ✅
```

### 2️⃣ VPN Test
```bash
# Connect to VPN
# Then run test again
node ping-test.js

# Record results
# Example: Avg: 180ms ⚠️
```

### 3️⃣ Compare
```
No VPN:   45ms  🚀 (Faster)
VPN A:    180ms ⚠️ (Slower)
VPN B:    65ms  ✅ (Better!)
```

**Decision**: Use VPN B or no VPN for best AI coding experience!

---

## 🎯 Typical Results

### Good Connection
```
📈 Average Latency: 48.70ms (🚀 Excellent)
📦 Packet Loss: 0%
✅ All APIs responding
```

### VPN Impact (Negative)
```
📈 Average Latency: 215.30ms (⚠️ Poor)
📦 Packet Loss: 3%
⚠️ Slower than baseline
```

### VPN Impact (Positive)
```
📈 Average Latency: 35.20ms (🚀 Excellent)
📦 Packet Loss: 0%
✅ Faster than baseline!
```

---

## 🤖 Detected AI Tools

When these are running, they'll be detected:
- `aider` → Anthropic/OpenAI
- `codex` → OpenAI
- `cursor` → OpenAI
- `copilot` → GitHub
- `claude` → Anthropic
- `gemini` → Google
- `cline` → Anthropic
- `gpt` → OpenAI

---

## 🌐 Common API Endpoints

You might see connections to:

| Service | Hostname | Typical Latency |
|---------|----------|----------------|
| OpenAI | api.openai.com | 30-80ms |
| Anthropic | api.anthropic.com | 40-100ms |
| Google Gemini | generativelanguage.googleapis.com | 20-60ms |
| GitHub Copilot | copilot-proxy.githubusercontent.com | 30-90ms |

*Note: Latency varies by location and network*

---

## 🐛 Quick Troubleshooting

### No connections detected
- ✅ Start an AI tool first (e.g., `aider`)
- ✅ Make sure it's actively making API calls
- ✅ Check WSL networking: `wsl ping google.com`

### All pings fail
- ✅ Check internet: `wsl ping 8.8.8.8`
- ✅ Some IPs block ICMP (expected)
- ✅ Check firewall settings

### Session not found
- ✅ Create a session in Better WSL UI
- ✅ Run: `curl http://localhost:3000/api/sessions`
- ✅ Use correct session ID

---

## 💡 Pro Tips

### Get Best Results
1. **Run AI tool for 30+ seconds** before testing
2. **Test multiple times** for consistency
3. **Test at different times** (network congestion varies)
4. **Compare multiple VPN servers** in same region

### Optimization
- Use VPN server closest to AI API location
- Choose VPN with lowest latency
- Avoid peak hours if possible
- Consider direct connection if VPN slows you down

### When to Worry
- ⚠️ Latency > 200ms consistently
- ⚠️ Packet loss > 5%
- ⚠️ Large variance (jitter > 100ms)
- ⚠️ Frequent timeout errors

---

## 📁 File Locations

```
better-cli/
├── server/
│   ├── index.js                    # Server with API endpoint
│   ├── ping-test.js               # Quick test utility ⭐
│   └── test-network-monitor.js    # Detailed test ⭐
├── NETWORK_MONITORING.md          # Full documentation
├── NETWORK_ARCHITECTURE.md        # Technical details
└── README.md                      # Main readme
```

---

## 🔗 API Response Fields

```javascript
{
  sessionId: "abc1234",           // Session identifier
  timestamp: "2025-12-06T...",    // When measured
  activeConnections: 2,            // Number of connections
  
  connections: [{                  // Connection details
    remoteIp: "13.107.42.14",
    remotePort: "443",
    state: "ESTAB"
  }],
  
  detectedTools: ["aider"],        // Running AI tools
  
  pingResults: [{                  // Latency data
    ip: "13.107.42.14",
    hostname: "api.openai.com",
    service: "OpenAI API",
    success: true,
    min: 42.3,                     // ms
    avg: 48.7,                     // ms ⭐ Most important
    max: 55.2,                     // ms
    packetLoss: 0                  // %
  }],
  
  summary: {                       // Aggregated stats
    totalTargets: 2,
    avgLatency: "48.70",           // Overall average
    successfulPings: 2
  }
}
```

---

## 🎓 Understanding Metrics

### What is Latency?
Round-trip time for a packet to reach the server and come back.

**Low latency = Fast response**
```
Your PC → Internet → AI Server → Process → Back to You
  [-------- This entire journey time is "latency" --------]
```

### What is Packet Loss?
Percentage of packets that never returned.

**0% = Perfect, >5% = Problem**
```
Send 4 packets:
✅ ✅ ❌ ✅ = 25% loss (1 of 4 lost)
```

### Why Does VPN Affect This?
VPN adds an extra hop:
```
No VPN:  You → ISP → AI Server
With VPN: You → ISP → VPN Server → AI Server → Back
          [--- Extra distance = Extra time! ---]
```

Good VPN might route more efficiently (paradoxically faster!)

---

## 📞 Support

**Found an issue?** Check these docs:
- [NETWORK_MONITORING.md](./NETWORK_MONITORING.md) - Full guide
- [NETWORK_ARCHITECTURE.md](./NETWORK_ARCHITECTURE.md) - Technical deep dive
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Feature overview

**Want more features?** See "Future Enhancements" in README.md

---

**Happy monitoring! 🚀**
