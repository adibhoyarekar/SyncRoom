"use client";

import { useEffect, useRef, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import RoomTour from "@/components/RoomTour";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function RoomPage() {
    const { roomId } = useParams();
    const { data: session, status } = useSession();
    const router = useRouter();
    const { toast } = useToast();
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

    // Refs to hold the latest toggle state so visibility handler can read
    // them without creating new listener registrations on every toggle.
    const isMutedRef = useRef(isMuted);
    const isVideoOnRef = useRef(isVideoOn);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isVideoOnRef.current = isVideoOn; }, [isVideoOn]);

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
                    t.enabled = !isMutedRef.current;
                });
                localStream.getVideoTracks().forEach(t => {
                    t.enabled = isVideoOnRef.current;
                });
            }, 300);
        };

        document.addEventListener("visibilitychange", syncTracks);
        window.addEventListener("focus", syncTracks);
        return () => {
            document.removeEventListener("visibilitychange", syncTracks);
            window.removeEventListener("focus", syncTracks);
        };
    }, [localStream]);

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

        newSocket.on("kicked", () => {
            alert("You have been kicked from the room by the owner.");
            router.push("/dashboard");
        });

        newSocket.on("force-mute", () => {
            setIsMuted(true);
            if (localStream) {
                localStream.getAudioTracks().forEach(track => track.enabled = false);
            }
            if (newSocket.id) updateUser(newSocket.id, { isMuted: true });
            toast({
                title: "Force Muted",
                description: "The room owner has muted your microphone.",
                variant: "destructive",
            });
        });

        newSocket.on("owner-status-update", ({ socketId, isOwner, isPrimaryOwner }: { socketId: string, isOwner: boolean, isPrimaryOwner: boolean }) => {
            updateUser(socketId, { isOwner, isPrimaryOwner });
            if (socketId === newSocket.id) {
                toast({
                    title: "Owner Access Granted",
                    description: "You now have owner privileges in this room.",
                });
            }
        });

        newSocket.on("owner-request", ({ socketId, userName }: { socketId: string, userName: string }) => {
            toast({
                title: "Owner Access Request",
                description: `${userName} is requesting owner access.`,
                action: (
                    <ToastAction altText="Accept" onClick={() => newSocket.emit("accept-owner-request", { roomId, targetSocketId: socketId })}>
                        Accept
                    </ToastAction>
                ),
            });
        });

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, session, status, router, addMessage, addUser, removeUser, setUsers, updateUser, localStream, toast]);

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
        if (!localStream) return;

        const newVideoOn = !isVideoOn;

        if (newVideoOn) {
            // User wants camera ON — make sure the video track is alive
            const track = await ensureVideoTrack();
            if (track) {
                track.enabled = true;
            } else {
                // Could not get a video track — don't toggle the UI
                console.warn("Could not enable camera — no video track available");
                return;
            }
        } else {
            // User wants camera OFF — just disable the track (don't stop it,
            // so re-enabling is instant without re-acquiring from hardware)
            localStream.getVideoTracks().forEach(track => track.enabled = false);
        }

        setIsVideoOn(newVideoOn);
        if (socketId) updateUser(socketId, { isVideoOn: newVideoOn, stream: localStream });
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
        <div className="h-screen flex flex-col mesh-bg text-white overflow-hidden">
            {/* Top Navbar */}
            <header className="h-16 border-b border-zinc-800/50 bg-zinc-950/40 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 shadow-sm z-10 relative">
                <div className="flex items-center gap-2">
                    <Tv2 className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" size={24} />
                    <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">SyncRoom</h1>
                    <div className="ml-4 px-3 py-1 bg-zinc-900/60 border border-zinc-800 rounded-full text-xs font-mono text-zinc-300 backdrop-blur-md shadow-inner">
                        Room: {roomId}
                    </div>
                </div>
                <div className="flex items-center gap-2 tour-topbar-actions">
                    <Button variant="ghost" size="icon" className="hover:bg-zinc-800/50 transition-colors" onClick={() => setShowSidebar(showSidebar === "participants" ? null : "participants")}>
                        <UsersIcon size={20} className={showSidebar === "participants" ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "text-zinc-400"} />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:bg-zinc-800/50 transition-colors" onClick={() => setShowSidebar(showSidebar === "chat" ? null : "chat")}>
                        <MessageSquare size={20} className={showSidebar === "chat" ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "text-zinc-400"} />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => router.push("/dashboard")} className="ml-2 bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md shadow-lg border border-red-500/50">
                        <LogOut size={16} className="mr-2" />
                        Leave
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex flex-1 overflow-hidden relative z-0">
                {/* Onboarding Tour */}
                <RoomTour />

                {/* Center Canvas */}
                <main className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto z-10">
                    {/* Camera Grid above video */}
                    <CameraGrid currentUserId={socketId} />

                    <div className="flex-1 flex flex-col bg-zinc-950/60 backdrop-blur-sm rounded-2xl border border-zinc-800/60 overflow-hidden shadow-2xl relative mt-2 tour-video-player ring-1 ring-white/5 transition-all">
                        <VideoPlayer socket={socket} roomId={roomId as string} />
                    </div>

                    {/* Bottom Controls */}
                    <div className="h-20 mt-4 bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/60 rounded-2xl flex items-center justify-center gap-4 px-6 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] tour-controls ring-1 ring-white/5">
                        <Button
                            variant={isMuted ? "destructive" : "secondary"}
                            size="icon"
                            onClick={toggleMic}
                            className={`h-12 w-12 rounded-full shadow-lg transition-all ${!isMuted ? "bg-zinc-800/80 hover:bg-zinc-700 hover:scale-105" : "bg-red-500/90 hover:bg-red-500 hover:scale-105"}`}
                        >
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </Button>
                        <Button
                            variant={isVideoOn ? "secondary" : "destructive"}
                            size="icon"
                            onClick={toggleCamera}
                            className={`h-12 w-12 rounded-full shadow-lg transition-all ${isVideoOn ? "bg-zinc-800/80 hover:bg-zinc-700 hover:scale-105" : "bg-red-500/90 hover:bg-red-500 hover:scale-105"}`}
                        >
                            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
                        </Button>
                        <Button
                            variant={isScreenSharing ? "secondary" : "outline"}
                            size="icon"
                            onClick={handleScreenShare}
                            className={`h-12 w-12 rounded-full shadow-lg transition-all border-zinc-700/50 hover:scale-105 ${isScreenSharing ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-zinc-900/50 hover:bg-zinc-800/80'}`}
                        >
                            <MonitorUp size={20} className={isScreenSharing ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "text-zinc-300"} />
                        </Button>
                        <div className="w-px h-8 bg-zinc-800/80 mx-2" />
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-300 shadow-lg transition-all hover:scale-105">
                            <Settings size={20} />
                        </Button>
                    </div>
                </main>

                {/* Dynamic Sidebar */}
                {showSidebar && (
                    <aside className="w-[350px] border-l border-zinc-800/50 bg-zinc-950/40 backdrop-blur-2xl flex flex-col shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20 tour-sidebar relative">
                        {showSidebar === "chat" ? (
                            <ChatPanel socket={socket} roomId={roomId as string} />
                        ) : (
                            <ParticipantsPanel socket={socket} roomId={roomId as string} />
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
}
