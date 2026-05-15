"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tv2, Users, Video } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl text-center space-y-8"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 p-4 rounded-full">
            <Tv2 size={48} className="text-white" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Watch Together <br className="hidden md:block" /> with <span className="text-indigo-500">SyncRoom</span>
        </h1>

        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Create rooms, invite friends, and watch synchronized videos in real-time. Chat, share your webcam, and enjoy a shared viewing experience.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Button
            size="lg"
            className="w-full sm:w-auto text-lg px-8 py-6 bg-white text-black hover:bg-zinc-200"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 text-left">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <Tv2 className="text-indigo-400 mb-4" size={32} />
            <h3 className="text-lg font-bold mb-2">Perfect Sync</h3>
            <p className="text-zinc-400">Video playback is synchronized down to the millisecond across all participants.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <Users className="text-emerald-400 mb-4" size={32} />
            <h3 className="text-lg font-bold mb-2">Real-Time Chat</h3>
            <p className="text-zinc-400">React instantly with integrated text chat and typing indicators.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <Video className="text-rose-400 mb-4" size={32} />
            <h3 className="text-lg font-bold mb-2">Voice & Video</h3>
            <p className="text-zinc-400">See your friends&apos; reactions with built-in WebRTC camera and microphone streaming.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
