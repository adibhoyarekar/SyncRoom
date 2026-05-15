export default function initSocket(io) {
    const rooms = new Map(); // roomId -> Set of { socketId, user }

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join room
        socket.on('join-room', ({ roomId, user }) => {
            socket.join(roomId);

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Map());
            }

            const roomUsers = rooms.get(roomId);
            roomUsers.set(socket.id, user);

            // Notify others in room
            socket.to(roomId).emit('user-joined', { socketId: socket.id, user });

            // Send current users to the new user
            const usersInRoom = Array.from(roomUsers.entries()).map(([id, u]) => ({ socketId: id, user: u }));
            socket.emit('room-users', usersInRoom);
        });

        // Video Sync
        socket.on('video-play', ({ roomId, time }) => {
            socket.to(roomId).emit('video-play', { time });
        });

        socket.on('video-pause', ({ roomId, time }) => {
            socket.to(roomId).emit('video-pause', { time });
        });

        socket.on('video-seek', ({ roomId, time }) => {
            socket.to(roomId).emit('video-seek', { time });
        });

        socket.on('video-url-change', ({ roomId, newUrl }) => {
            socket.to(roomId).emit('video-url-change', { newUrl });
        });

        // Chat
        socket.on('chat-message', ({ roomId, message }) => {
            // message object: { id, userId, text, timestamp, userName, userImage }
            // In a real app, save to mongo here
            io.to(roomId).emit('chat-message', message);
        });

        socket.on('typing', ({ roomId, userName }) => {
            socket.to(roomId).emit('typing', { userName });
        });

        // WebRTC toggles
        socket.on('toggle-mic', ({ roomId, userId, isMuted }) => {
            const roomUsers = rooms.get(roomId);
            if (roomUsers && roomUsers.has(socket.id)) {
                const user = roomUsers.get(socket.id);
                user.isMuted = isMuted;
                roomUsers.set(socket.id, user);
            }
            socket.to(roomId).emit('user-toggled-mic', { userId, isMuted });
        });

        socket.on('toggle-camera', ({ roomId, userId, isVideoOn }) => {
            const roomUsers = rooms.get(roomId);
            if (roomUsers && roomUsers.has(socket.id)) {
                const user = roomUsers.get(socket.id);
                user.isVideoOn = isVideoOn;
                roomUsers.set(socket.id, user);
            }
            socket.to(roomId).emit('user-toggled-camera', { userId, isVideoOn });
        });

        // WebRTC Signaling
        socket.on('webrtc-offer', ({ offer, to }) => {
            socket.to(to).emit('webrtc-offer', { offer, from: socket.id });
        });

        socket.on('webrtc-answer', ({ answer, to }) => {
            socket.to(to).emit('webrtc-answer', { answer, from: socket.id });
        });

        socket.on('webrtc-ice-candidate', ({ candidate, to }) => {
            socket.to(to).emit('webrtc-ice-candidate', { candidate, from: socket.id });
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Remove user from any room they were in
            for (const [roomId, roomUsers] of rooms.entries()) {
                if (roomUsers.has(socket.id)) {
                    const user = roomUsers.get(socket.id);
                    roomUsers.delete(socket.id);
                    io.to(roomId).emit('user-left', { socketId: socket.id, user });

                    if (roomUsers.size === 0) {
                        rooms.delete(roomId);
                    }
                }
            }
        });
    });
}
