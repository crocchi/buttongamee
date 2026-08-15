const { saveScore, getTopScores } = require('../db/scoreModel');

// giocatori in attesa di un avversario per la modalità 1vs1
const waitingQueue = [];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// genera coppie di numeri uguali (es. num=20 -> 10 coppie, 20 bottoni)
// se ci sono abbastanza coppie, due di esse diventano i bonus speciali del gioco originale:
// 'point' (Atom the Point: punti extra) e 'bomb' (Atom the Bomb: distrugge un'altra coppia a caso)
function generatePuzzle(numButtons) {
    const pairs = Math.max(2, Math.floor((numButtons || 20) / 2));
    const values = [];
    for (let v = 1; v <= pairs; v++) {
        values.push(v, v);
    }
    if (pairs >= 4) {
        values[0] = 'point'; values[1] = 'point';
        values[2] = 'bomb'; values[3] = 'bomb';
    }
    return shuffle(values);
}

module.exports = (io, main) => {

    const gameStart = function (liv, num) {
        const socket = this;
        const puzzle = generatePuzzle(num);
        socket.data.game = { mode: 'campain', puzzle, liv, startTime: Date.now() };
        io.to(socket.id).emit('gameSet', { mode: 'campain', puzzle, liv });
    };

    const gameOnline1vs1 = function (action) {
        const socket = this;
        if (action !== 'join') return;

        const opponent = waitingQueue.shift();
        if (!opponent || !opponent.connected) {
            waitingQueue.push(socket);
            io.to(socket.id).emit('gameSet', { mode: '1vs1-wait', data: 'In attesa di un avversario...' });
            return;
        }

        const roomId = `room-${opponent.id}-${socket.id}`;
        socket.join(roomId);
        opponent.join(roomId);

        // stesso identico puzzle per entrambi i giocatori: vince chi lo completa prima
        const puzzle = generatePuzzle(20);
        const gameState = { mode: '1vs1', puzzle, startTime: Date.now(), roomId, decided: false };
        socket.data.game = gameState;
        opponent.data.game = gameState;

        io.to(roomId).emit('gameSet', { mode: '1vs1', puzzle, roomId });
    };

    const gameOver = async function (payload) {
        const socket = this;
        const game = socket.data.game;
        if (!game) return;

        const elapsedMs = Date.now() - game.startTime;
        const score = Math.max(0, Number(payload && payload.score) || 0);

        try {
            await saveScore({ nickname: socket.data.username, mode: game.mode, score, elapsedMs });
        } catch (e) {
            console.error('Errore salvataggio punteggio:', e.message);
        }

        if (game.mode === '1vs1' && game.roomId) {
            if (!game.decided) {
                game.decided = true;
                io.to(socket.id).emit('gameResult', { result: 'win' });
                socket.to(game.roomId).emit('gameResult', { result: 'lose' });
            }
            socket.leave(game.roomId);
        } else {
            const topScores = await getTopScores();
            io.to(socket.id).emit('gameOverAck', { score, elapsedMs, topScores });
        }

        socket.data.game = null;
    };

    const gameDisconnectCleanup = function () {
        const socket = this;
        const idx = waitingQueue.indexOf(socket);
        if (idx !== -1) waitingQueue.splice(idx, 1);

        const game = socket.data.game;
        if (game && game.mode === '1vs1' && game.roomId && !game.decided) {
            game.decided = true;
            socket.to(game.roomId).emit('gameResult', { result: 'win', reason: 'opponent-disconnected' });
        }
    };

    const statsRequest = async function () {
        const socket = this;
        try {
            const topScores = await getTopScores();
            io.to(socket.id).emit('statsData', topScores);
        } catch (e) {
            console.error('Errore lettura classifica:', e.message);
        }
    };

    return { gameStart, gameOnline1vs1, gameOver, gameDisconnectCleanup, statsRequest };
};
