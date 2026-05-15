import express from 'express';
import Room from '../models/Room.js';

const router = express.Router();

// Get Room Info
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        // Don't send password hash back
        const { password, ...roomData } = room.toObject();
        res.json(roomData);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Room
router.post('/create', async (req, res) => {
    const { roomId, ownerId, isPrivate, password } = req.body;
    try {
        const existing = await Room.findOne({ roomId });
        if (existing) {
            return res.status(400).json({ error: 'Room ID already exists' });
        }
        const newRoom = new Room({ roomId, ownerId, isPrivate, password });
        await newRoom.save();

        const { password: _, ...roomData } = newRoom.toObject();
        res.status(201).json(roomData);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating room' });
    }
});

export default router;
