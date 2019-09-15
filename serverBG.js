const http = require('http');
var url = require('url');
var fs = require("fs");
const net = require('net');
//var obj = require("./classifica.json");
//var socket = net.createConnection(2000, 'localhost');
const hostname = '192.168.1.30';
const port = 8080;


const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  //tct+=testoClassifica();
  var q = url.parse(req.url, true).query;
  //?giocatore=pollo&pnt=500;
  //var txt = q.giocatore + " " + q.pnt;
  if(q.giocatore){aggPlayer(q.giocatore,q.pnt);}
  //res.write("<h2>Hai richiesto "+req.url+"<br><br></h2>");
if(req.url==="/classifica"){testoClassifica();}
if(req.url==="/agg"){res.end(contents+ciao);}
  res.end(txt);
  tct="";
});

var io = require('socket.io').listen(server);
server.listen(port);
console.log("Server in ascolto su porta "+port);
// Quando i client si connettono, lo scriviamo nella console
io.sockets.on('connection', function (socket) {
  console.log('Nuovo visitatore connesso! : '+socket.id);
//console.log(socket);
});
/*
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
*/

///////////////////////////////////////
//////////   socket
////////////////////////////////////////
/*var option = {
        host:'localhost',
        port: 9999
    }

    // Create TCP client.
    var client = net.createConnection(option, function () {
        console.log('Connection name : ' + connName);
        console.log('Connection local address : ' + client.localAddress + ":" + client.localPort);
        console.log('Connection remote address : ' + client.remoteAddress + ":" + client.remotePort);
    });
*/

////////////////////////////////////////////////
//////////////////////////
////////////////////////




var txt = "";
var tct = "";
var classificaGame=[];
var x;
var coloreTR="#ddd";
var graficaTab="border-collapse:collapse;width:100%;";
var graficaTabth="padding-top:12px;padding-bottom:12px;text-align:left;background-color:#4CAF50;color:white;";
var graficaTabtd="border:1px solid #ddd;padding:8px;";
function testoClassifica(){
txt="";
txt+="<table id='tabella' style="+graficaTab+"><tr><th style="+graficaTabth+">GIOCATORE</th><th style="+graficaTabth+">PNT</th></tr>";
for(x in classificaGame){ 
//cicla tra gli index del object 0,1,2 etc..
if(x%2>0){ coloreTR="#f2f2f2";}else{ coloreTR="#ddd"; }
   txt+="<tr style='background-color:"+coloreTR+"'><td style="+graficaTabtd+">";
   txt+=classificaGame[x].giocatore;
   txt+="</td><td>";
   txt+=classificaGame[x].punteggio;
   txt+="</td></tr>";
} 
//fine funzione testoCla
txt+="</table>";
return txt;
}


function aggPlayer(giocator,punt){
classificaGame.push({giocatore:giocator,punteggio:punt})
numTotPla=classificaGame.length;
testoClassifica();
scriviJSON();
}

function scriviJSON(){
classificaGame.sort(function(a, b){return b.punteggio - a.punteggio});
let data = JSON.stringify(classificaGame);
fs.writeFileSync('classifica.json', data);
contents = fs.readFileSync("classifica.json");
classificaGame = JSON.parse(contents);
}


var ciao="";
// Get content from file
 var contents = fs.readFileSync("classifica.json");
// Define to JSON type
classificaGame = JSON.parse(contents);
// Get Value from JSON
//ciao+=jsonContent.player+" /n"+jsonContent.punteggio;


///////////////////////////////////////////
////////////////////////////////////////////
/////////   x inserire in array nomeplayer=papol
/////// cars.push({player:papol,classifica:280})
/* 
'use strict';

let student = { 
    name: 'Mike',
    age: 23, 
    gender: 'Male',
    department: 'English',
    car: 'Honda' 
};
 
let data = JSON.stringify(student);
fs.writeFileSync('student-2.json', data);
*/
