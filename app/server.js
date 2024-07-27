const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Data storage for users and points
let leaderboard = [];
let stakingTreasuryBalance = 0; // To store the staking treasury balance
let yieldPoolBalance = 0; // To store the yield pool balance
let history = []; // To store the winner history

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

// Function to update history and ensure unique entries
function updateHistory(user, sol, powerUp) {
    // Remove the user if they are already in the history
    history = history.filter(entry => entry.user !== user);

    // Add the new entry
    history.unshift({ user, sol, powerUp });

    // Keep only the last 3 unique entries
    history = history.slice(0, 10);
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
                        io.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance, yieldPoolBalance, history }); // Emit updated leaderboard to clients
                        console.log(`Leaderboard: User: ${user}, Points: ${points}`);
                    }
                } else if (log.includes("Treasury balance:")) {
                    const balanceMatch = log.match(/Treasury balance:\s(\d+)/);
                    if (balanceMatch) {
                        stakingTreasuryBalance = parseInt(balanceMatch[1], 10);
                        io.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance, yieldPoolBalance, history }); // Emit updated leaderboard with balance to clients
                        console.log(`Treasury balance: ${(stakingTreasuryBalance / 1000000000).toFixed(2)} SOL`);
                    }
                } else if (log.includes("Buy Points: Yield Pool")) {
                    const yieldPoolMatch = log.match(/Buy Points: Yield Pool (\d+)/);
                    if (yieldPoolMatch) {
                        yieldPoolBalance = parseInt(yieldPoolMatch[1], 10);
                        io.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance, yieldPoolBalance, history }); // Emit updated leaderboard with yield pool balance to clients
                        console.log(`Yield Pool balance: ${(yieldPoolBalance / 1000000000).toFixed(2)} SOL`);
                    }
                } else if (log.includes("Winner:")) {
                    const winnerMatch = log.match(/Winner: User:\s([A-Za-z0-9]+)\sLamports:\s(\d+)\sPower-up:\s([\d\.]+)/);
                    if (winnerMatch) {
                        const user = winnerMatch[1];
                        const lamports = parseInt(winnerMatch[2], 10);
                        const sol = (lamports / 1000000000).toFixed(2); // Convert lamports to SOL and format to two decimal places
                        const powerUp = parseFloat(winnerMatch[3]);
                        updateHistory(user, sol, powerUp);
                        io.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance, yieldPoolBalance, history }); // Emit updated leaderboard with history to clients
                        console.log(`Winner: User: ${user}, SOL: ${sol}, Power-up: ${powerUp}`);
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
    socket.emit('updateLeaderboard', { leaderboard, stakingTreasuryBalance, yieldPoolBalance, history }); // Send the initial leaderboard to the client
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

