import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Settings as SettingsIcon, Keyboard } from "lucide-react";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const { shortcuts, setShortcut } = useSettingsStore();
    const [listeningFor, setListeningFor] = useState<keyof typeof shortcuts | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!listeningFor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Ignore modifiers pressed alone
            if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

            let key = e.key.toLowerCase();
            if (e.code === "Space") key = "space";
            
            setShortcut(listeningFor, key);
            setListeningFor(null);
        };

        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [listeningFor, setShortcut]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md" ref={modalRef}>
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <SettingsIcon size={16} className="text-indigo-400" />
                        </div>
                        Settings
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Customize your keyboard shortcuts. Click a key to change it.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3 flex items-center gap-1.5">
                            <Keyboard size={12} />
                            Keyboard Shortcuts
                        </h4>
                        
                        {(Object.keys(shortcuts) as Array<keyof typeof shortcuts>).map((action) => (
                            <div key={action} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                                <span className="text-sm font-medium capitalize text-zinc-300">
                                    {action === "camera" ? "Toggle Camera" : 
                                     action === "mute" ? "Toggle Microphone" : 
                                     action === "fullscreen" ? "Toggle Fullscreen" : 
                                     action === "whiteboard" ? "Toggle Whiteboard" : 
                                     action === "polls" ? "Toggle Polls & Q&A" : "Toggle Chat"}
                                </span>
                                <button
                                    onClick={() => setListeningFor(action)}
                                    className={`px-3 py-1.5 min-w-[80px] rounded-lg border text-sm font-mono transition-all ${
                                        listeningFor === action
                                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 animate-pulse"
                                            : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                    }`}
                                >
                                    {listeningFor === action ? "Press key..." : shortcuts[action]}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
