"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Camera, RotateCcw, Check, Sparkles, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    email: string;
    defaultName: string;
    defaultImage: string;
    onProfileUpdated: (name: string, image: string) => void;
}

const PRESET_AVATARS = [
    { name: "Neon Cyber", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Felix" },
    { name: "Pixel Hero", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=John" },
    { name: "Adventurer", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sassy" },
    { name: "Avataaar", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
    { name: "Big Smile", url: "https://api.dicebear.com/7.x/big-smile/svg?seed=Leo" }
];

export default function ProfileModal({ 
    open, 
    onOpenChange, 
    email, 
    defaultName, 
    defaultImage, 
    onProfileUpdated 
}: ProfileModalProps) {
    const [name, setName] = useState(defaultName);
    const [imageUrl, setImageUrl] = useState(defaultImage);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state when opened
    useEffect(() => {
        if (open && email) {
            setErrorMsg("");
            setSuccessMsg("");
            
            // Fetch latest from database to populate form
            const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') || "http://localhost:4000";
            fetch(`${apiUrl}/api/users/profile?email=${encodeURIComponent(email)}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("User profile not found");
                })
                .then(data => {
                    setName(data.name || defaultName);
                    setImageUrl(data.image || defaultImage);
                })
                .catch(err => {
                    console.error("Failed to load database profile, using session defaults:", err);
                    setName(defaultName);
                    setImageUrl(defaultImage);
                });
        }
    }, [open, email, defaultName, defaultImage]);

    // Handle Custom File Upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setErrorMsg("Image size exceeds 2MB limit. Please choose a smaller file.");
            return;
        }

        setErrorMsg("");
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                setImageUrl(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    // Save Profile Changes to DB
    const handleSaveChanges = async () => {
        if (!name.trim()) {
            setErrorMsg("Profile name cannot be blank.");
            return;
        }

        setIsSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') || "http://localhost:4000";
            const res = await fetch(`${apiUrl}/api/users/profile/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, name, image: imageUrl })
            });

            if (!res.ok) {
                throw new Error("Server failed to update profile");
            }

            setSuccessMsg("Profile saved successfully!");
            onProfileUpdated(name, imageUrl);
            
            setTimeout(() => {
                onOpenChange(false);
            }, 1000);
        } catch (err) {
            console.error(err);
            setErrorMsg("Could not sync changes to server. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md rounded-3xl shadow-2xl relative overflow-hidden noise">
                {/* Visual Ambient Glows */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/10 blur-[50px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-pink-500/10 blur-[50px] pointer-events-none" />

                <DialogHeader className="relative z-10">
                    <DialogTitle className="text-lg font-black flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                            <User size={15} className="text-white" />
                        </div>
                        Profile Settings
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-xs">
                        Customize your watchroom alias and profile picture.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4 relative z-10">
                    {/* Image / Avatar Display */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-900/60 shadow-inner">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Avatar className="h-20 w-20 border-2 border-indigo-500/30 shadow-lg shadow-indigo-500/5 group-hover:border-indigo-400 transition-colors">
                                <AvatarImage src={imageUrl || ""} />
                                <AvatarFallback className="text-xl font-black bg-zinc-800 text-zinc-300">
                                    {name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={18} className="text-white animate-pulse" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs h-9 cursor-pointer"
                            >
                                <Camera size={13} className="mr-1.5" /> Upload Custom Photo
                            </Button>

                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setImageUrl(defaultImage)}
                                className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs h-9 cursor-pointer"
                            >
                                <RotateCcw size={13} className="mr-1.5" /> Reset to Google Default
                            </Button>
                        </div>
                    </div>

                    {/* Preset Avatars Selectors */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                            <Sparkles size={11} className="text-indigo-400" /> Choose Preset Avatar
                        </span>
                        <div className="flex items-center gap-3 py-1.5 overflow-x-auto justify-start sm:justify-between custom-scrollbar">
                            {PRESET_AVATARS.map((avatar) => {
                                const isSelected = imageUrl === avatar.url;
                                return (
                                    <button
                                        key={avatar.name}
                                        type="button"
                                        onClick={() => setImageUrl(avatar.url)}
                                        className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all relative shrink-0 cursor-pointer ${
                                            isSelected 
                                                ? "border-pink-500 scale-105 shadow-md shadow-pink-500/10" 
                                                : "border-transparent bg-zinc-900 hover:scale-102 hover:border-zinc-800"
                                        }`}
                                        title={avatar.name}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-pink-500/15 flex items-center justify-center">
                                                <Check size={11} className="text-pink-400 bg-zinc-950/80 rounded-full p-0.5" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Name Inputs */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Alias / Watchroom Nickname
                        </span>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your screen name"
                            className="bg-zinc-950 border-zinc-850 text-white rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 text-xs h-11"
                        />
                    </div>

                    {/* Messages Alerts */}
                    {errorMsg && (
                        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400 flex items-start gap-2 animate-pulse">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400 flex items-start gap-2">
                            <Check size={14} className="shrink-0 mt-0.5" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Dialog Footers */}
                    <div className="flex items-center gap-3 border-t border-zinc-900/60 pt-4 mt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 rounded-xl bg-transparent border border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs h-11 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs h-11 rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                            {isSaving ? "Saving Profiles..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
