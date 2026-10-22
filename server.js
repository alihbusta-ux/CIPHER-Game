const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); 

if (!fs.existsSync('./data')) fs.mkdirSync('./data');

let activeSession = null;

io.on('connection', (socket) => {
    socket.on('create-game', () => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        activeSession = { pin: pin, players: [], isStarted: false };
        socket.join(pin);
        socket.emit('game-created', pin);
    });

    socket.on('join-game', (studentData) => {
        if (!activeSession) return socket.emit('join-error', 'No active game found.');
        if (studentData.pin !== activeSession.pin) return socket.emit('join-error', 'Invalid PIN.');

        activeSession.players.push(studentData);
        socket.join(activeSession.pin);
        io.to(activeSession.pin).emit('player-joined', activeSession.players);
        socket.emit('join-success', activeSession.isStarted);
    });

    socket.on('start-game', () => {
        if (activeSession) {
            activeSession.isStarted = true;
            io.to(activeSession.pin).emit('game-started');
            fs.writeFileSync(path.join(__dirname, 'data', `roster_${activeSession.pin}.json`), JSON.stringify(activeSession.players, null, 2));
        }
    });

    socket.on('update-score', ({ id, xp }) => {
        if (activeSession) {
            const player = activeSession.players.find(p => p.id === id);
            if (player) {
                player.xp = xp;
                io.to(activeSession.pin).emit('leaderboard-update', activeSession.players);
                fs.writeFileSync(path.join(__dirname, 'data', `roster_${activeSession.pin}.json`), JSON.stringify(activeSession.players, null, 2));
            }
        }
    });
});

server.listen(3000, () => { console.log('CIPHER Server running on http://localhost:3000'); });