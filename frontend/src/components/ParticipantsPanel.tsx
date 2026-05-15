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
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-zinc-800/50">
                <h2 className="font-semibold text-sm text-zinc-200">Participants</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{users.length} in this room</p>
            </div>

            {localUser && !isOwner && (
                <div className="px-4 py-3 border-b border-zinc-800/50">
                    <Button 
                        variant="secondary" 
                        className="w-full h-9 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                        onClick={handleRequestOwner}
                    >
                        <KeySquare className="mr-2 h-3.5 w-3.5" />
                        Request Owner Access
                    </Button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-0.5">
                    {users.map((user) => {
                        const isMe = user.id === socket?.id;
                        
                        return (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-800/30 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Image
                                            src={user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                                            alt={user.name}
                                            width={36}
                                            height={36}
                                            unoptimized
                                            className="w-9 h-9 rounded-full border border-zinc-700/50 object-cover"
                                        />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm flex items-center gap-1.5 text-zinc-200">
                                            <span className="truncate max-w-[120px]">{user.name}</span>
                                            {isMe && <span className="text-[10px] text-zinc-500 font-normal">(You)</span>}
                                            {user.isPrimaryOwner ? (
                                                <span title="Primary Owner"><Crown size={12} className="text-yellow-500" /></span>
                                            ) : user.isOwner ? (
                                                <span title="Co-Owner"><Crown size={12} className="text-zinc-400" /></span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 text-zinc-500">
                                        {user.isMuted ? <MicOff size={14} className="text-red-400/70" /> : <Mic size={14} />}
                                        {user.isVideoOn ? <Video size={14} /> : <VideoOff size={14} className="text-red-400/70" />}
                                    </div>

                                    {/* Owner Actions Dropdown */}
                                    {isOwner && !isMe && !user.isPrimaryOwner && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical size={14} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 min-w-[140px]">
                                                {!user.isOwner && (
                                                    <DropdownMenuItem onClick={() => handleGrantOwner(user.id)} className="cursor-pointer text-xs hover:bg-zinc-800 focus:bg-zinc-800">
                                                        <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                                                        Make Co-Owner
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => handleForceMute(user.id)} className="cursor-pointer text-xs hover:bg-zinc-800 focus:bg-zinc-800">
                                                    <MicOff className="mr-2 h-3.5 w-3.5" />
                                                    Force Mute
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleKick(user.id)} className="cursor-pointer text-xs text-red-400 hover:bg-red-950/50 focus:bg-red-950/50 focus:text-red-400">
                                                    <UserMinus className="mr-2 h-3.5 w-3.5" />
                                                    Kick
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
