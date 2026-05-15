"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { useRoomStore } from "@/store/useRoomStore";
import { Button } from "@/components/ui/button";
import { LogOut, Mic, MicOff, Video, VideoOff, MonitorUp, Tv2, Users as UsersIcon, MessageSquare, Copy, Check } from "lucide-react";
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
    const [copied, setCopied] = useState(false);

    // UI Toggles
    const [showSidebar, setShowSidebar] = useState<"chat" | "participants" | null>("chat");

    const { setUsers, addUser, removeUser, addMessage, updateUser } = useRoomStore();

    // Start WebRTC connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { localStream, toggleScreenShare, ensureVideoTrack } = useWebRTC(roomId as string, socketId);

    // Refs to hold the latest toggle state so visibility handler reads them
    // without creating new listener registrations on every toggle.
    const isMutedRef = useRef(isMuted);
    const isVideoOnRef = useRef(isVideoOn);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isVideoOnRef.current = isVideoOn; }, [isVideoOn]);

    // ── Visibility-change: re-sync track enabled state ─────────────────
    useEffect(() => {
        const syncTracks = () => {
            if (document.visibilityState !== "visible") return;
            if (!localStream) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, session, status, router]);

    // ── Stabilized toggle handlers (no re-creation on each render) ──────
    const toggleMic = useCallback(() => {
        if (localStream) {
            const newMuted = !isMutedRef.current;
            localStream.getAudioTracks().forEach(track => track.enabled = !newMuted);
            setIsMuted(newMuted);
            if (socketId) updateUser(socketId, { isMuted: newMuted });
            if (socket) socket.emit("toggle-mic", { roomId, userId: socketId, isMuted: newMuted });
        }
    }, [localStream, socketId, socket, roomId, updateUser]);

    const toggleCamera = useCallback(async () => {
        if (!localStream) return;

        const newVideoOn = !isVideoOnRef.current;

        if (newVideoOn) {
            const track = await ensureVideoTrack();
            if (track) {
                track.enabled = true;
            } else {
                console.warn("Could not enable camera — no video track available");
                return;
            }
        } else {
            localStream.getVideoTracks().forEach(track => track.enabled = false);
        }

        setIsVideoOn(newVideoOn);
        if (socketId) updateUser(socketId, { isVideoOn: newVideoOn });
        if (socket) socket.emit("toggle-camera", { roomId, userId: socketId, isVideoOn: newVideoOn });
    }, [localStream, socketId, socket, roomId, updateUser, ensureVideoTrack]);

    const handleScreenShare = useCallback(async () => {
        const targetState = !isScreenSharing;
        const result = await toggleScreenShare(targetState, () => {
            setIsScreenSharing(false);
        });

        if (result === targetState) {
            setIsScreenSharing(result);
        }
    }, [isScreenSharing, toggleScreenShare]);

    const copyRoomId = useCallback(() => {
        navigator.clipboard.writeText(roomId as string);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [roomId]);

    if (status === "loading" || !socket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
                </div>
                <p className="text-sm text-zinc-400 font-medium">Connecting to room...</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
            {/* ── Top Navigation Bar ─────────────────────────────────── */}
            <header className="h-14 border-b border-zinc-800/50 bg-zinc-900/60 backdrop-blur-lg flex items-center justify-between px-5 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <Tv2 className="text-indigo-400" size={22} />
                    <h1 className="text-base font-bold tracking-tight">SyncRoom</h1>
                    <div className="hidden sm:flex items-center ml-2">
                        <button
                            onClick={copyRoomId}
                            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg text-xs font-mono text-zinc-300 transition-all cursor-pointer"
                        >
                            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            {roomId}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-1 tour-topbar-actions">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-9 px-3 gap-1.5 rounded-lg transition-all ${showSidebar === "participants" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                        onClick={() => setShowSidebar(showSidebar === "participants" ? null : "participants")}
                    >
                        <UsersIcon size={16} />
                        <span className="hidden sm:inline text-xs">People</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-9 px-3 gap-1.5 rounded-lg transition-all ${showSidebar === "chat" ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                        onClick={() => setShowSidebar(showSidebar === "chat" ? null : "chat")}
                    >
                        <MessageSquare size={16} />
                        <span className="hidden sm:inline text-xs">Chat</span>
                    </Button>
                    <div className="w-px h-6 bg-zinc-800 mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/dashboard")}
                        className="h-9 px-3 gap-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline text-xs">Leave</span>
                    </Button>
                </div>
            </header>

            {/* ── Main Layout ────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Onboarding Tour */}
                <RoomTour />

                {/* ── Center Canvas ───────────────────────────────────── */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Content Area */}
                    <div className="flex-1 flex flex-col p-4 overflow-y-auto gap-3">
                        {/* Camera Grid */}
                        <CameraGrid currentUserId={socketId} />

                        {/* Video Player */}
                        <div className="flex-1 flex flex-col bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden shadow-xl min-h-[300px] tour-video-player">
                            <VideoPlayer socket={socket} roomId={roomId as string} />
                        </div>
                    </div>

                    {/* ── Bottom Control Bar ──────────────────────────────── */}
                    <div className="h-16 bg-zinc-900/60 backdrop-blur-md border-t border-zinc-800/50 flex items-center justify-center gap-3 px-6 shrink-0 tour-controls">
                        <button
                            onClick={toggleMic}
                            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                                isMuted
                                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                            }`}
                        >
                            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                        <button
                            onClick={toggleCamera}
                            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                                !isVideoOn
                                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                            }`}
                        >
                            {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                        </button>
                        <button
                            onClick={handleScreenShare}
                            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                                isScreenSharing
                                    ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                            }`}
                        >
                            <MonitorUp size={18} />
                        </button>
                    </div>
                </main>

                {/* ── Sidebar ────────────────────────────────────────── */}
                {showSidebar && (
                    <aside className="w-[340px] border-l border-zinc-800/50 bg-zinc-900/40 backdrop-blur-lg flex flex-col shrink-0 z-10 tour-sidebar">
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
