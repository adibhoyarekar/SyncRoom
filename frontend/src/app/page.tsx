"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ArrowRight, Play, Zap, Users, Video, Search,
    Command, Laptop, Check, Copy, Edit3
} from "lucide-react";

export default function Home() {
    const { status } = useSession();
    const router = useRouter();

    // Sandbox command menu selection
    const [selectedCommand, setSelectedCommand] = useState<string>("sync");
    const [copiedDemo, setCopiedDemo] = useState(false);
    const [keyPressed, setKeyPressed] = useState<string | null>(null);

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard");
        }
    }, [status, router]);

    // Handle physical keyboard shortcuts inside the interactive landing sandbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (["m", "c", "w", "p", "f"].includes(key)) {
                setKeyPressed(key.toUpperCase());
                setTimeout(() => setKeyPressed(null), 1000);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const copyDemoCode = () => {
        navigator.clipboard.writeText("ROOM-77X9");
        setCopiedDemo(true);
        setTimeout(() => setCopiedDemo(false), 2000);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#070709]">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
                </div>
            </div>
        );
    }

    const commandList = [
        {
            id: "sync",
            title: "Millisecond Playback Sync",
            subtitle: "Sub-second real-time timeline correction",
            category: "Core Engine",
            icon: <Zap size={14} className="text-yellow-400" />,
            shortcut: "⏎"
        },
        {
            id: "local",
            title: "Adaptive Reels/Shorts Mode",
            subtitle: "Automatic vertical 9:16 border aspect ratio",
            category: "Media Pipeline",
            icon: <Laptop size={14} className="text-emerald-400" />,
            shortcut: "⌥V"
        },
        {
            id: "whiteboard",
            title: "Synched Vector Whiteboard",
            subtitle: "Co-sketch directly over streaming videos",
            category: "Collaborative Canvas",
            icon: <Edit3 size={14} className="text-indigo-400" />,
            shortcut: "⌘W"
        },
        {
            id: "webrtc",
            title: "Integrated Video Grid & Hand Raise",
            subtitle: "Low-latency camera pipes with host force-mute",
            category: "Realtime Voice",
            icon: <Video size={14} className="text-rose-400" />,
            shortcut: "⌘M"
        },
        {
            id: "queue",
            title: "Dual YouTube Search & Links Queue",
            subtitle: "Endless up-next videos shared instantaneously",
            category: "Media Player",
            icon: <Users size={14} className="text-fuchsia-400" />,
            shortcut: "⌘Q"
        }
    ];

    const commandDetails: Record<string, {
        title: string;
        desc: string;
        pill: string;
        tech: string[];
        highlight: string;
    }> = {
        sync: {
            title: "Engineered Millisecond Synchronization Loop",
            desc: "SyncRoom maintains a persistent real-time socket-directed time sync between the Room Owner and all participants. Every pause, seek, and playback trigger broadcasts to the room socket within 15ms. The system auto-corrects player offset buffers seamlessly without stuttering.",
            pill: "15ms Sync Accuracy",
            tech: ["Socket.IO Engine", "High-Precision HTML5 Media API", "Frame-Offset Interpolation"],
            highlight: "Perfect for movies, live sports, and YouTube playlists, ensuring everyone reacts to identical frames at the exact same split second."
        },
        local: {
            title: "Dynamic Reels & Landscape Orientation Adaptability",
            desc: "Upload local video files directly from your device! If you upload a vertical video (e.g. smartphone recordings, TikToks, or Instagram Reels), our adaptive container morphs into a premium 9:16 smartphone card bezel complete with rounded edges and an ambient backlight glow. Standard videos default to fullscreen landscape.",
            pill: "Responsive Bezel Render",
            tech: ["Aspect-Ratio Detectors", "Bezel Outline Rendering", "Ambient Glowing Dropped Shadows"],
            highlight: "Co-watch vertical reels or cinematic landscape videos interchangeably, styled exactly like high-end native media applications."
        },
        whiteboard: {
            title: "Shared Vector Whiteboard Overlays",
            desc: "Need to highlight something in the video? Open the synchronized whiteboard to draw directly on top of the streaming media! Every pen stroke is converted to high-precision vector points and broadcasted globally. Only owners can clear the board, maintaining robust admin controls.",
            pill: "Zero-Latency Drawings",
            tech: ["HTML5 Vector Canvas", "High-Frequency Stroke Pipes", "Persistent Layer Interpolation"],
            highlight: "Perfect for remote tutoring, sharing screen highlights, mock designs, or simply playing games with friends while watching videos."
        },
        webrtc: {
            title: "Hi-Fi WebRTC Video Conferencing & Hand Raising",
            desc: "Conferencing is fully integrated directly alongside the media canvas. See and hear friends instantly with clean grids. Users can click 'Raise Hand' to trigger custom visual indicators, while room owners retain administrative permissions to force-mute micro-inputs.",
            pill: "WebRTC P2P Media Streams",
            tech: ["PeerJS Real-Time Tunnels", "Automated Hand Raise Overlay", "Host Force-Mute Command"],
            highlight: "Provides a structured, high-end meeting experience where hosts have ultimate control over who talks and when."
        },
        queue: {
            title: "Infinite Video Queue & Widescreen YouTube Search",
            desc: "Add endless YouTube links or search directly inside our dynamically expanding YouTube control panel! When active, the panel transitions gracefully from 340px to 560px, showing large, premium aspect-ratio media cards. Video metadata and channels are immediately synced to all peers.",
            pill: "Widescreen YouTube Control",
            tech: ["YouTube Search V3 API", "Smooth CSS Transit Interpolation", "Queued Playback Sync Pipeline"],
            highlight: "Easily search, queue, and stream YouTube playlists with rich thumbnails, double-wrapped descriptive titles, and interactive add buttons."
        }
    };

    return (
        <div className="min-h-screen bg-[#070709] text-zinc-100 relative overflow-hidden noise selection:bg-indigo-600/40">
            {/* Ambient Background Gradient Orbs */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/5 filter blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-rose-500/5 filter blur-[100px] pointer-events-none" />

            {/* ── Header Navbar ────────────────────────────────────────── */}
            <nav className="relative z-20 flex items-center justify-between px-6 md:px-16 py-6 border-b border-zinc-900 bg-[#070709]/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                        <Play size={16} fill="white" className="ml-0.5" />
                    </div>
                    <div>
                        <span className="text-sm font-bold tracking-wider uppercase text-white leading-none">SyncRoom</span>
                        <span className="text-[9px] block text-zinc-500 tracking-wider font-extrabold uppercase mt-0.5">Premium Sync v2</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <span className="text-xs text-zinc-500 hidden sm:inline font-mono">Status: Production Ready</span>
                    <button
                        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                        className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all duration-300 cursor-pointer active:scale-95 shadow-sm"
                    >
                        Sign In →
                    </button>
                </div>
            </nav>

            {/* ── Hero / About App Section ─────────────────────────────── */}
            <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 md:pt-28 pb-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-4xl"
                >
                    {/* Premium Raycast Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-zinc-800/80 bg-zinc-950/60 text-[11px] font-medium text-zinc-400 mb-6 shadow-inner tracking-wider uppercase">
                        <Command size={12} className="text-indigo-400 animate-pulse" />
                        <span>Raycast Design Language Loaded</span>
                    </div>

                    <h1 className="text-5xl sm:text-7xl md:text-[88px] font-extrabold tracking-tight leading-[0.9] mb-8 text-white">
                        Synchronized media.
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-indigo-400 font-black">
                            Engineered beautifully.
                        </span>
                    </h1>

                    <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
                        SyncRoom is a high-performance web suite designed for real-time video playback co-watching. 
                        Equipped with millisecond timeline sync, integrated low-latency camera streaming, 
                        dynamic local Reels mode, and a shared vector whiteboard.
                    </p>

                    {/* Elite Google Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                        className="inline-flex items-center gap-3 px-8 py-4.5 rounded-2xl bg-white text-black font-extrabold text-sm hover:shadow-[0_0_50px_rgba(99,102,241,0.25)] transition-all duration-300 cursor-pointer border border-zinc-200"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-5 h-5" />
                        Access SyncRoom Dashboard
                        <ArrowRight size={16} strokeWidth={2.5} />
                    </motion.button>
                </motion.div>
            </section>

            {/* ── Interactive Command Menu Sandbox (Raycast Feature Tour) ── */}
            <section className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-8"
                >
                    <h2 className="text-2xl font-bold text-white tracking-tight">Interactive Command Menu</h2>
                    <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                        Click different commands inside our custom command simulator below to review SyncRoom&apos;s features in deep technical depth.
                    </p>
                </motion.div>

                {/* Raycast Shell Container */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 border border-zinc-800/80 bg-zinc-950/60 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative group">
                    
                    {/* Left: Command List Selector */}
                    <div className="md:col-span-5 flex flex-col border-r border-zinc-900/80 pr-4 space-y-1">
                        <div className="flex items-center gap-2.5 px-3 py-2 border-b border-zinc-900 mb-2">
                            <Search size={14} className="text-zinc-500" />
                            <span className="text-[11px] font-mono text-zinc-500 font-bold uppercase tracking-wider">Raycast Shell Panel</span>
                        </div>

                        {commandList.map((cmd) => (
                            <button
                                key={cmd.id}
                                onClick={() => setSelectedCommand(cmd.id)}
                                className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all cursor-pointer text-left ${
                                    selectedCommand === cmd.id 
                                        ? "bg-zinc-900 text-white border border-zinc-800 shadow-md scale-[1.01]" 
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent"
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                        selectedCommand === cmd.id ? "bg-zinc-800" : "bg-zinc-900/50"
                                    }`}>
                                        {cmd.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[11px] font-bold truncate leading-tight">{cmd.title}</h4>
                                        <p className="text-[9px] text-zinc-500 truncate leading-none mt-1">{cmd.subtitle}</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md text-zinc-500 font-bold">
                                    {cmd.shortcut}
                                </span>
                            </button>
                        ))}

                        <div className="pt-4 mt-auto border-t border-zinc-900">
                            {/* Copyable Demo Room */}
                            <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/80">
                                <div>
                                    <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider leading-none">Mock Session</span>
                                    <span className="text-[11px] font-mono text-indigo-300 font-bold">ROOM-77X9</span>
                                </div>
                                <button
                                    onClick={copyDemoCode}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        copiedDemo 
                                            ? "bg-emerald-500/10 text-emerald-400" 
                                            : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                >
                                    {copiedDemo ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy Code</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Technical In-Depth View */}
                    <div className="md:col-span-7 flex flex-col justify-between pl-2 min-h-[350px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedCommand}
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] uppercase font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-bold tracking-wider border border-indigo-500/20">
                                        {commandDetails[selectedCommand].pill}
                                    </span>
                                    <span className="text-[9px] uppercase font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-md font-bold border border-zinc-800">
                                        Raycast Engine
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                                    {commandDetails[selectedCommand].title}
                                </h3>

                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    {commandDetails[selectedCommand].desc}
                                </p>

                                <div className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-2">
                                    <span className="text-[9px] font-bold uppercase text-indigo-300 tracking-wider block">Key Highlights</span>
                                    <p className="text-[11px] text-zinc-400 leading-normal">
                                        {commandDetails[selectedCommand].highlight}
                                    </p>
                                </div>

                                <div className="space-y-1.5 pt-2">
                                    <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider block">System Stack Stack</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {commandDetails[selectedCommand].tech.map((techItem) => (
                                            <span 
                                                key={techItem} 
                                                className="text-[9px] font-mono bg-zinc-900/60 border border-zinc-900 px-2 py-1 rounded-lg text-zinc-350"
                                            >
                                                {techItem}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-4">
                            <span className="text-[10px] text-zinc-500 font-medium">Use up/down arrow buttons on mock list to toggle</span>
                            <button
                                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95"
                            >
                                Launch Sandbox
                            </button>
                        </div>
                    </div>

                </div>
            </section>

            {/* ── Interactive Keyboard Sandbox ───────────────────────── */}
            <section className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                    <div className="text-center mb-6">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest block mb-1">Tactile Control System</span>
                        <h3 className="text-lg font-bold text-white">Interactive Keyboard Shortcuts Simulator</h3>
                        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                            Press these physical keys on your keyboard right now, or click them below to see room commands flash!
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                        {[
                            { key: "M", label: "Toggle Microphone Input" },
                            { key: "C", label: "Toggle Camera Capture" },
                            { key: "W", label: "Open Sync Vector Whiteboard" },
                            { key: "P", label: "Create Immediate Live Poll" },
                            { key: "F", label: "Trigger Video Fullscreen" }
                        ].map((item) => {
                            const isActive = keyPressed === item.key;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        setKeyPressed(item.key);
                                        setTimeout(() => setKeyPressed(null), 1000);
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left min-w-[200px] cursor-pointer ${
                                        isActive 
                                            ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 scale-[1.03] shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                                            : "bg-zinc-900/60 border-zinc-800/50 text-zinc-350 hover:bg-zinc-900"
                                    }`}
                                >
                                    <kbd className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs border transition-all ${
                                        isActive 
                                            ? "bg-indigo-600 border-indigo-400 text-white shadow-md" 
                                            : "bg-zinc-950 border-zinc-800 text-zinc-400"
                                    }`}>
                                        {item.key}
                                    </kbd>
                                    <div>
                                        <span className="text-[10px] uppercase font-extrabold text-zinc-500 block leading-none">Shortcut</span>
                                        <span className="text-[11px] font-bold text-zinc-300 mt-0.5 block leading-tight">{item.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Scroll Reveal Feature Breakdown Sections ─────────────── */}
            <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-16">
                
                {/* Scroll Reveal Section Header */}
                <div className="text-center py-6">
                    <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-black">Under the Hood</span>
                    <h2 className="text-3xl font-extrabold text-white mt-1">Deep-Dive Component Architecture</h2>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                        Each individual pipeline is custom-coded using lightweight Web APIs for premium, hardware-accelerated performance.
                    </p>
                </div>

                {/* Grid of in-depth details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Card 1 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 space-y-4 hover:border-zinc-700/60 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all">
                            <Zap size={18} />
                        </div>
                        <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Engine Synchronization</span>
                            <h3 className="text-lg font-bold text-white mt-0.5">Millisecond Playback Core</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                                Rather than using heavy frames or polling loops, SyncRoom employs high-frequency WebSocket sync events. Play, Pause, and Seek coordinates sync across all connected clients in real-time. If buffers drift, the engine interpolates timelines smoothly to maintain co-watching accuracy without audio jitter.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 2 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 space-y-4 hover:border-zinc-700/60 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                            <Laptop size={18} />
                        </div>
                        <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Media Adaptive Layout</span>
                            <h3 className="text-lg font-bold text-white mt-0.5">Adaptive Vertical & Landscape Sharing</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                                Seamlessly upload local media files directly. The platform detects the resolution of the uploaded video dynamically. Horizontal videos render in clean widescreen aspect ratios, while vertical videos (Reels/Shorts) snap to a custom phone-bezel container with glowing background illumination.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 3 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 space-y-4 hover:border-zinc-700/60 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all">
                            <Edit3 size={18} />
                        </div>
                        <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Collaborative Tools</span>
                            <h3 className="text-lg font-bold text-white mt-0.5">Real-time Collaborative Whiteboard</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                                Draw directly on top of streaming videos in real time. Our canvas vector engine maps every single mark into light coordinates that replicate instantaneously across all peer frames. Clear, erase, and draw toggles are integrated smoothly for ultimate user synergy.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 4 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 25 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 space-y-4 hover:border-zinc-700/60 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-all">
                            <Video size={18} />
                        </div>
                        <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Moderation Controls</span>
                            <h3 className="text-lg font-bold text-white mt-0.5">Administrative Controls & Voice Grid</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                                Experience low-latency WebRTC co-voice grids. Integrated host administration options let the room creator click to lower raised hands globally or execute force-mute actions to maintain absolute meeting order.
                            </p>
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <footer className="relative z-10 border-t border-zinc-900 bg-[#070709] py-12 px-6 text-center">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <Play size={10} fill="white" className="ml-0.5" />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">SyncRoom</span>
                    </div>

                    <p className="text-[10px] text-zinc-600 font-mono">
                        Handcrafted with precision using Next.js 14, WebRTC, Framer Motion, and PeerJS &middot; © {new Date().getFullYear()}
                    </p>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider font-bold"
                        >
                            Open App
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
