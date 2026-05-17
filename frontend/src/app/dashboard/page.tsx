"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    LogOut, Plus, Tv2, ArrowRight, Play, 
    Search, Command
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    
    // Command & Query State
    const [searchQuery, setSearchQuery] = useState("");
    const [recentRooms, setRecentRooms] = useState<{roomId: string, joinedAt: string}[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    
    // Keyboard navigation index
    const [selectedIndex, setSelectedIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    // Fetch recent rooms
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

    // Command Handlers
    const handleCreateRoom = useCallback(() => {
        if (isNavigating) return;
        setIsNavigating(true);
        const newRoomId = Math.random().toString(36).substring(2, 9);
        router.push(`/room/${newRoomId}`);
    }, [isNavigating, router]);

    const handleJoinRoomId = useCallback((id: string) => {
        if (isNavigating) return;
        const cleanId = id.trim();
        if (cleanId) {
            setIsNavigating(true);
            router.push(`/room/${cleanId}`);
        }
    }, [isNavigating, router]);

    // Build interactive command list items dynamically
    const getCommandItems = () => {
        const items = [];

        // Check if query is potentially an invite code or room name
        if (searchQuery.trim().length > 0) {
            items.push({
                type: "join_query",
                title: `Join Session: "${searchQuery.trim()}"`,
                subtitle: "Directly enter this room session",
                icon: <ArrowRight size={14} className="text-emerald-400" />,
                shortcut: "⏎",
                action: () => handleJoinRoomId(searchQuery)
            });
        }

        // Standard commands
        items.push({
            type: "create",
            title: "Create a New Watch Session",
            subtitle: "Launch a clean watchroom and co-stream instantly",
            icon: <Plus size={14} className="text-indigo-400" />,
            shortcut: "⏎",
            action: handleCreateRoom
        });

        // Add recent rooms as command choices
        recentRooms.forEach((room) => {
            const formattedTime = new Date(room.joinedAt).toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric' 
            }) + " · " + new Date(room.joinedAt).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
            });

            items.push({
                type: "rejoin",
                roomId: room.roomId,
                title: `Rejoin Session: ${room.roomId}`,
                subtitle: `Previously visited at ${formattedTime}`,
                icon: <Tv2 size={14} className="text-zinc-400" />,
                shortcut: "⏎",
                action: () => handleJoinRoomId(room.roomId)
            });
        });

        return items;
    };

    const commandItems = getCommandItems();

    // Reset index if commands size changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery, recentRooms]);

    // Core Keyboard Navigation Listener (Raycast emulation)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % commandItems.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + commandItems.length) % commandItems.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (commandItems[selectedIndex]) {
                    commandItems[selectedIndex].action();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [commandItems, selectedIndex]);

    if (status === "loading" || !session || isNavigating) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#070709] gap-3">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
                </div>
                {isNavigating && (
                    <p className="text-xs text-zinc-400 font-mono animate-pulse uppercase tracking-widest mt-2">Connecting to Session...</p>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070709] text-zinc-100 relative overflow-hidden noise selection:bg-indigo-600/40">
            {/* Soft Ambient Background Orbs */}
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/5 filter blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-rose-500/5 filter blur-[100px] pointer-events-none" />

            {/* ── Top Bar ────────────────────────────────────────────── */}
            <header className="relative z-20 flex items-center justify-between px-6 md:px-16 py-5 border-b border-zinc-900 bg-[#070709]/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                        <Play size={14} fill="white" className="ml-0.5" />
                    </div>
                    <span className="text-sm font-bold tracking-wider uppercase text-white">SyncRoom</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                        <Avatar className="h-5 w-5 border border-zinc-800">
                            <AvatarImage src={session.user?.image || ""} />
                            <AvatarFallback className="text-[9px] bg-zinc-800">{session.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-zinc-300 font-medium hidden sm:block">
                            {session.user?.name?.split(" ")[0]}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut()}
                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                        title="Sign Out"
                    >
                        <LogOut size={14} />
                    </Button>
                </div>
            </header>

            {/* ── Main Raycast Command Interface ─────────────────────── */}
            <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-20">
                
                {/* Visual Greeting Header */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-8"
                >
                    <span className="text-[10px] uppercase font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md text-zinc-500 font-bold">
                        Dashboard Panel
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">
                        Welcome back,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-indigo-400">
                            {session.user?.name || "Guest User"}
                        </span>
                    </h1>
                </motion.div>

                {/* Raycast Console Shell */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="border border-zinc-800/80 bg-zinc-950/60 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden"
                >
                    {/* Shell Search Header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-900 bg-zinc-950/30">
                        <Search size={16} className="text-zinc-500 shrink-0" />
                        <Input
                            ref={inputRef}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search commands, join room, or rejoin recent sessions..."
                            className="border-none bg-transparent text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-7 p-0 flex-1"
                            autoFocus
                        />
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 select-none">
                            Raycast Mode
                        </span>
                    </div>

                    {/* Shell Action List */}
                    <div className="p-2.5 max-h-[360px] overflow-y-auto custom-scrollbar space-y-1">
                        {isLoadingRooms ? (
                            <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                                <div className="w-5 h-5 rounded-full border-2 border-t-indigo-500 border-zinc-850 animate-spin" />
                                <span className="text-xs font-mono text-zinc-500">Syncing with server...</span>
                            </div>
                        ) : commandItems.length === 0 ? (
                            <div className="py-20 text-center text-zinc-600 flex flex-col items-center justify-center">
                                <Command size={24} className="opacity-10 mb-2" />
                                <p className="text-xs font-mono">No commands or history matched</p>
                            </div>
                        ) : (
                            commandItems.map((item, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => item.action()}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-left relative cursor-pointer border ${
                                            isSelected 
                                                ? "bg-zinc-900 border-zinc-800 text-white shadow-md scale-[1.005]" 
                                                : "border-transparent text-zinc-400 hover:text-zinc-200"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                                isSelected ? "bg-zinc-800" : "bg-zinc-900/50"
                                            }`}>
                                                {item.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold leading-none">{item.title}</h4>
                                                <p className="text-[10px] text-zinc-500 leading-none mt-1.5 truncate">{item.subtitle}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 select-none">
                                            {item.type === "rejoin" && (
                                                <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-bold uppercase">
                                                    Rejoin
                                                </span>
                                            )}
                                            {isSelected && (
                                                <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                                    Open <ArrowRight size={10} />
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Shell Navigation Footer */}
                    <div className="px-5 py-3.5 border-t border-zinc-900 bg-zinc-950/20 flex items-center justify-between text-[10px] text-zinc-500 font-mono select-none">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">↓</kbd>
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">↑</kbd>
                                Navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">⏎</kbd>
                                Select
                            </span>
                        </div>
                        <span className="hidden sm:inline font-mono">
                            Press any invite code to test join pipeline
                        </span>
                    </div>

                </motion.div>
            </main>
        </div>
    );
}
