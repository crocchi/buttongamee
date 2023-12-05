module.exports = (io) => {
  const userLogout = function (payload) {
    const socket = this; // hence the 'function' above, as an arrow function will not work
     io.emit('chat message', { 
                    msg:`${socket.data.username} left the party`, 
                    username:socket.data.username, 
                    isSystemMessage:true
                });
    // ...
  };

  const userLogin = function (user, callback) {
    // ...
    io.emit('chat message', { 
                    msg:`${user} join the party`, 
                    username:user, 
                    isSystemMessage:true
                });
    // ...
  };
  };

  return {
    userLogout,
    userLogin
  }
}
