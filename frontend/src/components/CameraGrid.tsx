"use client";

import { useRoomStore } from "@/store/useRoomStore";
import { MicOff, VideoOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Renders a <video> element attached to a MediaStream.
 * The video element is ALWAYS mounted — we toggle visibility via CSS
 * instead of unmounting/remounting, which eliminates the flickering.
 */
function VideoTile({ stream, isLocal, isVideoOn }: { stream: MediaStream | undefined; isLocal?: boolean; isVideoOn?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;

        const attach = () => {
            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }
            if (video.paused) {
                video.play().catch(() => {/* autoplay policy — ignore */});
            }
        };

        attach();

        const onVisible = () => {
            if (document.visibilityState === "visible") attach();
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", attach);

        const onTrackAdded = () => attach();
        stream.addEventListener("addtrack", onTrackAdded);

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", attach);
            stream.removeEventListener("addtrack", onTrackAdded);
        };
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoOn && stream ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />
    );
}

// Separate persistent audio element for remote users' audio
function AudioTile({ stream }: { stream: MediaStream }) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !stream) return;

        const attachAudio = () => {
            audio.srcObject = stream;
            if (audio.paused) {
                audio.play().catch(() => {/* autoplay policy */});
            }
        };

        attachAudio();

        const onVisible = () => {
            if (document.visibilityState === "visible") attachAudio();
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", attachAudio);

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", attachAudio);
        };
    }, [stream]);

    return <audio ref={audioRef} autoPlay />;
}

export default function CameraGrid({ currentUserId }: { currentUserId: string }) {
    const { users } = useRoomStore();

    if (users.length === 0) return null;

    // Determine grid layout class based on number of users
    const gridClass = users.length <= 2
        ? "grid-cols-1 sm:grid-cols-2"
        : users.length <= 4
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3";

    return (
        <div className={`grid ${gridClass} gap-3 mb-3`}>
            {users.map((user) => {
                const isLocal = user.id === currentUserId;
                const showVideo = user.isVideoOn && user.stream;

                return (
                    <div
                        key={user.id}
                        className="relative aspect-video bg-zinc-900/80 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center group"
                    >
                        {/* Always-mounted video element — shown/hidden via opacity */}
                        {user.stream && (
                            <VideoTile stream={user.stream} isLocal={isLocal} isVideoOn={user.isVideoOn} />
                        )}

                        {/* Avatar fallback — shown when video is off */}
                        <div className={`flex flex-col items-center justify-center transition-opacity duration-300 ${showVideo ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700/50 flex items-center justify-center overflow-hidden shadow-inner">
                                <Image
                                    src={user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                                    alt={user.name}
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="text-xs text-zinc-500 mt-2 font-medium">{user.name}</span>
                        </div>

                        {/* Persistent audio for remote users */}
                        {!isLocal && user.stream && !user.isMuted && (
                            <AudioTile stream={user.stream} />
                        )}

                        {/* Bottom overlay bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2.5 flex items-end justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-white/90 truncate max-w-[120px]">
                                    {user.name} {isLocal && <span className="text-indigo-400">(You)</span>}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {user.isMuted && (
                                    <div className="bg-red-500/80 p-1 rounded-md">
                                        <MicOff size={12} className="text-white" />
                                    </div>
                                )}
                                {!user.isVideoOn && (
                                    <div className="bg-zinc-700/80 p-1 rounded-md">
                                        <VideoOff size={12} className="text-zinc-300" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
