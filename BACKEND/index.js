
//LIBRARY
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const router = require('./routers');
//DATABASE
const { initDb } = require('./db/db');

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET deve essere configurato in produzione');
}

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 24 * 60 * 60 * 1000,
    },
  });

class Main{
    app = express();
    PORT = process.env.PORT || 8000;

    constructor(port){

        this.PORT = port || this.PORT;

        //CONF bodyparser
        this.app.use(express.urlencoded({ extended: true, limit: '32kb' }));
        this.app.use(express.json({ limit: '32kb' }));

        if (isProduction) this.app.set('trust proxy', 1);
        this.app.disable('x-powered-by');

        //CONF CORS
        this.app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*' }));

        //CONF  EJS TEMPLATE ENGINE
        this.app.set('view engine', 'ejs');

        //CONF EXPRESS SESSION
        this.app.use(sessionMiddleware);


        //ROUTERS 
        this.app.use('/', router)

        //START HTTP SERVER
        this.server = http.createServer(this.app);
        const allowedOrigins = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
            : '*';
        this.io = new Server(this.server, { cors: { origin: allowedOrigins } });
        //share SESSION-EXPRESS IN SOCKET.IO ENGINE
        this.io.engine.use(sessionMiddleware);

        const userSign = require("./event/account");
        const {
            gameStart, gameOnline1vs1, gameClick, gameOver, gameDisconnectCleanup,
            statsRequest, setScoreNickname,
            match3Move,
            sudokuStart, sudokuInput,
            pairStart, pairOnline1vs1,
            escapeStart, escapeOnline1vs1, escapeAnswer,
            adventureRequest, adventureStart,
        } = require("./event/game")(this.io, this);

        //SOCKET.IO EVENT HANDLER
        this.onConnection = (socket) => {

            //IMPOSTA NOME USER E SESSION
            userSign(socket);

            console.log(`${socket.data.username} join`)

            socket.on("disconnect", gameDisconnectCleanup);
            socket.on("game start", gameStart);
            socket.on("gameOnline 1vs1", gameOnline1vs1);
            socket.on("game click", gameClick);
            socket.on("game over", gameOver); // compatibilità: il server ignora punteggi client
            socket.on("stats request", statsRequest);
            socket.on("set score nickname", setScoreNickname);
            socket.on("match3 move", match3Move);
            socket.on("sudoku start", sudokuStart);
            socket.on("sudoku input", sudokuInput);
            socket.on("pairs start", pairStart);
            socket.on("pairsOnline 1vs1", pairOnline1vs1);
            socket.on("escape start", escapeStart);
            socket.on("escapeOnline 1vs1", escapeOnline1vs1);
            socket.on("escape answer", escapeAnswer);
            socket.on("adventure request", adventureRequest);
            socket.on("adventure start", adventureStart);
          }

        this.io.on("connection", this.onConnection);

        // Il servizio accetta traffico soltanto quando lo schema DB è pronto.
        this.ready = initDb().then(() => new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(this.PORT, () => {
                this.server.removeListener('error', reject);
                console.log(`Server is listening on port ${this.PORT}`);
                resolve();
            });
        }));
    }  

    close() {
        this.server.close()
        this.io.close()
    }
    getTime () {
        this.timeNow= new Date().toLocaleTimeString();
        return this.timeNow
    }
}

const server=new Main();
module.exports = server;
