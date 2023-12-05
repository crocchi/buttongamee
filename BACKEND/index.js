
//LIBRARY 
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require("socket.io");
const cors = require('cors');
const router = require('./routers');
const { userLogout,userLogin } = require(".-/event/socketEventHandlers");


class Main{
    app = express();
    
    PORT=8000;

    constructor(port){

        this.PORT = port || this.PORT;

        //CONF bodyparser
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());

        //CONF CORS
        //PUBLIC DEV 
        this.app.use(cors({origin: '*'}));

        //CONF  EJS TEMPLATE ENGINE
        this.app.set('view engine', 'ejs');

        //ROUTERS 
        this.app.use('/', router)

        //START HTTP SERVER
        this.server = http.createServer(app);
        this.io = new Server(server);

        // STARTING THE SERVER
        this.server.listen(PORT);
        console.log(`Server is listening on port ${PORT}`);

        //SOCKET.IO EVENT HANDLER
        this.onConnection = (socket) => {

            socket.data.username = (socket.id).slice(1, 6);
            const user = socket.data.username

            userLogin(socket.data.username);

            socket.on("disconnect", userLogout);
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
}



/*
//DATABASE MONGODB CLOUD
//DB.JS COLLEGAMENTO AL DB MONGO CLOUD
const db = require('./db/db.js');
// SE CE QLC PROBLEMA A COLLEGARSI AL DB VISUALIZZA ERRORE 
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const ChatMsg = require('./db/chat-model')
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