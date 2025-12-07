#!/usr/bin/env node

// Quick Ping Test Utility
// Usage: node ping-test.js [sessionId]

const API_BASE = 'http://localhost:3000';

async function quickPingTest(sessionId) {
    try {
        // If no session ID provided, get the first active session
        if (!sessionId) {
            const sessionsResponse = await fetch(`${API_BASE}/api/sessions`);
            const sessions = await sessionsResponse.json();

            if (sessions.length === 0) {
                console.error('❌ No active sessions found.');
                console.log('💡 Tip: Create a session in Better CLI first, then run an AI tool.');
                process.exit(1);
            }

            sessionId = sessions[0].id;
            console.log(`📍 Using session: ${sessionId}\n`);
        }

        // Get network info
        const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/network-info`);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Quick summary output
        console.log('🌐 Network Status');
        console.log('═'.repeat(50));

        if (data.detectedTools.length > 0) {
            console.log(`🤖 Running: ${data.detectedTools.join(', ')}`);
        }

        console.log(`🔗 Active Connections: ${data.activeConnections}`);
        console.log();

        if (data.pingResults.length === 0) {
            console.log('ℹ️  No external connections detected.');
            console.log('   Run an AI coding tool to see latency metrics.');
            return;
        }

        // Show ping results in compact format
        console.log('📊 Latency Results:');
        console.log('─'.repeat(50));

        data.pingResults.forEach(ping => {
            const statusIcon = ping.success ? '✅' : '❌';
            const latency = ping.success ? `${ping.avg}ms` : 'FAILED';
            const service = ping.service !== 'Unknown' ? ping.service : ping.hostname;

            console.log(`${statusIcon} ${service}`);
            console.log(`   IP: ${ping.ip}  |  Latency: ${latency}  |  Loss: ${ping.packetLoss}%`);
        });

        console.log('─'.repeat(50));

        if (data.summary.avgLatency) {
            const avgLatency = parseFloat(data.summary.avgLatency);
            let rating = '⚠️  Poor';
            if (avgLatency < 50) rating = '🚀 Excellent';
            else if (avgLatency < 100) rating = '✅ Good';
            else if (avgLatency < 200) rating = '⚡ Acceptable';

            console.log(`\n📈 Average Latency: ${data.summary.avgLatency}ms (${rating})`);
        }

        console.log(`✅ Successful: ${data.summary.successfulPings}/${data.summary.totalTargets}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Parse command line args
const sessionId = process.argv[2];
quickPingTest(sessionId);
