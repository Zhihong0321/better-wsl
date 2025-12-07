# Network Monitoring Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Better CLI - Frontend                        │
│                          (http://localhost:5173)                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ HTTP Request
                                │ GET /api/sessions/:id/network-info
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Express Server (Port 3000)                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Network Monitoring Endpoint Handler                          │  │
│  └─────────────────┬───────────────────────────────────────────┬─┘  │
│                    │                                           │    │
│                    ▼                                           ▼    │
│  ┌─────────────────────────────┐          ┌─────────────────────┐  │
│  │   Connection Detection      │          │  Process Detection   │  │
│  │   execWsl("ss -tanp")       │          │  execWsl("ps aux")  │  │
│  └──────────────┬──────────────┘          └─────────┬───────────┘  │
└─────────────────┼──────────────────────────────────┼───────────────┘
                  │                                   │
                  │ Execute in WSL                    │ Execute in WSL
                  ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WSL2 Linux Environment                          │
│  ┌───────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  ss -tanp         │  │  ps aux         │  │  AI Tools        │  │
│  │  (List TCP)       │  │  (List procs)   │  │  - aider         │  │
│  │  ┌──────────────┐ │  │  ┌────────────┐ │  │  - codex         │  │
│  │  │ ESTAB        │ │  │  │ aider      │ │  │  - cursor        │  │
│  │  │ 192.168.1.10 │ │  │  │ node       │ │  │  - copilot       │  │
│  │  │ → 13.107.42  │ │  │  │ python     │ │  │                  │  │
│  │  └──────────────┘ │  │  └────────────┘ │  │  ┌─────────────┐ │  │
│  └────────┬──────────┘  └─────────────────┘  │  │ Connect to  │ │  │
│           │                                   │  │ AI APIs     │ │  │
│           ▼                                   │  └─────────────┘ │  │
│  ┌─────────────────────────────────────────┐ │      │           │  │
│  │  Extract Unique IPs:                    │ │      │           │  │
│  │  - 13.107.42.14                         │ │      └───────────┼──┘
│  │  - 142.250.185.10                       │ │                  │
│  └──────────────┬──────────────────────────┘ │                  │
│                 │                             │                  │
│                 ▼                             │                  │
│  ┌──────────────────────────────────────────┐│                  │
│  │  Reverse DNS Lookup                      ││                  │
│  │  host 13.107.42.14                       ││                  │
│  │  → api.openai.com                        ││                  │
│  └──────────────┬───────────────────────────┘│                  │
│                 │                             │                  │
│                 ▼                             │                  │
│  ┌──────────────────────────────────────────┐│                  │
│  │  Ping Test (4 packets)                   ││                  │
│  │  ping -c 4 13.107.42.14                  ││                  │
│  │  ┌─────────────────────────────────────┐ ││                  │
│  │  │ Packet 1: 45ms  ▶─────────▷ ◀───────│ ││◀─────────────────┘
│  │  │ Packet 2: 48ms  ▶─────────▷ ◀───────│ ││   (Internet)
│  │  │ Packet 3: 52ms  ▶─────────▷ ◀───────│ ││
│  │  │ Packet 4: 46ms  ▶─────────▷ ◀───────│ ││
│  │  └─────────────────────────────────────┘ ││
│  │  Result: Avg 47.75ms, 0% loss            ││
│  └──────────────┬───────────────────────────┘│
└─────────────────┼──────────────────────────────────────────────────┘
                  │
                  │ Parse Results
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Aggregate Results                                 │
│  {                                                                   │
│    pingResults: [                                                    │
│      {                                                               │
│        ip: "13.107.42.14",                                          │
│        hostname: "api.openai.com",                                  │
│        service: "OpenAI API",                                       │
│        min: 45, avg: 47.75, max: 52,                               │
│        packetLoss: 0                                                │
│      }                                                               │
│    ],                                                                │
│    summary: {                                                        │
│      avgLatency: "47.75",                                           │
│      successfulPings: 1                                             │
│    }                                                                 │
│  }                                                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ JSON Response
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Displays                              │
│                                                                      │
│  ✅ OpenAI API                                                      │
│     IP: 13.107.42.14  |  Latency: 47.75ms  |  Loss: 0%            │
│                                                                      │
│  📈 Average Latency: 47.75ms (🚀 Excellent)                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Client Request** → Frontend calls API endpoint
2. **Server Processing** → Express handler receives request
3. **WSL Execution** → Server executes Linux commands in WSL
4. **Connection Detection** → `ss` lists active TCP connections
5. **Process Detection** → `ps` finds running AI tools
6. **IP Extraction** → Parse connection table for target IPs
7. **DNS Resolution** → Reverse lookup IP → hostname
8. **Service Mapping** → Match hostname to known AI APIs
9. **Latency Testing** → Ping each unique target (4 packets)
10. **Result Parsing** → Extract min/avg/max/loss from ping output
11. **Aggregation** → Combine all results into JSON
12. **Response** → Return to client
13. **Display** → Show metrics to user

## Command Pipeline

```bash
# Step 1: Detect active connections
ss -tanp 2>/dev/null | grep ESTAB
# Output: ESTAB 0 0 192.168.1.10:54321 13.107.42.14:443

# Step 2: Detect running processes
ps aux | grep -E "(codex|aider|cursor)" | grep -v grep
# Output: user 1234 ... python aider/main.py

# Step 3: Reverse DNS lookup
host 13.107.42.14 2>/dev/null | head -1
# Output: 14.42.107.13.in-addr.arpa domain name pointer api.openai.com.

# Step 4: Ping test
ping -c 4 -W 2 13.107.42.14 2>&1
# Output:
# PING 13.107.42.14 (13.107.42.14) 56(84) bytes of data.
# 64 bytes from 13.107.42.14: icmp_seq=1 ttl=54 time=45.2 ms
# ...
# rtt min/avg/max/mdev = 45.178/47.752/52.341/2.856 ms
```

## Network Monitoring Metrics

### Primary Metrics
- **Min Latency**: Best-case round-trip time
- **Avg Latency**: Average round-trip time (most important)
- **Max Latency**: Worst-case round-trip time
- **Packet Loss**: Percentage of packets that didn't return

### Derived Metrics
- **Jitter**: Variance in latency (max - min)
- **Success Rate**: Percentage of successful pings
- **Connection Count**: Number of active connections
- **Tool Count**: Number of detected AI tools

## AI API Detection

### Known Services
```javascript
{
  'api.openai.com': 'OpenAI API',
  'api.anthropic.com': 'Anthropic API',
  'generativelanguage.googleapis.com': 'Google Gemini API',
  'copilot-proxy.githubusercontent.com': 'GitHub Copilot',
  'github.com': 'GitHub',
  'aistudio.google.com': 'Google AI Studio'
}
```

### Detection Method
1. Extract hostname from reverse DNS
2. Match against known service domains
3. Label as "Unknown" if no match found

## Performance Characteristics

| Operation | Typical Duration | Notes |
|-----------|-----------------|-------|
| Connection listing | ~100ms | Fast, lightweight |
| Process detection | ~100ms | Fast, lightweight |
| Reverse DNS lookup | ~200ms per IP | Can be slow |
| Ping test | ~2000ms per target | 4 packets @ 500ms |
| **Total (1 target)** | ~2.4s | Acceptable for on-demand |
| **Total (3 targets)** | ~6.5s | Consider caching |

## Error Handling

### Network Issues
- **No internet**: Ping fails, reports 100% packet loss
- **ICMP blocked**: Graceful failure, shows error message
- **DNS failure**: Falls back to IP address only

### Command Failures
- **ss not found**: Error message, graceful degradation
- **Permission denied**: Handled by WSL execution wrapper
- **Timeout**: 2-second wait per ping, then fail

## Security Considerations

- ✅ Only monitors outbound connections (no inbound)
- ✅ Filters local/private IPs (127.x, 192.168.x)
- ✅ No sensitive data in responses
- ✅ Read-only operations (no system modification)
- ✅ WSL isolation protects Windows system
