// Server-side (Socket.io) additions
io.on('connection', (socket) => {
    socket.on('newSlide', (data) => {
        socket.to(data.boardId).emit('newSlide', data);
    });

    socket.on('changeSlide', (data) => {
        socket.to(data.boardId).emit('changeSlide', data);
    });

    socket.on('joinBoard', (data) => {
        // Send existing slides when joining
        const board = getBoard(data.boardId);
        socket.emit('existingSlides', board.slides);
    });
});
