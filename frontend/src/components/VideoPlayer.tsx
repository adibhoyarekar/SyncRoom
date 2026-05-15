"use client";

import { useEffect, useState, useRef } from "react";
import YouTube, { YouTubeProps, YouTubePlayer, YouTubeEvent } from "react-youtube";

import { useRoomStore } from "@/store/useRoomStore";
import { Socket } from "socket.io-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Upload } from "lucide-react";

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

    // To prevent infinite loops when receiving socket events that trigger local events
    const isRemoteActionRef = useRef(false);

    useEffect(() => {
        socket.on("video-play", ({ time }: { time?: number }) => {
            isRemoteActionRef.current = true;
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                if (typeof time === "number" && Math.abs(ytPlayerRef.current.getCurrentTime() - time) > 2) {
                    ytPlayerRef.current.seekTo(time, true);
                }
                ytPlayerRef.current.playVideo();
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                if (typeof time === "number" && Math.abs(nativeVideoRef.current.currentTime - time) > 2) {
                    nativeVideoRef.current.currentTime = time;
                }
                nativeVideoRef.current.play();
            }
            setTimeout(() => { isRemoteActionRef.current = false; }, 500);
        });

        socket.on("video-pause", ({ time }: { time?: number }) => {
            isRemoteActionRef.current = true;
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                if (typeof time === "number" && Math.abs(ytPlayerRef.current.getCurrentTime() - time) > 2) {
                    ytPlayerRef.current.seekTo(time, true);
                }
                ytPlayerRef.current.pauseVideo();
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                if (typeof time === "number" && Math.abs(nativeVideoRef.current.currentTime - time) > 2) {
                    nativeVideoRef.current.currentTime = time;
                }
                nativeVideoRef.current.pause();
            }
            setTimeout(() => { isRemoteActionRef.current = false; }, 500);
        });

        socket.on("video-seek", ({ time }: { time: number }) => {
            isRemoteActionRef.current = true;
            if (isVideoType === "youtube" && ytPlayerRef.current) {
                ytPlayerRef.current.seekTo(time, true);
            } else if (isVideoType === "local" && nativeVideoRef.current) {
                nativeVideoRef.current.currentTime = time;
            }
            setTimeout(() => { isRemoteActionRef.current = false; }, 500);
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
        if (!isOwner) {
            // Revert state if not owner
            if (isVideoType === "youtube" && ytPlayerRef.current) ytPlayerRef.current.pauseVideo();
            else if (nativeVideoRef.current) nativeVideoRef.current.pause();
            return;
        }
        if (isRemoteActionRef.current) return;
        const time = isVideoType === "youtube" ? ytPlayerRef.current?.getCurrentTime() : nativeVideoRef.current?.currentTime;
        socket.emit("video-play", { roomId, time });
    };

    const handlePause = () => {
        if (!isOwner) {
            if (isVideoType === "youtube" && ytPlayerRef.current) ytPlayerRef.current.playVideo();
            else if (nativeVideoRef.current) nativeVideoRef.current.play();
            return;
        }
        if (isRemoteActionRef.current) return;
        const time = isVideoType === "youtube" ? ytPlayerRef.current?.getCurrentTime() : nativeVideoRef.current?.currentTime;
        socket.emit("video-pause", { roomId, time });
    };

    const handleSeek = (seconds: number) => {
        if (!isOwner) return;
        if (isRemoteActionRef.current) return;
        socket.emit("video-seek", { roomId, time: seconds });
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
            <div className="flex-1 w-full bg-black relative flex items-center justify-center">
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
                        controls
                        className="w-full h-full object-contain"
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onSeeked={(e) => handleSeek((e.target as HTMLVideoElement).currentTime)}
                    />
                )}
            </div>
        </div>
    );
}
