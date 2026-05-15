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

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

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

                {/* Recent Rooms (Static Placeholder for now) */}
                <div>
                    <h3 className="text-xl font-bold mb-4 text-zinc-300">Recent Rooms</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                        <p className="text-zinc-500">You haven&apos;t joined any rooms recently.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
