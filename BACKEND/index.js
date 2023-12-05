
//LIBRARY 
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require("socket.io");
const cors = require('cors');

//EXPRESS CONF
let app = express();

//CONF bodyparser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//CONF CORS   //PUBLIC DEV
app.use(cors({
    origin: '*'
}));

// set the view engine to ejs
app.set('view engine', 'ejs');

// index page
app.get('/', function (req, res) {
    res.render('pages/index', {
     // msg: req.rawHeaders
    });
  });


const server = http.createServer(app);
const io = new Server(server);
//SERVER CONF PORT
const PORT = 8000
// STARTTING THE SERVER
server.listen(PORT);
console.log(`Server is listening on port ${PORT}`);


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