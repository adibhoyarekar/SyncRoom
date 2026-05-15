"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "😮", "🎉", "💯"];

interface FloatingEmoji {
    id: string;
    emoji: string;
    x: number;
    userName: string;
}

interface EmojiReactionsProps {
    socket: Socket;
    roomId: string;
}

export default function EmojiReactions({ socket, roomId }: EmojiReactionsProps) {
    const { data: session } = useSession();
    const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

    // Listen for incoming emoji reactions
    useEffect(() => {
        const handleReaction = ({ emoji, userName }: { emoji: string; userName: string; senderId: string }) => {
            const id = Math.random().toString(36).substring(2, 9);
            const x = 10 + Math.random() * 80; // random horizontal position (10%-90%)
            setFloatingEmojis(prev => [...prev, { id, emoji, x, userName }]);

            // Remove after animation completes
            setTimeout(() => {
                setFloatingEmojis(prev => prev.filter(e => e.id !== id));
            }, 3000);
        };

        socket.on("emoji-reaction", handleReaction);
        return () => { socket.off("emoji-reaction", handleReaction); };
    }, [socket]);

    const sendReaction = useCallback((emoji: string) => {
        if (!session?.user?.name) return;
        socket.volatile.emit("emoji-reaction", {
            roomId,
            emoji,
            userName: session.user.name,
        });
    }, [socket, roomId, session]);

    return (
        <>
            {/* Floating emojis overlay */}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {floatingEmojis.map((e) => (
                    <div
                        key={e.id}
                        className="absolute animate-float-up"
                        style={{ left: `${e.x}%`, bottom: 80 }}
                    >
                        <div className="flex flex-col items-center">
                            <span className="text-4xl drop-shadow-lg">{e.emoji}</span>
                            <span className="text-[10px] text-white/70 font-medium bg-black/30 rounded-full px-2 py-0.5 mt-0.5 backdrop-blur-sm">
                                {e.userName}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick reaction bar */}
            <div className="flex items-center gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-800 active:scale-90 transition-all text-lg cursor-pointer hover:scale-110"
                        title={`React with ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </>
    );
}
