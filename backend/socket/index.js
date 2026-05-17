export default function initSocket(io) {
    const rooms = new Map(); // roomId -> Set of { socketId, user }
    const roomQueues = new Map(); // roomId -> Array of video URLs

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join room
        socket.on('join-room', ({ roomId, user }) => {
            socket.join(roomId);

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Map());
            }

            const roomUsers = rooms.get(roomId);
            
            // Determine if first user (Primary Owner)
            const isFirstUser = roomUsers.size === 0;
            const enhancedUser = {
                ...user,
                isOwner: isFirstUser,
                isPrimaryOwner: isFirstUser
            };

            roomUsers.set(socket.id, enhancedUser);

            // Notify others in room
            socket.to(roomId).emit('user-joined', { socketId: socket.id, user: enhancedUser });

            // Send current users to the new user
            const usersInRoom = Array.from(roomUsers.entries()).map(([id, u]) => ({ socketId: id, user: u }));
            socket.emit('room-users', usersInRoom);

            // Send current queue
            socket.emit('queue-updated', { queue: roomQueues.get(roomId) || [] });
        });

        // Helper to check ownership
        const isUserOwner = (roomId, socketId) => {
            const roomUsers = rooms.get(roomId);
            if (!roomUsers) return false;
            const user = roomUsers.get(socketId);
            return user && user.isOwner;
        };

        const isUserPrimaryOwner = (roomId, socketId) => {
            const roomUsers = rooms.get(roomId);
            if (!roomUsers) return false;
            const user = roomUsers.get(socketId);
            return user && user.isPrimaryOwner;
        };

        // Video Sync (Only owners)
        socket.on('video-play', ({ roomId, time }) => {
            if (isUserOwner(roomId, socket.id)) {
                socket.to(roomId).emit('video-play', { time });
            }
        });

        socket.on('video-pause', ({ roomId, time }) => {
            if (isUserOwner(roomId, socket.id)) {
                socket.to(roomId).emit('video-pause', { time });
            }
        });

        socket.on('video-seek', ({ roomId, time }) => {
            if (isUserOwner(roomId, socket.id)) {
                socket.to(roomId).emit('video-seek', { time });
            }
        });

        socket.on('video-url-change', ({ roomId, newUrl }) => {
            if (isUserOwner(roomId, socket.id)) {
                socket.to(roomId).emit('video-url-change', { newUrl });
            }
        });

        // Video Queue
        socket.on('add-to-queue', ({ roomId, videoUrl }) => {
            if (!roomQueues.has(roomId)) {
                roomQueues.set(roomId, []);
            }
            const queue = roomQueues.get(roomId);
            queue.push(videoUrl);
            io.to(roomId).emit('queue-updated', { queue });
        });

        socket.on('remove-from-queue', ({ roomId, index }) => {
            if (isUserOwner(roomId, socket.id)) {
                const queue = roomQueues.get(roomId);
                if (queue && index >= 0 && index < queue.length) {
                    queue.splice(index, 1);
                    io.to(roomId).emit('queue-updated', { queue });
                }
            }
        });

        socket.on('play-next', ({ roomId }) => {
            if (isUserOwner(roomId, socket.id)) {
                const queue = roomQueues.get(roomId);
                if (queue && queue.length > 0) {
                    const nextUrl = queue.shift();
                    // Emit video-url-change to EVERYONE, including the owner who requested it,
                    // so the owner's UI updates automatically.
                    io.to(roomId).emit('video-url-change', { newUrl: nextUrl });
                    io.to(roomId).emit('queue-updated', { queue });
                }
            }
        });

        // Collaborative Whiteboard
        socket.on('draw-line', ({ roomId, x0, y0, x1, y1, color, width }) => {
            socket.to(roomId).emit('draw-line', { x0, y0, x1, y1, color, width });
        });

        socket.on('clear-whiteboard', ({ roomId }) => {
            socket.to(roomId).emit('clear-whiteboard');
        });

        socket.on('request-whiteboard', ({ roomId }) => {
            // Find the primary owner to ask for the current whiteboard state
            const roomUsers = rooms.get(roomId);
            if (roomUsers) {
                for (const [id, u] of roomUsers.entries()) {
                    if (u.isPrimaryOwner) {
                        io.to(id).emit('sync-whiteboard-request', { requesterId: socket.id });
                        break;
                    }
                }
            }
        });

        socket.on('sync-whiteboard-response', ({ requesterId, dataUrl }) => {
            io.to(requesterId).emit('sync-whiteboard-response', { dataUrl });
        });

        // Emoji Reactions (broadcast to everyone including sender)
        socket.on('emoji-reaction', ({ roomId, emoji, userName }) => {
            io.to(roomId).emit('emoji-reaction', { emoji, userName, senderId: socket.id });
        });

        // Room Name
        socket.on('set-room-name', ({ roomId, name }) => {
            if (isUserOwner(roomId, socket.id)) {
                io.to(roomId).emit('room-name-changed', { name });
            }
        });

        // Video sync state request (new joiners get current state)
        socket.on('request-sync-state', ({ roomId }) => {
            // Ask all others in room for their current playback time
            socket.to(roomId).emit('sync-state-request', { requesterId: socket.id });
        });

        socket.on('sync-state-response', ({ requesterId, time, isPlaying }) => {
            io.to(requesterId).emit('sync-state-response', { time, isPlaying });
        });

        // Chat
        socket.on('chat-message', ({ roomId, message }) => {
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

        // Owner Controls
        socket.on('kick-user', ({ roomId, targetSocketId }) => {
            if (isUserOwner(roomId, socket.id)) {
                // Emit to the target socket to force them out
                io.to(targetSocketId).emit('kicked');
            }
        });

        socket.on('force-mute', ({ roomId, targetSocketId }) => {
            if (isUserOwner(roomId, socket.id)) {
                io.to(targetSocketId).emit('force-mute');
            }
        });

        socket.on('grant-owner', ({ roomId, targetSocketId }) => {
            if (isUserOwner(roomId, socket.id)) {
                const roomUsers = rooms.get(roomId);
                if (roomUsers && roomUsers.has(targetSocketId)) {
                    const targetUser = roomUsers.get(targetSocketId);
                    targetUser.isOwner = true;
                    roomUsers.set(targetSocketId, targetUser);
                    io.to(roomId).emit('owner-status-update', { socketId: targetSocketId, isOwner: true });
                }
            }
        });

        socket.on('request-owner', ({ roomId, userName }) => {
            // Find the primary owner and send the request only to them
            const roomUsers = rooms.get(roomId);
            if (roomUsers) {
                for (const [id, u] of roomUsers.entries()) {
                    if (u.isPrimaryOwner) {
                        io.to(id).emit('owner-request', { socketId: socket.id, userName });
                        break;
                    }
                }
            }
        });

        socket.on('accept-owner-request', ({ roomId, targetSocketId }) => {
            // Only primary owner can accept the request
            if (isUserPrimaryOwner(roomId, socket.id)) {
                const roomUsers = rooms.get(roomId);
                if (roomUsers && roomUsers.has(targetSocketId)) {
                    const targetUser = roomUsers.get(targetSocketId);
                    targetUser.isOwner = true;
                    roomUsers.set(targetSocketId, targetUser);
                    io.to(roomId).emit('owner-status-update', { socketId: targetSocketId, isOwner: true });
                }
            }
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
                    const wasPrimaryOwner = user.isPrimaryOwner;
                    
                    roomUsers.delete(socket.id);
                    io.to(roomId).emit('user-left', { socketId: socket.id, user });

                    if (roomUsers.size === 0) {
                        rooms.delete(roomId);
                        roomQueues.delete(roomId);
                    } else if (wasPrimaryOwner) {
                        // If primary owner leaves, pass it to someone else (first available)
                        const nextPrimaryId = Array.from(roomUsers.keys())[0];
                        const nextPrimary = roomUsers.get(nextPrimaryId);
                        nextPrimary.isOwner = true;
                        nextPrimary.isPrimaryOwner = true;
                        roomUsers.set(nextPrimaryId, nextPrimary);
                        
                        io.to(roomId).emit('owner-status-update', { socketId: nextPrimaryId, isOwner: true, isPrimaryOwner: true });
                    }
                }
            }
        });
    });
}
