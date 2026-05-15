"use client";

import { useRoomStore } from "@/store/useRoomStore";
import { Mic, MicOff, Video, VideoOff, Crown } from "lucide-react";
import Image from "next/image";



export default function ParticipantsPanel() {
    const { users } = useRoomStore();

    return (
        <div className="flex flex-col h-full bg-zinc-950/50 backdrop-blur-md">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="font-semibold text-lg">Participants</h2>
                <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded-full text-zinc-300">
                    {users.length} in room
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    {users.map((user, idx) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Image
                                        src={user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                                        alt={user.name}
                                        width={40}
                                        height={40}
                                        unoptimized
                                        className="w-10 h-10 rounded-full border border-zinc-700 object-cover"
                                    />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        {user.name}
                                        {/* Make the first user host for now */}
                                        {idx === 0 && <Crown size={14} className="text-yellow-500" />}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-zinc-400">
                                {user.isMuted ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} />}
                                {user.isVideoOn ? <Video size={16} /> : <VideoOff size={16} className="text-red-400" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
