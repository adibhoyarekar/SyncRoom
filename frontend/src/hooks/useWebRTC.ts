"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Peer, { MediaConnection } from "peerjs";
import { useRoomStore } from "@/store/useRoomStore";

export function useWebRTC(roomId: string, userId: string) {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<{ [id: string]: MediaStream }>({});

    const { users, updateUser } = useRoomStore();
    const callsRef = useRef<{ [id: string]: MediaConnection }>({});
    const localStreamRef = useRef<MediaStream | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    // Update global store with local stream when it changes
    useEffect(() => {
        if (localStream && userId) {
            updateUser(userId, { stream: localStream });
        }
    }, [localStream, userId, updateUser]);

    /**
     * Ensures the video track on the local stream is alive.
     * If the browser killed/ended the track (e.g. tab switch), this re-acquires
     * a fresh video track and hot-swaps it into every active peer connection.
     */
    const ensureVideoTrack = useCallback(async (): Promise<MediaStreamTrack | null> => {
        const stream = localStreamRef.current;
        if (!stream) return null;

        const existing = stream.getVideoTracks()[0];

        // Track is still live — nothing to do
        if (existing && existing.readyState === "live") {
            return existing;
        }

        // Track is ended or missing — re-acquire from camera
        try {
            const freshStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const freshTrack = freshStream.getVideoTracks()[0];

            // Remove the dead track
            if (existing) {
                stream.removeTrack(existing);
                try { existing.stop(); } catch { /* already stopped */ }
            }

            // Inject new track into the existing MediaStream object so every
            // <video> element that references it picks it up automatically.
            stream.addTrack(freshTrack);

            // Hot-swap in every active PeerJS connection
            Object.values(callsRef.current).forEach((call) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sender = (call as any).peerConnection
                    ?.getSenders()
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ?.find((s: any) => s.track?.kind === "video");
                if (sender) sender.replaceTrack(freshTrack);
            });

            // Bump state so React re-renders with the updated stream
            setLocalStream(stream);

            return freshTrack;
        } catch (err) {
            console.error("Failed to re-acquire video track:", err);
            return null;
        }
    }, []);

    // ── Visibility-change recovery ──────────────────────────────────────
    // When the user switches back to this tab, check if the browser killed
    // the camera track and transparently re-acquire it.
    useEffect(() => {
        const handleVisibility = async () => {
            if (document.visibilityState !== "visible") return;
            const stream = localStreamRef.current;
            if (!stream) return;

            const vTrack = stream.getVideoTracks()[0];
            // Only recover if the track was enabled (user had camera ON)
            if (vTrack && vTrack.readyState === "ended") {
                const wasEnabled = vTrack.enabled;
                const fresh = await ensureVideoTrack();
                if (fresh) fresh.enabled = wasEnabled;
            }

            const aTrack = stream.getAudioTracks()[0];
            if (aTrack && aTrack.readyState === "ended") {
                // Re-acquire audio track too
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const freshAudio = audioStream.getAudioTracks()[0];
                    const wasEnabled = aTrack.enabled;
                    stream.removeTrack(aTrack);
                    try { aTrack.stop(); } catch { /* */ }
                    stream.addTrack(freshAudio);
                    freshAudio.enabled = wasEnabled;

                    Object.values(callsRef.current).forEach((call) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const sender = (call as any).peerConnection
                            ?.getSenders()
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ?.find((s: any) => s.track?.kind === "audio");
                        if (sender) sender.replaceTrack(freshAudio);
                    });

                    setLocalStream(stream);
                } catch { /* best effort */ }
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleVisibility);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleVisibility);
        };
    }, [ensureVideoTrack]);

    // ── PeerJS + getUserMedia initialisation ────────────────────────────
    useEffect(() => {
        if (!userId) return;

        const newPeer = new Peer(userId, {
            host: process.env.NEXT_PUBLIC_PEER_HOST || "localhost",
            port: parseInt(process.env.NEXT_PUBLIC_PEER_PORT || "4000"),
            path: "/peerjs/myapp",
        });

        setPeer(newPeer);

        const setupCallHandler = (stream: MediaStream) => {
            newPeer.on("call", (call: MediaConnection) => {
                call.answer(stream);
                call.on("stream", (userVideoStream: MediaStream) => {
                    setRemoteStreams((prev) => ({
                        ...prev,
                        [call.peer]: userVideoStream,
                    }));
                    updateUser(call.peer, { stream: userVideoStream });
                });
                callsRef.current[call.peer] = call;
            });
        };

        // Request both audio + video upfront so PeerJS has tracks to share.
        // Video track is disabled by default — user toggles it on explicitly.
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                stream.getVideoTracks().forEach(t => t.enabled = false);
                setLocalStream(stream);
                localStreamRef.current = stream;
                setupCallHandler(stream);
            })
            .catch((err) => {
                console.warn("getUserMedia (video+audio) failed, trying audio-only:", err);
                // Fallback: audio-only so the user can still participate
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((audioStream) => {
                        setLocalStream(audioStream);
                        localStreamRef.current = audioStream;
                        setupCallHandler(audioStream);
                    })
                    .catch((audioErr) => {
                        console.error("getUserMedia (audio-only) also failed:", audioErr);
                    });
            });

        return () => {
            newPeer.destroy();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, roomId]);

    // Call new users when they join
    useEffect(() => {
        if (!peer || !localStream) return;

        users.forEach((user) => {
            if (user.id !== userId && !callsRef.current[user.id]) {
                const call = peer.call(user.id, localStream);
                if (call) {
                    call.on("stream", (userVideoStream: MediaStream) => {
                        setRemoteStreams((prev) => ({
                            ...prev,
                            [user.id]: userVideoStream,
                        }));
                        updateUser(user.id, { stream: userVideoStream });
                    });
                    callsRef.current[user.id] = call;
                }
            }
        });
    }, [users, peer, localStream, userId, updateUser]);

    const toggleScreenShare = async (isSharing: boolean, onStop?: () => void) => {
        const stream = localStreamRef.current;
        if (!stream) return false;

        if (isSharing) {
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                const screenVideoTrack = displayStream.getVideoTracks()[0];

                Object.values(callsRef.current).forEach((call) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sender = (call as any).peerConnection?.getSenders().find((s: any) => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(screenVideoTrack);
                });

                const localVideoTrack = stream.getVideoTracks()[0];
                if (localVideoTrack) {
                    stream.removeTrack(localVideoTrack);
                    localVideoTrack.stop();
                }
                stream.addTrack(screenVideoTrack);

                screenVideoTrack.onended = () => {
                    toggleScreenShare(false);
                    if (onStop) onStop();
                };

                return true;
            } catch (error) {
                console.error("Screen sharing error:", error);
                return false;
            }
        } else {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const cameraVideoTrack = cameraStream.getVideoTracks()[0];

                Object.values(callsRef.current).forEach((call) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sender = (call as any).peerConnection?.getSenders().find((s: any) => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(cameraVideoTrack);
                });

                const oldTrack = stream.getVideoTracks()[0];
                if (oldTrack) {
                    stream.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                stream.addTrack(cameraVideoTrack);

                return false;
            } catch (error) {
                console.error("Camera restore error:", error);
                return false;
            }
        }
    };

    return { localStream, remoteStreams, toggleScreenShare, ensureVideoTrack };
}
