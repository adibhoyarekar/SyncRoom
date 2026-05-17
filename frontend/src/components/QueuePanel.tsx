/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Socket } from "socket.io-client";
import { useRoomStore } from "@/store/useRoomStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    ListVideo, Plus, Trash2, Play, X, Film, Search, Key, Sparkles
} from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";

interface SearchResultSnippet {
    title: string;
    channelTitle: string;
    thumbnails: {
        medium?: { url: string };
        default?: { url: string };
    };
}

interface SearchResultItem {
    id: {
        videoId: string;
    };
    snippet: SearchResultSnippet;
}

interface QueuePanelProps {
    socket: Socket;
    roomId: string;
    onClose?: () => void;
}

export default function QueuePanel({ socket, roomId, onClose }: QueuePanelProps) {
    const { videoQueue, users } = useRoomStore();
    const { youtubeApiKey, setYoutubeApiKey } = useSettingsStore();

    const [inputUrl, setInputUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Search Tab states
    const [activeTab, setActiveTab] = useState<"link" | "search">("link");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [serverHasNoKey, setServerHasNoKey] = useState(false);

    const localUser = users.find(u => u.id === socket.id);
    const isOwner = localUser?.isOwner ?? false;

    const extractYouTubeId = (urlStr: string) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = urlStr.match(regex);
        return match ? match[1] : null;
    };

    const handleAddToQueue = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        // Split by newlines, commas, or spaces to support batch pasting of unlimited links
        const urls = inputUrl.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u !== "");
        if (urls.length === 0) return;

        setIsLoading(true);
        let addedCount = 0;
        
        for (const url of urls) {
            const videoId = extractYouTubeId(url);
            if (videoId) {
                let title = "YouTube Video";
                let channelName = "YouTube Creator";
                try {
                    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data) {
                            if (data.title) title = data.title;
                            if (data.author_name) channelName = data.author_name;
                        }
                    }
                } catch (err) {
                    console.warn("Could not fetch details:", err);
                }

                const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

                socket.emit("add-to-queue", {
                    roomId,
                    videoInfo: {
                        url,
                        title,
                        thumbnail,
                        addedBy: localUser?.name || "Guest",
                        channelName
                    }
                });
                addedCount++;
            }
        }

        setIsLoading(false);
        if (addedCount > 0) {
            setInputUrl("");
        } else {
            alert("Please paste one or more valid YouTube URLs.");
        }
    };

    const handlePlayQueueItem = (index: number) => {
        if (!isOwner) return;
        const item = videoQueue[index];
        if (!item) return;

        const url = typeof item === "string" ? item : item.url;
        const videoId = extractYouTubeId(url);
        if (videoId) {
            socket.emit("video-url-change", { roomId, newUrl: url });
            socket.emit("remove-from-queue", { roomId, index });
        }
    };

    const handleRemoveFromQueue = (index: number) => {
        if (!isOwner) return;
        socket.emit("remove-from-queue", { roomId, index });
    };

    // YouTube Search Handlers
    const handleSaveApiKey = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKeyInput.trim()) return;
        setYoutubeApiKey(apiKeyInput.trim());
        setApiKeyInput("");
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') || "http://localhost:4000";

        try {
            // 1. Try secure backend proxy search first
            const res = await fetch(`${apiUrl}/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);

            if (res.ok) {
                const data = await res.json();
                if (data && data.items) {
                    setSearchResults(data.items);
                    setServerHasNoKey(false);
                    setIsSearching(false);
                    return;
                }
            }

            // If backend returned 404 (indicates server has no API key configured)
            if (res.status === 404) {
                setServerHasNoKey(true);

                // 2. Try direct client-side fallback using local key if available
                if (youtubeApiKey) {
                    const localRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(
                            searchQuery
                        )}&type=video&key=${youtubeApiKey}`
                    );
                    if (localRes.ok) {
                        const data = await localRes.json();
                        if (data && data.items) {
                            setSearchResults(data.items);
                            setIsSearching(false);
                            return;
                        }
                    } else {
                        const errData = await localRes.json();
                        alert(`Search failed: ${errData?.error?.message || "Check your API key"}`);
                    }
                }
            } else {
                const errData = await res.json();
                alert(`Search failed: ${errData?.error?.message || "An error occurred"}`);
            }
        } catch (err) {
            console.warn("Backend search failed or offline, trying client-side fallback:", err);

            // 3. Network fallback to client-side direct search if local key is available
            if (youtubeApiKey) {
                try {
                    const localRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(
                            searchQuery
                        )}&type=video&key=${youtubeApiKey}`
                    );
                    if (localRes.ok) {
                        const data = await localRes.json();
                        if (data && data.items) {
                            setSearchResults(data.items);
                            return;
                        }
                    }
                } catch (localErr) {
                    console.error("Local search error:", localErr);
                }
            }
            alert("An error occurred during search. Please check your network connection.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddSearchResultToQueue = (item: SearchResultItem) => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const thumbnail = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        const channelName = item.snippet.channelTitle || "YouTube Creator";
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        socket.emit("add-to-queue", {
            roomId,
            videoInfo: {
                url,
                title,
                thumbnail,
                addedBy: localUser?.name || "Guest",
                channelName
            }
        });
    };

    const handlePlaySearchResult = (item: SearchResultItem) => {
        if (!isOwner) return;
        const videoId = item.id.videoId;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        socket.emit("video-url-change", { roomId, newUrl: url });
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950/80 backdrop-blur-md text-white border-l border-zinc-800/40">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <ListVideo size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-100 leading-none">Up Next</h3>
                        <span className="text-[10px] text-zinc-500 font-medium">Room Media Queue</span>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Premium Tab Toggles */}
            <div className="shrink-0 px-4 pt-3 pb-1 flex border-b border-zinc-800/60 bg-zinc-900/5 gap-2">
                <button
                    onClick={() => setActiveTab("link")}
                    className={`pb-2 px-2 text-xs font-bold transition-all relative border-b-2 ${
                        activeTab === "link"
                            ? "text-indigo-400 border-indigo-500"
                            : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                >
                    Paste Link
                </button>
                <button
                    onClick={() => setActiveTab("search")}
                    className={`pb-2 px-2 text-xs font-bold transition-all relative border-b-2 flex items-center gap-1.5 ${
                        activeTab === "search"
                            ? "text-indigo-400 border-indigo-500"
                            : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                >
                    <Search size={12} />
                    Search YouTube
                </button>
            </div>

            {/* Dynamic Controls based on Tab */}
            {activeTab === "link" ? (
                /* Input Form Box for pasting links directly inside the sidebar */
                <div className="shrink-0 p-4 border-b border-zinc-800/60 bg-zinc-900/10">
                    <form onSubmit={handleAddToQueue} className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Paste YouTube Link(s)</label>
                        <div className="flex gap-2">
                            <Input
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                placeholder="Paste url(s) (spaces or enters)..."
                                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-650 text-xs h-9 flex-1"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 h-9 px-3 text-xs gap-1 cursor-pointer"
                                disabled={isLoading}
                            >
                                <Plus size={14} /> Add
                            </Button>
                        </div>
                        <span className="text-[9px] text-zinc-600 block leading-tight">
                            Press Enter or click Add to queue. You can paste multiple links separated by spaces or newlines.
                        </span>
                    </form>
                </div>
            ) : (
                /* Search Tab Controls */
                <div className="shrink-0 p-4 border-b border-zinc-800/60 bg-zinc-900/10">
                    {serverHasNoKey && !youtubeApiKey ? (
                        /* API Key Entry Box */
                        <form onSubmit={handleSaveApiKey} className="space-y-3">
                            <div className="flex items-center gap-1.5 text-zinc-300">
                                <Key size={13} className="text-yellow-500 animate-pulse" />
                                <span className="text-xs font-semibold">YouTube API Key Required</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-normal">
                                Paste your YouTube API Key below to search and queue videos directly without leaving SyncRoom! Stored safely in your browser.
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    placeholder="Paste YouTube API Key..."
                                    className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-650 text-xs h-9 flex-1"
                                    type="password"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 h-9 px-3 text-xs cursor-pointer"
                                >
                                    Save
                                </Button>
                            </div>
                        </form>
                    ) : (
                        /* Search Form and Results list */
                        <div className="space-y-3">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search YouTube videos..."
                                    className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-650 text-xs h-9 flex-1"
                                    disabled={isSearching}
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 h-9 px-3 text-xs cursor-pointer"
                                    disabled={isSearching}
                                >
                                    <Search size={14} />
                                </Button>
                            </form>

                            {/* Search Results list inside control section */}
                            {searchResults.length > 0 && (
                                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
                                    <div className="flex items-center justify-between text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                                        <span className="flex items-center gap-1 text-zinc-400">
                                            <Sparkles size={10} className="text-yellow-500" /> Results
                                        </span>
                                        <button 
                                            onClick={() => {
                                                setYoutubeApiKey("");
                                                setSearchResults([]);
                                            }}
                                            className="text-red-400 hover:text-red-300 font-medium lowercase cursor-pointer"
                                        >
                                            Change key
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {searchResults.map((item, index) => {
                                            const title = item.snippet.title;
                                            const channel = item.snippet.channelTitle || "YouTube Creator";
                                            const thumbnail = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;

                                            return (
                                                <div 
                                                    key={index} 
                                                    className="flex items-center gap-2 bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-800/40 hover:border-zinc-700/50 transition-all"
                                                >
                                                    <img src={thumbnail} alt="" className="w-12 h-8 rounded object-cover shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-[10px] font-semibold text-zinc-200 truncate leading-tight" title={title}>
                                                            {title}
                                                        </h5>
                                                        <p className="text-[8px] text-zinc-500 truncate leading-none mt-0.5">{channel}</p>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        {isOwner && (
                                                            <button
                                                                onClick={() => handlePlaySearchResult(item)}
                                                                className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer"
                                                                title="Play Now"
                                                            >
                                                                <Play size={10} fill="currentColor" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleAddSearchResultToQueue(item)}
                                                            className="p-1 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors cursor-pointer"
                                                            title="Add to Queue"
                                                        >
                                                            <Plus size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {searchResults.length === 0 && !isSearching && (
                                <div className="flex items-center justify-between text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                                    <span>Type and search above!</span>
                                    <button 
                                        onClick={() => setYoutubeApiKey("")}
                                        className="text-red-400 hover:text-red-300 font-medium lowercase cursor-pointer"
                                    >
                                        Change key
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Scrollable List of Queued Videos */}
            <ScrollArea className="flex-1 p-4">
                {videoQueue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                        <ListVideo size={36} className="opacity-10 mb-2.5" />
                        <p className="text-xs font-medium text-zinc-400">The queue is currently empty.</p>
                        <p className="text-[10px] text-zinc-650 mt-1 max-w-[200px]">Paste a YouTube link above to share a video with everyone!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {videoQueue.map((item, idx) => {
                            const isObj = typeof item !== "string";
                            const title = isObj ? item.title : "YouTube Video";
                            const url = isObj ? item.url : item;
                            const thumbnail = isObj ? item.thumbnail : `https://img.youtube.com/vi/${extractYouTubeId(url)}/mqdefault.jpg`;
                            const channel = isObj ? (item.channelName || "YouTube Creator") : "YouTube Creator";
                            const addedBy = isObj ? item.addedBy : null;

                            return (
                                <div 
                                    key={idx} 
                                    className="flex items-center gap-3 bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/50 p-2.5 rounded-xl group transition-all duration-200"
                                >
                                    {/* Thumbnail Preview */}
                                    <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-850 shadow-md">
                                        {thumbnail ? (
                                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[8px] text-zinc-500">Video</div>
                                        )}
                                        <div className="absolute top-0 left-0 bg-black/80 px-1.5 py-0.5 rounded-br text-[9px] font-extrabold text-indigo-400 border-r border-b border-zinc-850">
                                            {idx + 1}
                                        </div>
                                    </div>

                                    {/* Video metadata */}
                                    <div className="flex-1 min-w-0">
                                        <h4 
                                            onClick={() => isOwner && handlePlayQueueItem(idx)}
                                            className={`text-[11px] font-semibold leading-snug truncate ${
                                                isOwner 
                                                    ? "text-zinc-200 hover:text-indigo-400 cursor-pointer" 
                                                    : "text-zinc-300"
                                            }`}
                                            title={isOwner ? "Click to play this video immediately" : undefined}
                                        >
                                            {title}
                                        </h4>
                                        
                                        {/* Channel & AddedBy Info */}
                                        <p className="text-[9px] text-zinc-400 truncate mt-0.5 font-medium flex items-center gap-1">
                                            <Film size={9} className="text-zinc-500 shrink-0" />
                                            <span className="truncate">{channel}</span>
                                        </p>
                                        {addedBy && (
                                            <span className="text-[8px] text-zinc-600 block truncate mt-0.5">
                                                Added by {addedBy}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Controls */}
                                    <div className="flex flex-col gap-1 items-center justify-center shrink-0">
                                        {isOwner && (
                                            <>
                                                <button
                                                    onClick={() => handlePlayQueueItem(idx)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                                                    title="Play immediately"
                                                >
                                                    <Play size={11} fill="currentColor" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveFromQueue(idx)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                                    title="Remove from queue"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
