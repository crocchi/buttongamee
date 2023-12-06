
//LIBRARY 
const express = require('express');
const session = require('express-session');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require("socket.io");
const cors = require('cors');
const router = require('./routers');
//DATABASE
const db = require('./db/db');
const ChatMsg = require('./db/chat-model')

const sessionMiddleware = session({
    secret: "scrocchi",
    resave: true,
    saveUninitialized: true,
  });

class Main{
    app = express();
    
    PORT=8000;

    constructor(port){

        this.PORT = port || this.PORT;

        //CONF bodyparser
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());

        //CONF CORS
        //PUBLIC DEV   ['https://www.section.io', 'https://www.google.com/']
        this.app.use(cors({origin: ['https://*.onrender.com'] } )) ;

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

        let { userLogout,userLogin,userChat } = require("./event/socketEventHandlers")(this.io,this);
        this.userSign = require("./event/account");
        //DOWNLOAD CHAT HISTORY FROM DB
        this.chatTemp = ChatMsg.find({});
        //SOCKET.IO EVENT HANDLER
        this.onConnection = (socket) => {

            //IMPOSTA NOME USER E SESSION
            this.userSign(socket);
            console.log(socket.handshake.auth)
            //console.log(this.chatTemp);
            
            console.log(`${socket.data.username} join - SESSION ID: ${socket.request.session.id} `)
            userLogin(socket);

            socket.on("disconnect", userLogout);
            socket.on("chat message", userChat);
            //socket.on("order:read", readOrder);
            //socket.on("user:update-password", updatePassword);
          }

        this.io.on("connection", this.onConnection);
        
        /*
        this.io.on('connection', async (socket) => {    

            

            socket.on('disconnect', () => {
                logger.info(`${user} disconnected!`);
                this.io.emit('chat message', { 
                    msg:`${user} left the party`, 
                    username: user, 
                    isSystemMessage:true, 
                    timestamp: null
                });
            });

        })*/
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



/*
//DATABASE MONGODB CLOUD
//DB.JS COLLEGAMENTO AL DB MONGO CLOUD

// SE CE QLC PROBLEMA A COLLEGARSI AL DB VISUALIZZA ERRORE 


// use res.render to load up an ejs view file



// index page
app.get('/game', function (req, res) {

  // console.log(req.rawHeaders);
  res.render('pages/game', {
    msg: req.rawHeaders
  });
});



module.exports = new App();

*/
const server=new Main();