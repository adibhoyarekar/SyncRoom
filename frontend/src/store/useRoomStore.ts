import { create } from 'zustand';

interface User {
    id: string; // socketId
    name: string;
    image?: string;
    isMuted?: boolean;
    isVideoOn?: boolean;
    stream?: MediaStream;
}

interface Message {
    id: string;
    userId: string;
    userName: string;
    userImage?: string;
    text: string;
    timestamp: string;
}

interface RoomState {
    users: User[];
    messages: Message[];
    setUsers: (users: User[]) => void;
    addUser: (user: User) => void;
    removeUser: (socketId: string) => void;
    updateUser: (socketId: string, updates: Partial<User>) => void;
    addMessage: (message: Message) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
    users: [],
    messages: [],
    setUsers: (users) => set({ users }),
    addUser: (user) => set((state) => ({ users: [...state.users, user] })),
    removeUser: (socketId) => set((state) => ({ users: state.users.filter(u => u.id !== socketId) })),
    updateUser: (socketId, updates) => set((state) => ({
        users: state.users.map(u => u.id === socketId ? { ...u, ...updates } : u)
    })),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}));
