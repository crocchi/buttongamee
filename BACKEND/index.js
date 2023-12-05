
//LIBRARY 
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require("socket.io");
const cors = require('cors');
const router = require('./routers')


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

        // STARTTING THE SERVER
        this.server.listen(PORT);
        console.log(`Server is listening on port ${PORT}`);


    }
    

    
}

//EXPRESS CONF


// index page
app.get('/', function (req, res) {
    res.render('pages/index', {
     // msg: req.rawHeaders
    });
  });






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