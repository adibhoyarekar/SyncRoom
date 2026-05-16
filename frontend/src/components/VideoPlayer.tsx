"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import YouTube, { YouTubeProps, YouTubePlayer, YouTubeEvent } from "react-youtube";

import { useRoomStore } from "@/store/useRoomStore";
import { Socket } from "socket.io-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Upload, PictureInPicture2, Check, AlertTriangle, Maximize, X } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";

interface VideoPlayerProps {
    socket: Socket;
    roomId: string;
}

export default function VideoPlayer({ socket, roomId }: VideoPlayerProps) {
    const { users } = useRoomStore();
    const isOwner = users.find(u => u.id === socket?.id)?.isOwner ?? false;

    // Debounce isOwner to prevent iframe remounts when socket reconnects
    const [stableIsOwner, setStableIsOwner] = useState(isOwner);

    useEffect(() => {
        if (isOwner !== stableIsOwner) {
            const timeout = setTimeout(() => {
                setStableIsOwner(isOwner);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [isOwner, stableIsOwner]);

    const [url, setUrl] = useState("aqz-KE-bpKQ"); // YouTube Video ID
    const [isVideoType, setIsVideoType] = useState<"youtube" | "local">("youtube");
    const [localVideoUrl, setLocalVideoUrl] = useState("");
    const [inputUrl, setInputUrl] = useState("");
    const ytPlayerRef = useRef<YouTubePlayer | null>(null);
    const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PiP state
    const [isPiP, setIsPiP] = useState(false);

    // Fullscreen & Floating Chat state
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [chatOpacity, setChatOpacity] = useState(0.8);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement && document.fullscreenElement === wrapperRef.current;
            setIsFullscreen(isFs);
            if (isFs) setIsChatVisible(true); // reset visibility when entering fullscreen
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement && wrapperRef.current) {
            await wrapperRef.current.requestFullscreen().catch(console.error);
        } else if (document.fullscreenElement) {
            await document.exitFullscreen().catch(console.error);
        }
    };

    // Global hotkey 'c' for chat toggle in fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFullscreen) return;
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            if (e.key.toLowerCase() === "c") {
                e.preventDefault();
                setIsChatVisible(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen]);

    // Sync status
    const [syncStatus, setSyncStatus] = useState<"synced" | "behind" | "unknown">("unknown");
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const ownerTimeRef = useRef<number | null>(null);
    const lastOwnerUpdateRef = useRef<number>(Date.now());
    const isPlayingRef = useRef<boolean>(false);

    // To prevent infinite loops when receiving socket events that trigger local events
    const isRemoteActionRef = useRef(false);

    useEffect(() => {
        // Sync status tracking (non-owners check against owner's time)
        socket.on("video-play", ({ time }: { time?: number }) => {
            if (typeof time === "number") {
                ownerTimeRef.current = time;
                lastOwnerUpdateRef.current = Date.now();
            }
            isPlayingRef.current = true;
            isRemoteActionRef.current = true;
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                if (typeof time === "number") {
                    ytPlayerRef.current.seekTo(time, true);
                }
                ytPlayerRef.current.playVideo();
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                if (typeof time === "number") {
                    nativeVideoRef.current.currentTime = time;
                }
                nativeVideoRef.current.play();
            }
            setTimeout(() => { isRemoteActionRef.current = false; }, 100);
        });

        socket.on("video-pause", ({ time }: { time?: number }) => {
            if (typeof time === "number") {
                ownerTimeRef.current = time;
                lastOwnerUpdateRef.current = Date.now();
            }
            isPlayingRef.current = false;
            isRemoteActionRef.current = true;
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                ytPlayerRef.current.pauseVideo();
                if (typeof time === "number") {
                    ytPlayerRef.current.seekTo(time, true);
                }
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                nativeVideoRef.current.pause();
                if (typeof time === "number") {
                    nativeVideoRef.current.currentTime = time;
                }
            }
            setTimeout(() => { isRemoteActionRef.current = false; }, 100);
        });

        socket.on("video-seek", ({ time }: { time: number }) => {
            ownerTimeRef.current = time;
            lastOwnerUpdateRef.current = Date.now();
            isRemoteActionRef.current = true;
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                ytPlayerRef.current.seekTo(time, true);
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                nativeVideoRef.current.currentTime = time;
            }
            setTimeout(() => { isRemoteActionRef.current = false; }, 100);
        });

        socket.on("video-url-change", ({ newUrl }: { newUrl: string }) => {
            const videoId = extractYouTubeId(newUrl);
            if (videoId) {
                setIsVideoType("youtube");
                setUrl(videoId);
            }
            setInputUrl("");
        });

        return () => {
            socket.off("video-play");
            socket.off("video-pause");
            socket.off("video-seek");
            socket.off("video-url-change");
        };
    }, [socket, isVideoType]);

    const extractYouTubeId = (urlStr: string) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = urlStr.match(regex);
        return match ? match[1] : null;
    };

    const handlePlay = () => {
            if (!isOwner) return;
            if (isRemoteActionRef.current) return;
            isPlayingRef.current = true;
            const time = isVideoType === "youtube" ? ytPlayerRef.current?.getCurrentTime() : nativeVideoRef.current?.currentTime;
            socket.volatile.emit("video-play", { roomId, time });
        };

    const handlePause = () => {
        if (!isOwner) return;
        if (isRemoteActionRef.current) return;

        // If the browser forces a pause due to tab backgrounding, ignore it 
        // so we don't pause the video for everyone in the room!
        if (document.visibilityState === "hidden") {
            // Attempt to keep it playing locally
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                ytPlayerRef.current.playVideo();
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                nativeVideoRef.current.play().catch(() => {});
            }
            return;
        }

        isPlayingRef.current = false;
        const time = isVideoType === "youtube" ? ytPlayerRef.current?.getCurrentTime() : nativeVideoRef.current?.currentTime;
        socket.volatile.emit("video-pause", { roomId, time });
    };

    const handleSeek = (seconds: number) => {
        if (!isOwner) return;
        if (isRemoteActionRef.current) return;
        socket.volatile.emit("video-seek", { roomId, time: seconds });
    };

    const loadVideo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        const videoId = extractYouTubeId(inputUrl);
        if (videoId) {
            setIsVideoType("youtube");
            setUrl(videoId);
            socket.emit("video-url-change", { roomId, newUrl: inputUrl });
        } else {
            alert("Invalid YouTube URL");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isOwner) return;
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setIsVideoType("local");
            setLocalVideoUrl(objectUrl);
        }
    };

    // ── PiP toggle ──────────────────────────────────────────────────
    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPiP(false);
            } else if (nativeVideoRef.current) {
                await nativeVideoRef.current.requestPictureInPicture();
                setIsPiP(true);
                nativeVideoRef.current.addEventListener("leavepictureinpicture", () => setIsPiP(false), { once: true });
            }
        } catch (err) {
            console.warn("PiP not supported:", err);
        }
    };

    // ── Sync status check (non-owners) ──────────────────────────────
    useEffect(() => {
        if (isOwner) {
            setSyncStatus("synced");
            return;
        }

        syncIntervalRef.current = setInterval(() => {
            if (ownerTimeRef.current === null) {
                setSyncStatus("unknown");
                return;
            }
            let currentTime = 0;
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                currentTime = ytPlayerRef.current.getCurrentTime() || 0;
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                currentTime = nativeVideoRef.current.currentTime || 0;
            }
            
            // Calculate expected owner time based on elapsed wall-clock time
            const elapsedSinceUpdate = isPlayingRef.current ? (Date.now() - lastOwnerUpdateRef.current) / 1000 : 0;
            const expectedOwnerTime = (ownerTimeRef.current || 0) + elapsedSinceUpdate;
            
            const diff = Math.abs(currentTime - expectedOwnerTime);
            setSyncStatus(diff < 2 ? "synced" : "behind");
        }, 3000);

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [isOwner, isVideoType]);

    const opts: YouTubeProps['opts'] = useMemo(() => ({
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0, 
            controls: stableIsOwner ? 1 : 0, // Hide YouTube controls for non-owners
            disablekb: stableIsOwner ? 0 : 1, // Disable keyboard for non-owners
            fs: 0, // Disable native fullscreen so we use our custom wrapper fullscreen
            rel: 0,
        },
    }), [stableIsOwner]);

    return (
        <div className="flex flex-col h-full">
            {/* Top control bar — only visible to owners */}
            {isOwner && (
                <div className="shrink-0 bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex gap-2 items-center">
                <form onSubmit={loadVideo} className="flex-1 flex gap-2">
                    <Input
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="Paste YouTube URL to sync video for whole room..."
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm h-9"
                    />
                    <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 h-9">
                        <Play size={14} className="mr-1.5" /> Play URL
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 shrink-0 h-9"
                    >
                        <Upload size={14} className="mr-1.5" /> Local File
                    </Button>
                    <input
                        type="file"
                        accept="video/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </form>
            </div>
            )}

            {/* Player Wrapper */}
            <div ref={wrapperRef} id="syncroom-video-wrapper" className={`flex-1 w-full bg-black relative flex items-center justify-center tour-video-player ${!isOwner ? 'pointer-events-none' : ''}`}>
                {/* Sync Status Badge */}
                {!isOwner && syncStatus !== "unknown" && (
                    <div className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md pointer-events-auto ${
                        syncStatus === "synced"
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                            : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    }`}>
                        {syncStatus === "synced" ? <><Check size={10} /> In Sync</> : <><AlertTriangle size={10} /> Behind</>}
                    </div>
                )}

                {/* PiP Button (local video only) */}
                {isVideoType === "local" && nativeVideoRef.current && (
                    <button
                        onClick={togglePiP}
                        className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md pointer-events-auto cursor-pointer transition-colors ${
                            isPiP
                                ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                                : "bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60"
                        }`}
                    >
                        <PictureInPicture2 size={12} />
                        {isPiP ? "Exit PiP" : "PiP"}
                    </button>
                )}
                {/* Fullscreen Button */}
                <button
                    onClick={toggleFullscreen}
                    className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 text-white text-[11px] font-medium backdrop-blur-md pointer-events-auto transition-colors shadow-lg"
                >
                    <Maximize size={14} />
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>

                {/* Floating Chat Overlay (Fullscreen Only) */}
                {isFullscreen && isChatVisible && (
                    <div 
                        className="absolute right-4 top-4 bottom-16 w-80 z-50 flex flex-col transition-opacity duration-300 pointer-events-auto"
                        style={{ opacity: chatOpacity }}
                    >
                        {/* Overlay Header with Controls */}
                        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-t-xl px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-300 font-medium">Chat Opacity</span>
                                <input 
                                    type="range" 
                                    min="0.2" max="1" step="0.1"
                                    value={chatOpacity}
                                    onChange={(e) => setChatOpacity(parseFloat(e.target.value))}
                                    className="w-20 accent-indigo-500"
                                />
                            </div>
                            <button 
                                onClick={() => setIsChatVisible(false)}
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 rounded transition-colors"
                                title="Close chat (Press 'c' to reopen)"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {/* Chat Panel Content */}
                        <div className="flex-1 overflow-hidden bg-zinc-950/90 backdrop-blur-md border-x border-b border-zinc-700 rounded-b-xl shadow-2xl flex flex-col">
                            <ChatPanel socket={socket} roomId={roomId} />
                        </div>
                    </div>
                )}

                {isVideoType === "youtube" ? (
                    <YouTube
                        videoId={url}
                        opts={opts}
                        onReady={(e: YouTubeEvent) => ytPlayerRef.current = e.target}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        className="absolute inset-0 w-full h-full pointer-events-auto"
                        iframeClassName="w-full h-full"
                    />
                ) : (
                    <video
                        ref={nativeVideoRef}
                        src={localVideoUrl}
                        controls={isOwner}
                        className="w-full h-full object-contain pointer-events-auto"
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onSeeked={(e) => handleSeek((e.target as HTMLVideoElement).currentTime)}
                    />
                )}
            </div>
        </div>
    );
}
