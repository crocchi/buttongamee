
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

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "scrocchi",
    resave: true,
    saveUninitialized: true,
  });

class Main{
    app = express();
    PORT = process.env.PORT || 8000;

    constructor(port){

        this.PORT = port || this.PORT;

        //CONF bodyparser
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());

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
        this.io = new Server(this.server);
        //share SESSION-EXPRESS IN SOCKET.IO ENGINE
        this.io.engine.use(sessionMiddleware);

        // STARTING THE SERVER
        this.server.listen(this.PORT);
        console.log(`Server is listening on port ${this.PORT}`);

        //DATABASE MYSQL - crea le tabelle se non esistono
        initDb().catch(e => console.error('Errore inizializzazione DB:', e.message));

        const userSign = require("./event/account");
        const { gameStart, gameOnline1vs1, gameOver, gameDisconnectCleanup, statsRequest } = require("./event/game")(this.io, this);

        //SOCKET.IO EVENT HANDLER
        this.onConnection = (socket) => {

            //IMPOSTA NOME USER E SESSION
            userSign(socket);

            console.log(`${socket.data.username} join - SESSION ID: ${socket.request.session.id} `)

            socket.on("disconnect", gameDisconnectCleanup);
            socket.on("game start", gameStart);
            socket.on("gameOnline 1vs1", gameOnline1vs1);
            socket.on("game over", gameOver);
            socket.on("stats request", statsRequest);
          }

        this.io.on("connection", this.onConnection);
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
