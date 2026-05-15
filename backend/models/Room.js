import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true }, // Ideally an ObjectId referencing User
    isPrivate: { type: Boolean, default: false },
    password: { type: String }, // Hashed if private
}, { timestamps: true });

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);
