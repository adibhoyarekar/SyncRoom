"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, MessageCircle, Shield, Zap, Users, Video } from "lucide-react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white relative overflow-hidden noise">
      {/* Floating gradient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Play size={14} fill="white" className="ml-0.5" />
          </div>
          <span className="text-lg font-bold tracking-tight">SyncRoom</span>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          Sign in →
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 md:pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Now with Owner Controls & Live Video
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6">
            Watch together,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              feel together.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Synchronized video playback with live voice, video, and chat.
            Create a room, share the code, and you&apos;re in.
          </p>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold text-base hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all duration-300 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      {/* ── Glow Divider ─────────────────────────────────────────── */}
      <div className="glow-line mx-auto max-w-5xl relative z-10" />

      {/* ── Features Grid ────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to watch together</h2>
          <p className="text-zinc-500 max-w-lg mx-auto">No downloads, no plugins. Just create a room and invite your friends.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: <Zap size={20} />,
              title: "Millisecond Sync",
              desc: "Video playback synchronized in real-time across every participant.",
              gradient: "from-amber-500/10 to-orange-500/10",
              iconColor: "text-amber-400",
              borderColor: "hover:border-amber-500/20"
            },
            {
              icon: <MessageCircle size={20} />,
              title: "Live Chat & Emojis",
              desc: "React in real-time with full emoji picker and typing indicators.",
              gradient: "from-emerald-500/10 to-teal-500/10",
              iconColor: "text-emerald-400",
              borderColor: "hover:border-emerald-500/20"
            },
            {
              icon: <Video size={20} />,
              title: "Voice & Video",
              desc: "See reactions with built-in WebRTC camera and microphone streaming.",
              gradient: "from-rose-500/10 to-pink-500/10",
              iconColor: "text-rose-400",
              borderColor: "hover:border-rose-500/20"
            },
            {
              icon: <Shield size={20} />,
              title: "Owner Controls",
              desc: "Room owners manage playback, kick users, and grant permissions.",
              gradient: "from-indigo-500/10 to-violet-500/10",
              iconColor: "text-indigo-400",
              borderColor: "hover:border-indigo-500/20"
            },
            {
              icon: <Users size={20} />,
              title: "Unlimited Rooms",
              desc: "Create as many rooms as you want. Each one gets a unique invite code.",
              gradient: "from-cyan-500/10 to-sky-500/10",
              iconColor: "text-cyan-400",
              borderColor: "hover:border-cyan-500/20"
            },
            {
              icon: <Play size={20} />,
              title: "YouTube & Local Files",
              desc: "Paste a YouTube link or upload a local video file — both work seamlessly.",
              gradient: "from-fuchsia-500/10 to-purple-500/10",
              iconColor: "text-fuchsia-400",
              borderColor: "hover:border-fuchsia-500/20"
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`group glass rounded-2xl p-6 ${f.borderColor} transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center ${f.iconColor} mb-4`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-zinc-800/50 py-8 text-center">
        <p className="text-xs text-zinc-600">
          Built with Next.js, Socket.IO, and PeerJS &middot; SyncRoom © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
