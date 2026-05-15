"use client";

import { useRoomStore } from "@/store/useRoomStore";
import { Mic, MicOff, Video, VideoOff, Crown, MoreVertical, ShieldAlert, UserMinus, KeySquare } from "lucide-react";
import Image from "next/image";
import { Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ParticipantsPanelProps {
    socket: Socket;
    roomId: string;
}

export default function ParticipantsPanel({ socket, roomId }: ParticipantsPanelProps) {
    const { users } = useRoomStore();
    const { data: session } = useSession();

    const localUser = users.find(u => u.id === socket?.id);
    const isOwner = localUser?.isOwner ?? false;

    const handleKick = (targetId: string) => {
        socket.emit("kick-user", { roomId, targetSocketId: targetId });
    };

    const handleForceMute = (targetId: string) => {
        socket.emit("force-mute", { roomId, targetSocketId: targetId });
    };

    const handleGrantOwner = (targetId: string) => {
        socket.emit("grant-owner", { roomId, targetSocketId: targetId });
    };

    const handleRequestOwner = () => {
        if (session?.user?.name) {
            socket.emit("request-owner", { roomId, userName: session.user.name });
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950/50 backdrop-blur-md">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="font-semibold text-lg">Participants</h2>
                <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded-full text-zinc-300">
                    {users.length} in room
                </span>
            </div>

            {!isOwner && (
                <div className="p-4 border-b border-zinc-800">
                    <Button 
                        variant="secondary" 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={handleRequestOwner}
                    >
                        <KeySquare className="mr-2 h-4 w-4" />
                        Request Owner Access
                    </Button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    {users.map((user) => {
                        const isMe = user.id === socket?.id;
                        
                        return (
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
                                            {user.name} {isMe && <span className="text-xs text-zinc-500">(You)</span>}
                                            {user.isPrimaryOwner ? (
                                                <span title="Primary Owner"><Crown size={14} className="text-yellow-500" /></span>
                                            ) : user.isOwner ? (
                                                <span title="Co-Owner"><Crown size={14} className="text-zinc-400" /></span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 text-zinc-400 mr-2">
                                        {user.isMuted ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} />}
                                        {user.isVideoOn ? <Video size={16} /> : <VideoOff size={16} className="text-red-400" />}
                                    </div>

                                    {/* Owner Actions Dropdown */}
                                    {isOwner && !isMe && !user.isPrimaryOwner && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200">
                                                {!user.isOwner && (
                                                    <DropdownMenuItem onClick={() => handleGrantOwner(user.id)} className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                                                        <ShieldAlert className="mr-2 h-4 w-4" />
                                                        Make Co-Owner
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => handleForceMute(user.id)} className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                                                    <MicOff className="mr-2 h-4 w-4" />
                                                    Force Mute
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleKick(user.id)} className="cursor-pointer text-red-400 hover:bg-red-950/50 focus:bg-red-950/50 focus:text-red-400">
                                                    <UserMinus className="mr-2 h-4 w-4" />
                                                    Kick User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
