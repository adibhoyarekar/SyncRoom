"use client";

import React, { useState } from "react";
import { Socket } from "socket.io-client";
import { useRoomStore, Poll, Question } from "@/store/useRoomStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Vote, Plus, Trash2, Lock, Sparkles, MessageSquare, ThumbsUp, Send, ChevronDown, ChevronUp, User, X
} from "lucide-react";

interface PollsPanelProps {
    socket: Socket;
    roomId: string;
}

export default function PollsPanel({ socket, roomId }: PollsPanelProps) {
    const { polls, questions, users } = useRoomStore();
    const [activeTab, setActiveTab] = useState<"polls" | "qa">("polls");

    // Local user information
    const localUser = users.find(u => u.id === socket.id);
    const isOwner = localUser?.isOwner ?? false;

    // ── Poll Creation States ──
    const [isCreatingPoll, setIsCreatingPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

    // ── Q&A States ──
    const [questionText, setQuestionText] = useState("");
    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
    const [replyTexts, setReplyTexts] = useState<{ [qId: string]: string }>({});

    // ── Dynamic Options Handlers ──
    const handleAddOption = () => {
        if (pollOptions.length < 6) {
            setPollOptions([...pollOptions, ""]);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, idx) => idx !== index));
        }
    };

    const handleOptionChange = (index: number, val: string) => {
        const next = [...pollOptions];
        next[index] = val;
        setPollOptions(next);
    };

    // ── Create Poll Submit ──
    const handleCreatePoll = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuestion = pollQuestion.trim();
        const validOptions = pollOptions.map(o => o.trim()).filter(o => o !== "");

        if (!trimmedQuestion) return alert("Please enter a question.");
        if (validOptions.length < 2) return alert("Please specify at least 2 valid options.");

        const newPoll: Poll = {
            id: Math.random().toString(36).substring(2, 11),
            question: trimmedQuestion,
            options: validOptions,
            votes: validOptions.reduce((acc, _, idx) => {
                acc[idx] = [];
                return acc;
            }, {} as { [key: number]: string[] }),
            creatorName: localUser?.name || "Guest",
            creatorId: socket.id || "",
            isOpen: true
        };

        socket.emit("create-poll", { roomId, poll: newPoll });

        // Reset fields
        setPollQuestion("");
        setPollOptions(["", ""]);
        setIsCreatingPoll(false);
    };

    // ── Vote Submit ──
    const handleVote = (pollId: string, optionIndex: number) => {
        if (!socket.id) return;
        socket.emit("vote-poll", { roomId, pollId, optionIndex, userId: socket.id });
    };

    // ── Close / Delete Poll ──
    const handleClosePoll = (pollId: string) => {
        socket.emit("close-poll", { roomId, pollId });
    };

    const handleDeletePoll = (pollId: string) => {
        if (confirm("Are you sure you want to delete this poll?")) {
            socket.emit("delete-poll", { roomId, pollId });
        }
    };

    // ── Submit Question Q&A ──
    const handleAskQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = questionText.trim();
        if (!trimmed) return;

        const newQuestion: Question = {
            id: Math.random().toString(36).substring(2, 11),
            text: trimmed,
            creatorName: localUser?.name || "Guest",
            creatorId: socket.id || "",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            upvotes: [],
            answers: []
        };

        socket.emit("submit-question", { roomId, question: newQuestion });
        setQuestionText("");
    };

    // ── Upvote Question ──
    const handleUpvote = (questionId: string) => {
        if (!socket.id) return;
        socket.emit("upvote-question", { roomId, questionId, userId: socket.id });
    };

    // ── Submit Answer ──
    const handleSendAnswer = (questionId: string) => {
        const text = replyTexts[questionId]?.trim();
        if (!text) return;

        const newAnswer = {
            id: Math.random().toString(36).substring(2, 11),
            text,
            creatorName: localUser?.name || "Guest",
            creatorId: socket.id || "",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.emit("answer-question", { roomId, questionId, answer: newAnswer });
        setReplyTexts(prev => ({ ...prev, [questionId]: "" }));
    };

    const handleDeleteQuestion = (questionId: string) => {
        if (confirm("Are you sure you want to delete this question?")) {
            socket.emit("delete-question", { roomId, questionId });
        }
    };

    // ── Sort Questions by Upvotes ──
    const sortedQuestions = [...questions].sort((a, b) => b.upvotes.length - a.upvotes.length);

    return (
        <div className="h-full flex flex-col bg-zinc-950/80 backdrop-blur-md text-white border-l border-zinc-800/40">
            {/* Header Tabs */}
            <div className="shrink-0 p-4 border-b border-zinc-800/60 bg-zinc-900/40">
                <div className="flex bg-zinc-900 border border-zinc-800/80 rounded-xl p-1 relative">
                    <button
                        onClick={() => setActiveTab("polls")}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                            activeTab === "polls" 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        <Vote size={14} />
                        Polls
                    </button>
                    <button
                        onClick={() => setActiveTab("qa")}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                            activeTab === "qa" 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        <MessageSquare size={14} />
                        Q&A
                        {questions.length > 0 && (
                            <span className="ml-1 bg-zinc-800 text-indigo-400 border border-zinc-700/60 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                {questions.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Scrollable content area */}
            <ScrollArea className="flex-1 p-4">
                {activeTab === "polls" ? (
                    <div className="space-y-4">
                        {/* Create Poll Box */}
                        {!isCreatingPoll ? (
                            <Button 
                                onClick={() => setIsCreatingPoll(true)} 
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800/80 hover:text-white rounded-xl text-xs py-5 gap-1.5 transition-all duration-200"
                            >
                                <Plus size={14} />
                                Create a New Poll
                            </Button>
                        ) : (
                            <form onSubmit={handleCreatePoll} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-inner">
                                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 uppercase tracking-wide">
                                        <Sparkles size={12} /> New Poll Setup
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreatingPoll(false)} 
                                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-400">Question</label>
                                    <Input
                                        value={pollQuestion}
                                        onChange={(e) => setPollQuestion(e.target.value)}
                                        placeholder="What should we vote on?"
                                        className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-xs"
                                        maxLength={120}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] uppercase font-bold text-zinc-400">Options</label>
                                        {pollOptions.length < 6 && (
                                            <button
                                                type="button"
                                                onClick={handleAddOption}
                                                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                                            >
                                                <Plus size={10} /> Add Row
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {pollOptions.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <Input
                                                    value={opt}
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                    placeholder={`Choice #${idx + 1}`}
                                                    className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-xs h-8"
                                                    required
                                                />
                                                {pollOptions.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOption(idx)}
                                                        className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 p-1"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsCreatingPoll(false)}
                                        className="flex-1 border border-zinc-800 text-zinc-400 hover:text-white text-xs h-8"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                                    >
                                        Launch Poll
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* List Polls */}
                        {polls.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                                <Vote size={32} className="opacity-20 mb-2" />
                                <p className="text-xs">No active polls inside the room.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...polls].reverse().map((poll) => {
                                    // Calculate calculations
                                    const totalVotes = Object.values(poll.votes).reduce((sum, uids) => sum + uids.length, 0);
                                    
                                    // Check if current user voted
                                    let userVotedOptionIdx: number | null = null;
                                    Object.entries(poll.votes).forEach(([idxStr, uids]) => {
                                        if (uids.includes(socket.id || "")) {
                                            userVotedOptionIdx = parseInt(idxStr);
                                        }
                                    });

                                    const isCreator = poll.creatorId === socket.id;
                                    const canManage = isOwner || isCreator;

                                    return (
                                        <div key={poll.id} className={`border p-4 rounded-xl space-y-3 transition-all duration-300 bg-zinc-900/40 ${
                                            poll.isOpen ? "border-zinc-800 hover:border-zinc-700/60" : "border-zinc-900 opacity-80"
                                        }`}>
                                            {/* Poll Title */}
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mb-1.5 ${
                                                        poll.isOpen 
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                                            : "bg-zinc-800 text-zinc-400"
                                                    }`}>
                                                        {poll.isOpen ? "Live" : "Closed"}
                                                    </span>
                                                    <h4 className="text-xs font-semibold text-zinc-100 leading-snug break-words pr-1">{poll.question}</h4>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 mt-1">
                                                        <User size={9} />
                                                        <span>By {poll.creatorName}</span>
                                                        <span>•</span>
                                                        <span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
                                                    </div>
                                                </div>

                                                {/* Host/Creator controls */}
                                                {canManage && (
                                                    <div className="flex gap-1 shrink-0">
                                                        {poll.isOpen && (
                                                            <button
                                                                onClick={() => handleClosePoll(poll.id)}
                                                                className="text-zinc-500 hover:text-indigo-400 p-1 rounded transition-colors"
                                                                title="Close Poll"
                                                            >
                                                                <Lock size={12} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeletePoll(poll.id)}
                                                            className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                                                            title="Delete Poll"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Choices Rendering */}
                                            <div className="space-y-2 pt-1">
                                                {poll.options.map((opt, oIdx) => {
                                                    const optionVotes = poll.votes[oIdx]?.length || 0;
                                                    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                                                    const hasVotedForThis = userVotedOptionIdx === oIdx;

                                                    // If poll is open and user hasn't voted, show selectables
                                                    if (poll.isOpen && userVotedOptionIdx === null) {
                                                        return (
                                                            <button
                                                                key={oIdx}
                                                                onClick={() => handleVote(poll.id, oIdx)}
                                                                className="w-full text-left p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-850 hover:border-zinc-700/60 text-xs text-zinc-300 font-medium transition-all cursor-pointer flex items-center justify-between"
                                                            >
                                                                <span className="truncate pr-2">{opt}</span>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                                                            </button>
                                                        );
                                                    }

                                                    // Otherwise render progress bars
                                                    return (
                                                        <div key={oIdx} className="space-y-1">
                                                            <div className="flex justify-between items-center text-xs px-1">
                                                                <span className={`truncate pr-2 font-medium flex items-center gap-1.5 ${
                                                                    hasVotedForThis ? "text-indigo-400 font-bold" : "text-zinc-400"
                                                                }`}>
                                                                    {hasVotedForThis && <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />}
                                                                    {opt}
                                                                </span>
                                                                <span className="text-[10px] text-zinc-500 font-semibold shrink-0">
                                                                    {percentage}% ({optionVotes})
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/50">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                                        hasVotedForThis 
                                                                            ? "bg-gradient-to-r from-indigo-500 to-purple-500" 
                                                                            : "bg-zinc-700"
                                                                    }`}
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Q&A View */
                    <div className="space-y-4">
                        {/* Ask Form */}
                        <form onSubmit={handleAskQuestion} className="flex gap-2">
                            <Input
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                placeholder="Ask the room a question..."
                                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-650 text-xs h-9"
                                maxLength={180}
                                required
                            />
                            <Button 
                                type="submit" 
                                size="sm" 
                                className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 h-9 p-2.5"
                            >
                                <Send size={12} />
                            </Button>
                        </form>

                        {/* List Questions */}
                        {sortedQuestions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                                <MessageSquare size={32} className="opacity-20 mb-2" />
                                <p className="text-xs">No questions have been asked yet.<br/>Be the first to ask one!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedQuestions.map((q) => {
                                    const hasUpvoted = q.upvotes.includes(socket.id || "");
                                    const isExpanded = expandedQuestionId === q.id;
                                    const canDelete = isOwner || q.creatorId === socket.id;

                                    return (
                                        <div key={q.id} className="border border-zinc-850 p-4 rounded-xl bg-zinc-900/30 space-y-3">
                                            {/* Top Metadata */}
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                                                        <span className="font-semibold text-zinc-400">{q.creatorName}</span>
                                                        <span>•</span>
                                                        <span>{q.timestamp}</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-zinc-200 mt-1 leading-relaxed break-words">{q.text}</p>
                                                </div>

                                                {/* Delete Controls */}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteQuestion(q.id)}
                                                        className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors shrink-0"
                                                        title="Delete Question"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Action Bar (Upvote & Thread trigger) */}
                                            <div className="flex items-center justify-between border-t border-zinc-850 pt-2 text-[10px]">
                                                <button
                                                    onClick={() => handleUpvote(q.id)}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                                                        hasUpvoted 
                                                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                                                            : "bg-zinc-900 border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                                                    }`}
                                                >
                                                    <ThumbsUp size={11} className={hasUpvoted ? "fill-indigo-400/20" : ""} />
                                                    <span>{q.upvotes.length} {q.upvotes.length === 1 ? "Upvote" : "Upvotes"}</span>
                                                </button>

                                                <button
                                                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                                                    className="flex items-center gap-0.5 text-zinc-500 hover:text-zinc-300 font-semibold cursor-pointer"
                                                >
                                                    <span>{q.answers.length} {q.answers.length === 1 ? "Reply" : "Replies"}</span>
                                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                            </div>

                                            {/* Expandable answers thread */}
                                            {isExpanded && (
                                                <div className="space-y-2 border-t border-zinc-900 pt-3 transition-all duration-300">
                                                    {/* Existing Answers */}
                                                    {q.answers.length > 0 && (
                                                        <div className="space-y-2 pl-2 border-l border-indigo-500/15 max-h-40 overflow-y-auto">
                                                            {q.answers.map((ans) => (
                                                                <div key={ans.id} className="text-[11px] leading-relaxed bg-zinc-950/30 p-2 rounded-lg border border-zinc-900/50">
                                                                    <div className="flex justify-between items-center text-[9px] text-zinc-500 mb-0.5">
                                                                        <span className="font-semibold text-zinc-400">{ans.creatorName}</span>
                                                                        <span>{ans.timestamp}</span>
                                                                    </div>
                                                                    <p className="text-zinc-300 break-words">{ans.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Reply Box */}
                                                    <div className="flex gap-1.5 items-center">
                                                        <Input
                                                            value={replyTexts[q.id] || ""}
                                                            onChange={(e) => setReplyTexts({ ...replyTexts, [q.id]: e.target.value })}
                                                            placeholder="Type your reply..."
                                                            className="bg-zinc-950 border-zinc-800 text-[11px] h-8 placeholder:text-zinc-700"
                                                            maxLength={150}
                                                        />
                                                        <Button
                                                            onClick={() => handleSendAnswer(q.id)}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 h-8 px-2.5 text-[10px]"
                                                        >
                                                            Reply
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
