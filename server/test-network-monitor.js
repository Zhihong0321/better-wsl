// Network Monitoring Test Script
// This demonstrates how to use the /api/sessions/:id/network-info endpoint

const API_BASE = 'http://localhost:3000';

async function testNetworkMonitoring() {
    console.log('🔍 Network Monitoring Test\n');

    // Step 1: Get all sessions
    console.log('1. Fetching active sessions...');
    const sessionsResponse = await fetch(`${API_BASE}/api/sessions`);
    const sessions = await sessionsResponse.json();

    if (sessions.length === 0) {
        console.log('❌ No active sessions found. Please create a session first.');
        return;
    }

    console.log(`✅ Found ${sessions.length} session(s):\n`);
    sessions.forEach(s => {
        console.log(`   - Session ID: ${s.id} (Project: ${s.project || 'workspace'})`);
    });

    // Step 2: Get network info for the first session
    const sessionId = sessions[0].id;
    console.log(`\n2. Getting network info for session: ${sessionId}...\n`);

    const networkResponse = await fetch(`${API_BASE}/api/sessions/${sessionId}/network-info`);
    const networkInfo = await networkResponse.json();

    // Display results
    console.log('📊 Network Information:');
    console.log('━'.repeat(60));
    console.log(`Session ID: ${networkInfo.sessionId}`);
    console.log(`Timestamp: ${networkInfo.timestamp}`);
    console.log(`Active Connections: ${networkInfo.activeConnections}`);
    console.log();

    // Show detected AI tools
    if (networkInfo.detectedTools.length > 0) {
        console.log('🤖 Detected AI Tools:');
        networkInfo.detectedTools.forEach(tool => {
            console.log(`   ✓ ${tool}`);
        });
        console.log();
    }

    // Show active connections
    if (networkInfo.connections.length > 0) {
        console.log('🔗 Active Connections:');
        networkInfo.connections.forEach((conn, idx) => {
            console.log(`   ${idx + 1}. ${conn.remoteIp}:${conn.remotePort} (${conn.state})`);
        });
        console.log();
    }

    // Show ping results
    if (networkInfo.pingResults.length > 0) {
        console.log('🏓 Ping Results:');
        console.log('━'.repeat(60));

        networkInfo.pingResults.forEach((ping, idx) => {
            console.log(`\n${idx + 1}. Target: ${ping.ip}`);
            console.log(`   Hostname: ${ping.hostname}`);
            console.log(`   Service: ${ping.service}`);

            if (ping.success) {
                console.log(`   ✅ Status: SUCCESS`);
                console.log(`   📈 Latency:`);
                console.log(`      - Min: ${ping.min}ms`);
                console.log(`      - Avg: ${ping.avg}ms`);
                console.log(`      - Max: ${ping.max}ms`);
                console.log(`   📦 Packet Loss: ${ping.packetLoss}%`);
            } else {
                console.log(`   ❌ Status: FAILED`);
                console.log(`   📦 Packet Loss: ${ping.packetLoss}%`);
                if (ping.error) {
                    console.log(`   Error: ${ping.error}`);
                }
            }
        });

        console.log('\n' + '━'.repeat(60));
        console.log('📊 Summary:');
        console.log(`   Total Targets: ${networkInfo.summary.totalTargets}`);
        console.log(`   Successful Pings: ${networkInfo.summary.successfulPings}`);
        if (networkInfo.summary.avgLatency) {
            console.log(`   Average Latency: ${networkInfo.summary.avgLatency}ms`);
        }
    } else {
        console.log('ℹ️  No external connections detected.');
        console.log('   → Try running an AI coding tool (codex, aider, etc.) first!');
    }

    console.log('\n✅ Test complete!');
}

// Run the test
testNetworkMonitoring().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
