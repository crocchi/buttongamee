module.exports = (io,main) => {

  const userLogout = function(payload) {
    const socket = this; // hence the 'function' above, as an arrow function will not work
    //console.log(`${socket.data.username} left the party`);
     io.emit('chat message', { 
                    msg:`${socket.data.username} left the party`, 
                    username:socket.data.username, 
                    isSystemMessage:true,
                    time:main.getTime()
                });
    // ...
  };

  const userLogin = function (socket) {
    //let socket = this;
    //console.log(`${socket.data.username} join the party`)
    io.emit('chat message', { 
                    msg:`${socket.data.username} join the party`, 
                    username:socket.data.username, 
                    isSystemMessage:true,
                    time:main.getTime()
                });
    // ...
  };

  const userChat = function(payload) {
    const socket = this; // hence the 'function' above, as an arrow function will not work
    console.log(`${socket.data.username} send a msg..${payload}`);
    //console.log(payload);
     io.emit('chat message', { 
                    msg:`${payload} `, 
                    username: socket.data.username, 
                    isSystemMessage:false,
                    time:main.getTime()
                });
    // ...
  };

  return {
    userLogout,
    userLogin,
    userChat,
  }
}
