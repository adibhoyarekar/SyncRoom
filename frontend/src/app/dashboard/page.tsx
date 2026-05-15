"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogOut, Plus, Tv2, Users, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
            
            // First sync the user
            fetch(`${apiUrl}/api/users/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: session.user.name,
                    email: session.user.email,
                    image: session.user.image,
                })
            })
            .then(() => {
                // Then fetch recent rooms
                return fetch(`${apiUrl}/api/users/recent-rooms?email=${encodeURIComponent(session.user.email as string)}`);
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
        // Generate a random room ID for simplicity
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
        return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Topbar */}
            <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-10 mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Tv2 className="text-indigo-500" size={24} />
                    <h1 className="text-xl font-bold tracking-tight">SyncRoom</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400 hidden sm:block">{session.user?.name}</span>
                        <Avatar className="h-8 w-8 border border-zinc-800">
                            <AvatarImage src={session.user?.image || ""} />
                            <AvatarFallback>{session.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-zinc-400 hover:text-white">
                        <LogOut size={18} />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 md:px-8 py-12">
                <h2 className="text-3xl font-bold mb-8">Welcome back, {session.user?.name?.split(" ")[0]}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Create Room Card */}
                    <Card className="bg-zinc-900 border-zinc-800 text-white h-full flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
                        <CardHeader>
                            <Users className="text-indigo-400 mb-2" size={24} />
                            <CardTitle>Create a Room</CardTitle>
                            <CardDescription className="text-zinc-400">Start a new room and invite your friends to watch together.</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button onClick={handleCreateRoom} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Plus className="mr-2" size={18} />
                                Create New Room
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Join Room Card */}
                    <Card className="bg-zinc-900 border-zinc-800 text-white h-full flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
                        <CardHeader>
                            <Search className="text-emerald-400 mb-2" size={24} />
                            <CardTitle>Join a Room</CardTitle>
                            <CardDescription className="text-zinc-400">Have an invite code? Enter it below to join the party.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleJoinRoom} className="flex gap-2 w-full mt-2">
                                <Input
                                    placeholder="e.g. abc1234"
                                    value={roomIdToJoin}
                                    onChange={(e) => setRoomIdToJoin(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500"
                                />
                                <Button type="submit" variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-white" disabled={!roomIdToJoin}>
                                    Join
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Rooms */}
                <div>
                    <h3 className="text-xl font-bold mb-4 text-zinc-300">Recent Rooms</h3>
                    {isLoadingRooms ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                            <p className="text-zinc-500 animate-pulse">Loading recent rooms...</p>
                        </div>
                    ) : recentRooms.length === 0 ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                            <p className="text-zinc-500">You haven&apos;t joined any rooms recently.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {recentRooms.map((room) => (
                                <div 
                                    key={room.roomId}
                                    onClick={() => router.push(`/room/${room.roomId}`)}
                                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-indigo-500/50 cursor-pointer transition-colors group relative overflow-hidden"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                                                <Tv2 size={18} />
                                            </div>
                                            <h4 className="font-semibold text-lg">{room.roomId}</h4>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-4">
                                        Joined {new Date(room.joinedAt).toLocaleDateString()} at {new Date(room.joinedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
