import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Sync User (called on login/dashboard visit)
router.post('/sync', async (req, res) => {
    const { name, email, image } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        let user = await User.findOne({ email });
        
        if (user) {
            // Update existing user with latest info from Google
            user.name = name || user.name;
            user.image = image || user.image;
            await user.save();
        } else {
            // Create new user
            user = new User({ name, email, image });
            await user.save();
        }
        
        res.status(200).json(user);
    } catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get recent rooms for a user
router.get('/recent-rooms', async (req, res) => {
    const { email } = req.query;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return recent rooms, sorted by joinedAt desc
        const sortedRooms = user.recentRooms.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
        res.status(200).json(sortedRooms);
    } catch (error) {
        console.error('Error fetching recent rooms:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add to recent rooms
router.post('/recent-rooms', async (req, res) => {
    const { email, roomId } = req.body;
    
    if (!email || !roomId) {
        return res.status(400).json({ error: 'Email and roomId are required' });
    }

    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please sync user first.' });
        }
        
        // Remove room if it already exists (to move it to top)
        user.recentRooms = user.recentRooms.filter(r => r.roomId !== roomId);
        
        // Add room to the beginning of the array
        user.recentRooms.unshift({ roomId, joinedAt: new Date() });
        
        // Keep only the 10 most recent rooms
        if (user.recentRooms.length > 10) {
            user.recentRooms = user.recentRooms.slice(0, 10);
        }
        
        await user.save();
        res.status(200).json(user.recentRooms);
    } catch (error) {
        console.error('Error updating recent rooms:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
