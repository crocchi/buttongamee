const userSign = function (socket) {
    //let socket = this;
    socket.data.username = (socket.request.session.id).slice(1, 6);
    this.session = socket.request.session.id;
    this.username = socket.data.username;
    
    console.log(`user sign:${socket.data.username} `)
    this.io.to(socket.id).emit('setNick', { 
                    msg:`${this.username}`,
                    session:`${this.session}`
                });
    // ...
  };

  module.exports = userSign;