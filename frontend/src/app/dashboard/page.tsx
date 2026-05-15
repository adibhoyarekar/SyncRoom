"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Plus, Tv2, ArrowRight, Clock, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [roomIdToJoin, setRoomIdToJoin] = useState("");
    const [recentRooms, setRecentRooms] = useState<{roomId: string, joinedAt: string}[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    // Sync user and fetch recent rooms
    useEffect(() => {
        if (status === "authenticated" && session?.user?.email) {
            const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') || "http://localhost:4000";
            
            fetch(`${apiUrl}/api/users/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: session.user?.name,
                    email: session.user?.email,
                    image: session.user?.image,
                })
            })
            .then(() => {
                return fetch(`${apiUrl}/api/users/recent-rooms?email=${encodeURIComponent((session.user?.email as string) || "")}`);
            })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setRecentRooms(data);
                }
            })
            .catch(err => console.error("Failed to load recent rooms:", err))
            .finally(() => setIsLoadingRooms(false));
        }
    }, [status, session]);

    const handleCreateRoom = () => {
        const newRoomId = Math.random().toString(36).substring(2, 9);
        router.push(`/room/${newRoomId}`);
    };

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomIdToJoin.trim()) {
            router.push(`/room/${roomIdToJoin.trim()}`);
        }
    };

    if (status === "loading" || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white relative overflow-hidden noise">
            {/* Subtle orbs */}
            <div className="orb orb-1 !opacity-[0.08]" />
            <div className="orb orb-2 !opacity-[0.06]" />

            {/* ── Top Bar ────────────────────────────────────────────── */}
            <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 border-b border-zinc-800/40">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <Play size={12} fill="white" className="ml-0.5" />
                    </div>
                    <span className="text-base font-bold tracking-tight">SyncRoom</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={session.user?.image || ""} />
                            <AvatarFallback className="text-[10px] bg-zinc-800">{session.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-zinc-300 hidden sm:block">{session.user?.name}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut()}
                        className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                    >
                        <LogOut size={15} />
                    </Button>
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────────── */}
            <main className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 py-12 md:py-16">
                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <p className="text-sm text-zinc-500 mb-1">Welcome back</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{session.user?.name?.split(" ")[0]}</h1>
                </motion.div>

                {/* ── Action Cards ─────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10"
                >
                    {/* Create Room */}
                    <button
                        onClick={handleCreateRoom}
                        className="glass rounded-2xl p-6 text-left group hover:border-indigo-500/20 transition-all duration-300 cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                            <Plus size={20} />
                        </div>
                        <h3 className="font-semibold text-base mb-1">Create a Room</h3>
                        <p className="text-sm text-zinc-500 mb-4">Start a new watch party and share the code with friends.</p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-medium group-hover:gap-2.5 transition-all">
                            Create room <ArrowRight size={12} />
                        </span>
                    </button>

                    {/* Join Room */}
                    <div className="glass rounded-2xl p-6 hover:border-emerald-500/20 transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-5">
                            <Tv2 size={20} />
                        </div>
                        <h3 className="font-semibold text-base mb-1">Join a Room</h3>
                        <p className="text-sm text-zinc-500 mb-4">Have an invite code? Enter it below.</p>
                        <form onSubmit={handleJoinRoom} className="flex gap-2">
                            <Input
                                placeholder="e.g. abc1234"
                                value={roomIdToJoin}
                                onChange={(e) => setRoomIdToJoin(e.target.value)}
                                className="bg-zinc-900/50 border-zinc-800/50 h-9 text-sm focus-visible:ring-emerald-500/50 placeholder:text-zinc-600"
                            />
                            <Button
                                type="submit"
                                disabled={!roomIdToJoin}
                                className="h-9 px-4 text-sm bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/50 disabled:opacity-30"
                            >
                                Join
                            </Button>
                        </form>
                    </div>
                </motion.div>

                {/* ── Recent Rooms ─────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-14"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <Clock size={14} className="text-zinc-500" />
                        <h2 className="text-sm font-medium text-zinc-400">Recent Rooms</h2>
                    </div>

                    {isLoadingRooms ? (
                        <div className="glass rounded-xl p-10 text-center">
                            <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
                                <div className="w-4 h-4 rounded-full border-2 border-t-indigo-500 border-zinc-800 animate-spin" />
                                Loading...
                            </div>
                        </div>
                    ) : recentRooms.length === 0 ? (
                        <div className="glass rounded-xl p-10 text-center">
                            <p className="text-sm text-zinc-600">No rooms yet. Create one to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {recentRooms.map((room, i) => (
                                <motion.button
                                    key={room.roomId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                                    onClick={() => router.push(`/room/${room.roomId}`)}
                                    className="glass rounded-xl p-4 text-left hover:border-zinc-700/50 group transition-all duration-300 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Tv2 size={14} />
                                        </div>
                                        <span className="font-mono text-sm font-medium">{room.roomId}</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600">
                                        {new Date(room.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(room.joinedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
