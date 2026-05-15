"use client";

import { useRoomStore } from "@/store/useRoomStore";
import { MicOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Renders a <video> element attached to a MediaStream.
 * Handles tab-switch recovery by re-attaching srcObject when the page
 * becomes visible again — but NEVER toggles track.enabled, because
 * that is controlled by the user via the room controls.
 */
function VideoTile({ stream, isLocal }: { stream: MediaStream | undefined; isLocal?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;

        const attach = () => {
            // Re-assign srcObject to force the browser to reconnect
            video.srcObject = stream;
            if (video.paused) {
                video.play().catch(() => {/* autoplay policy — ignore */});
            }
        };

        attach();

        // When the tab comes back to foreground, re-attach the stream.
        // Browsers can disconnect the srcObject or pause the element
        // when the tab is hidden.
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                attach();
            }
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", attach);

        // Also listen for new tracks being added to the stream
        // (e.g. when useWebRTC re-acquires a dead video track)
        const onTrackAdded = () => attach();
        stream.addEventListener("addtrack", onTrackAdded);

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", attach);
            stream.removeEventListener("addtrack", onTrackAdded);
        };
    }, [stream]);

    if (!stream) return null;

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} // Always mute local video to prevent echo
            className="w-full h-full object-cover rounded-xl"
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

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {users.map((user) => {
                const isLocal = user.id === currentUserId;
                const hasActiveVideo = user.isVideoOn && user.stream;

                return (
                    <div
                        key={user.id}
                        className="relative shrink-0 w-64 h-36 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md snap-center flex items-center justify-center group"
                    >
                        {hasActiveVideo ? (
                            <VideoTile stream={user.stream!} isLocal={isLocal} />
                        ) : (
                            <div className="flex flex-col items-center justify-center opacity-50">
                                <Image
                                    src={user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                                    alt={user.name}
                                    width={48}
                                    height={48}
                                    unoptimized
                                    className="rounded-full mb-2"
                                />
                            </div>
                        )}

                        {/* Persistent audio for remote users — always on regardless of video state */}
                        {!isLocal && user.stream && !user.isMuted && (
                            <AudioTile stream={user.stream} />
                        )}

                        {/* Name and Mute Indicator overlay */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                            <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium max-w-[80%] truncate">
                                {user.name} {isLocal && "(You)"}
                            </div>
                            {user.isMuted && (
                                <div className="bg-red-500/80 backdrop-blur-sm p-1 rounded-md">
                                    <MicOff size={14} className="text-white" />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
