import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    userId: { type: String, required: true }, // the sender
    text: { type: String, required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
