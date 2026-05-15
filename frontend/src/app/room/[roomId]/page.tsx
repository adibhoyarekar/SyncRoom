"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { useRoomStore } from "@/store/useRoomStore";
import { Button } from "@/components/ui/button";
import { LogOut, Mic, MicOff, Video, VideoOff, MonitorUp, Settings, Tv2, Users as UsersIcon, MessageSquare } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import CameraGrid from "@/components/CameraGrid";
import VideoPlayer from "@/components/VideoPlayer";
import { useWebRTC } from "@/hooks/useWebRTC";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function RoomPage() {
    const { roomId } = useParams();
    const { data: session, status } = useSession();
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [socketId, setSocketId] = useState<string>("");

    // Local Media State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // UI Toggles
    const [showSidebar, setShowSidebar] = useState<"chat" | "participants" | null>("chat");

    const { setUsers, addUser, removeUser, addMessage, updateUser } = useRoomStore();

    // Start WebRTC connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { localStream, toggleScreenShare, ensureVideoTrack } = useWebRTC(roomId as string, socketId);

    // Set initial mute states
    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoOn;
            });
        }
    }, [localStream, isMuted, isVideoOn]);

    // ── Visibility-change: re-sync track enabled state ─────────────────
    // When the user switches back to this tab, make sure the track enabled
    // state still matches the UI toggles, because the useWebRTC hook may
    // have re-acquired tracks with default enabled=true.
    useEffect(() => {
        const syncTracks = () => {
            if (document.visibilityState !== "visible") return;
            if (!localStream) return;

            // Small delay to let useWebRTC's own recovery run first
            setTimeout(() => {
                localStream.getAudioTracks().forEach(t => {
                    t.enabled = !isMuted;
                });
                localStream.getVideoTracks().forEach(t => {
                    t.enabled = isVideoOn;
                });
            }, 300);
        };

        document.addEventListener("visibilitychange", syncTracks);
        window.addEventListener("focus", syncTracks);
        return () => {
            document.removeEventListener("visibilitychange", syncTracks);
            window.removeEventListener("focus", syncTracks);
        };
    }, [localStream, isMuted, isVideoOn]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
            return;
        }

        if (!session?.user) return;

        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
        });
        setSocket(newSocket);

        newSocket.on("connect", () => {
            if (newSocket.id) {
                setSocketId(newSocket.id);
                // Join Room Event inside connect to ensure socket ID is available
                newSocket.emit("join-room", {
                    roomId,
                    user: {
                        name: session?.user?.name || "Guest",
                        image: session?.user?.image || "",
                        isMuted: false,
                        isVideoOn: false,
                    }
                });

                // Record recent room in backend
                if (session?.user?.email) {
                    const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') || "http://localhost:4000";
                    fetch(`${apiUrl}/api/users/recent-rooms`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: session.user.email, roomId })
                    }).catch(err => console.error("Failed to record recent room", err));
                }
            }
        });

        // Socket Listeners
        newSocket.on("room-users", (usersInRoom) => {
            const formattedUsers = usersInRoom.map((u: { socketId: string, user: { name: string, image: string, isMuted: boolean, isVideoOn: boolean } }) => ({
                id: u.socketId,
                ...u.user
            }));
            setUsers(formattedUsers);
        });

        newSocket.on("user-joined", ({ socketId, user }) => {
            addUser({ id: socketId, ...user });
        });

        newSocket.on("user-left", ({ socketId }) => {
            removeUser(socketId);
        });

        newSocket.on("chat-message", (message) => {
            addMessage(message);
        });

        // Sync remote users' camera and mic state changes
        newSocket.on("user-toggled-camera", ({ userId, isVideoOn }: { userId: string; isVideoOn: boolean }) => {
            updateUser(userId, { isVideoOn });
        });

        newSocket.on("user-toggled-mic", ({ userId, isMuted }: { userId: string; isMuted: boolean }) => {
            updateUser(userId, { isMuted });
        });

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, session, status, router, addMessage, addUser, removeUser, setUsers, updateUser]);

    if (status === "loading" || !socket) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Connecting...</div>;
    }

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = isMuted); // If previously muted, enable now
        }
        setIsMuted(!isMuted);
        if (socketId) updateUser(socketId, { isMuted: !isMuted }); // Update global UI immediately
        if (socket) socket.emit("toggle-mic", { roomId, userId: socketId, isMuted: !isMuted });
    };

    const toggleCamera = async () => {
        const newVideoOn = !isVideoOn;

        if (newVideoOn && localStream) {
            // User wants camera ON — make sure the video track is alive
            const track = await ensureVideoTrack();
            if (track) {
                track.enabled = true;
            } else {
                // Could not get a video track — don't toggle the UI
                console.warn("Could not enable camera — no video track available");
                return;
            }
        } else if (!newVideoOn && localStream) {
            // User wants camera OFF
            localStream.getVideoTracks().forEach(track => track.enabled = false);
        }

        setIsVideoOn(newVideoOn);
        if (socketId) updateUser(socketId, { isVideoOn: newVideoOn });
        if (socket) socket.emit("toggle-camera", { roomId, userId: socketId, isVideoOn: newVideoOn });
    };

    const handleScreenShare = async () => {
        const targetState = !isScreenSharing;
        const result = await toggleScreenShare(targetState, () => {
            setIsScreenSharing(false);
        });

        if (result === targetState) {
            setIsScreenSharing(result);
            if (result && !isVideoOn) {
                toggleCamera(); // Sync camera indicator with screenshare capability
            }
        }
    };

    return (
        <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
            {/* Top Navbar */}
            <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Tv2 className="text-indigo-500" size={24} />
                    <h1 className="text-lg font-bold">SyncRoom</h1>
                    <div className="ml-4 px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-300">
                        Room: {roomId}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setShowSidebar(showSidebar === "participants" ? null : "participants")}>
                        <UsersIcon size={20} className={showSidebar === "participants" ? "text-indigo-400" : "text-zinc-400"} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowSidebar(showSidebar === "chat" ? null : "chat")}>
                        <MessageSquare size={20} className={showSidebar === "chat" ? "text-indigo-400" : "text-zinc-400"} />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => router.push("/dashboard")} className="ml-2">
                        <LogOut size={16} className="mr-2" />
                        Leave
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Center Canvas */}
                <main className="flex-1 flex flex-col bg-black p-4 lg:p-6 overflow-y-auto">
                    {/* Camera Grid above video */}
                    <CameraGrid currentUserId={socketId} />

                    <div className="flex-1 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative mt-2">
                        <VideoPlayer socket={socket} roomId={roomId as string} />
                    </div>

                    {/* Bottom Controls */}
                    <div className="h-20 mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center gap-4 px-6 shrink-0 shadow-lg">
                        <Button
                            variant={isMuted ? "destructive" : "secondary"}
                            size="icon"
                            onClick={toggleMic}
                            className={`h-12 w-12 rounded-full ${!isMuted ? "bg-zinc-800 hover:bg-zinc-700" : ""}`}
                        >
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </Button>
                        <Button
                            variant={isVideoOn ? "secondary" : "destructive"}
                            size="icon"
                            onClick={toggleCamera}
                            className={`h-12 w-12 rounded-full ${isVideoOn ? "bg-zinc-800 hover:bg-zinc-700" : ""}`}
                        >
                            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
                        </Button>
                        <Button
                            variant={isScreenSharing ? "secondary" : "outline"}
                            size="icon"
                            onClick={handleScreenShare}
                            className="h-12 w-12 rounded-full border-zinc-700 hover:bg-zinc-800"
                        >
                            <MonitorUp size={20} className={isScreenSharing ? "text-indigo-400" : ""} />
                        </Button>
                        <div className="w-px h-8 bg-zinc-800 mx-2" />
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-zinc-700 hover:bg-zinc-800">
                            <Settings size={20} />
                        </Button>
                    </div>
                </main>

                {/* Dynamic Sidebar */}
                {showSidebar && (
                    <aside className="w-[350px] border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
                        {showSidebar === "chat" ? (
                            <ChatPanel socket={socket} roomId={roomId as string} />
                        ) : (
                            <ParticipantsPanel />
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
}
