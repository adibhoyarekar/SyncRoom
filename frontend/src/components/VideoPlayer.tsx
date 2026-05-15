"use client";

import { useEffect, useState, useRef } from "react";
import YouTube, { YouTubeProps, YouTubePlayer, YouTubeEvent } from "react-youtube";

import { useRoomStore } from "@/store/useRoomStore";
import { Socket } from "socket.io-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Upload, PictureInPicture2, Check, AlertTriangle } from "lucide-react";

interface VideoPlayerProps {
    socket: Socket;
    roomId: string;
}

export default function VideoPlayer({ socket, roomId }: VideoPlayerProps) {
    const { users } = useRoomStore();
    const isOwner = users.find(u => u.id === socket?.id)?.isOwner ?? false;

    const [url, setUrl] = useState("aqz-KE-bpKQ"); // YouTube Video ID
    const [isVideoType, setIsVideoType] = useState<"youtube" | "local">("youtube");
    const [localVideoUrl, setLocalVideoUrl] = useState("");
    const [inputUrl, setInputUrl] = useState("");
    const ytPlayerRef = useRef<YouTubePlayer | null>(null);
    const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PiP state
    const [isPiP, setIsPiP] = useState(false);

    // Sync status
    const [syncStatus, setSyncStatus] = useState<"synced" | "behind" | "unknown">("unknown");
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const ownerTimeRef = useRef<number | null>(null);

    // To prevent infinite loops when receiving socket events that trigger local events
    const isRemoteActionRef = useRef(false);

    useEffect(() => {
        // Sync status tracking (non-owners check against owner's time)
        socket.on("video-play", ({ time }: { time?: number }) => {
            if (typeof time === "number") ownerTimeRef.current = time;
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
            if (typeof time === "number") ownerTimeRef.current = time;
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
        const time = isVideoType === "youtube" ? ytPlayerRef.current?.getCurrentTime() : nativeVideoRef.current?.currentTime;
        socket.volatile.emit("video-play", { roomId, time });
    };

    const handlePause = () => {
        if (!isOwner) return;
        if (isRemoteActionRef.current) return;
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
            const diff = Math.abs(currentTime - (ownerTimeRef.current || 0));
            setSyncStatus(diff < 2 ? "synced" : "behind");
        }, 3000);

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [isOwner, isVideoType]);

    const opts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0, 
            controls: isOwner ? 1 : 0, // Hide YouTube controls for non-owners
            disablekb: isOwner ? 0 : 1, // Disable keyboard for non-owners
            rel: 0,
        },
    };

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
            <div className={`flex-1 w-full bg-black relative flex items-center justify-center tour-video-player ${!isOwner ? 'pointer-events-none' : ''}`}>
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
