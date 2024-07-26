const WebSocket = require('ws');

async function connectToSolana() {
    const uri = "ws://xolana.xen.network:8900";

    const ws = new WebSocket(uri);
    const seenNumbers = new Set();

    ws.on('open', () => {
        console.log("WebSocket connection established");

        // Constructing the subscription request
        const subscribeMessage = JSON.stringify({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "logsSubscribe",
            "params": [
                {
                    "mentions": ["B4FMCpibTGdZhxHHNgWWnwk5PhhKdST37uFRY6TVksaj"]
                },
                {
                    "commitment": "finalized"
                }
            ]
        });

        // Send the subscription request
        ws.send(subscribeMessage);
        console.log("WebSocket handshake and message sent successfully");
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.method === "logsNotification" && message.params.result.value.logs) {
            const logs = message.params.result.value.logs;
            logs.forEach(log => {
                if (log.includes("PrimeFound")) {
                    const numberMatch = log.match(/number_to_test=(\d+)/);
                    if (numberMatch) {
                        const numberToTest = numberMatch[1];
                        if (!seenNumbers.has(numberToTest)) {
                            seenNumbers.add(numberToTest);
                            const coloredLog = log.replace(/(\d+)/g, '\x1b[33m$1\x1b[0m');
                            console.log(`PrimeFound event: ${coloredLog}`);
                        }
                    }
                }
            });
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error}`);
    });

    ws.on('close', () => {
        console.log("WebSocket connection closed");
    });
}

// Run the connection function
connectToSolana().catch(console.error);

