const userSign = function (socket) {
    socket.data.username = (socket.request.session.id).slice(1, 6);
    const requestedId = String(socket.handshake.auth && socket.handshake.auth.playerId || '');
    socket.data.playerId = /^[a-zA-Z0-9_-]{12,64}$/.test(requestedId)
        ? requestedId
        : `session_${socket.request.session.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 48)}`;

    socket.emit('setNick', {
        msg: socket.data.username,
    });
};

module.exports = userSign;
