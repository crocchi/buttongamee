const userSign = function (socket) {
    socket.data.username = (socket.request.session.id).slice(1, 6);

    socket.emit('setNick', {
        msg: socket.data.username,
    });
};

module.exports = userSign;
