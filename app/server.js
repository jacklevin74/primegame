const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Data storage for users and points
let leaderboard = [];
let stakingTreasuryBalance = 0; // To store the staking treasury balance

// Function to update leaderboard
function updateLeaderboard(user, points) {
    // Remove the user if they are already in the leaderboard
    leaderboard = leaderboard.filter(entry => entry.user !== user);
    
    // Add the user back with updated points
    leaderboard.push({ user, points });

    // Sort the leaderboard by points in descending order
    leaderboard.sort((a, b) => b.points - a.points);

    // Keep only the top 100 users
    leaderboard = leaderboard.slice(0, 100);
}

// Connect to Solana and listen for Leaderboard events
async function connectToSolana() {
    const uri = "ws://xolana.xen.network:8900";
    const ws = new WebSocket(uri);

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
                if (log.includes("Leaderboard:")) {
                    const userMatch = log.match(/User:\s([A-Za-z0-9]+),/);
                    const pointsMatch = log.match(/Points:\s(\d+)/);

                    if (userMatch && pointsMatch) {
                        const user = userMatch[1];
                        const points = parseInt(pointsMatch[1], 10);

                        updateLeaderboard(user, points);
                        io.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance }); // Emit updated leaderboard to clients
                    }
                } else if (log.includes("Staking Treasury Balance:")) {
                    const balanceMatch = log.match(/Staking Treasury Balance:\s(\d+)\s/);
                    if (balanceMatch) {
                        stakingTreasuryBalance = parseInt(balanceMatch[1], 10);
                        io.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance }); // Emit updated leaderboard with balance to clients
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

// Express setup
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static('public'));

// Serve the dashboard HTML page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance }); // Send the initial leaderboard to the client
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server on specific IP and port
const host = '216.202.227.220';
const port = 3333;
server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
    connectToSolana().catch(console.error); // Connect to Solana when the server starts
});

