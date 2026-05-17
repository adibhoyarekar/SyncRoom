"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Pen, Eraser, Trash2, X } from "lucide-react";

interface WhiteboardProps {
    socket: Socket;
    roomId: string;
    isOwner: boolean;
    onClose: () => void;
}

export default function Whiteboard({ socket, roomId, isOwner, onClose }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#ef4444"); // Default red
    const [lineWidth] = useState(4);
    const [isEraser, setIsEraser] = useState(false);
    const [opacity, setOpacity] = useState(1);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

    // Resize canvas to match container exactly
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container) {
                // Save current image data
                const ctx = canvas.getContext("2d");
                const imgData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                
                // Restore image data if it existed
                if (ctx && imgData) {
                    ctx.putImageData(imgData, 0, 0);
                }
            }
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    // Socket Event Listeners
    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const handleDrawLine = ({ x0, y0, x1, y1, color, width }: { x0: number; y0: number; x1: number; y1: number; color: string; width: number }) => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            
            // Convert percentages back to actual pixels
            const px0 = x0 * canvas.width;
            const py0 = y0 * canvas.height;
            const px1 = x1 * canvas.width;
            const py1 = y1 * canvas.height;

            ctx.beginPath();
            ctx.moveTo(px0, py0);
            ctx.lineTo(px1, py1);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            // If color is 'eraser', use destination-out to erase
            if (color === "eraser") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.strokeStyle = "rgba(0,0,0,1)";
            } else {
                ctx.globalCompositeOperation = "source-over";
            }
            ctx.stroke();
            ctx.closePath();
        };

        const handleClear = () => {
            if (!canvasRef.current) return;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        };

        const handleSyncRequest = ({ requesterId }: { requesterId: string }) => {
            if (isOwner && canvasRef.current) {
                const dataUrl = canvasRef.current.toDataURL("image/png");
                socket.emit("sync-whiteboard-response", { requesterId, dataUrl });
            }
        };

        const handleSyncResponse = ({ dataUrl }: { dataUrl: string }) => {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
            };
            img.src = dataUrl;
        };

        socket.on("draw-line", handleDrawLine);
        socket.on("clear-whiteboard", handleClear);
        socket.on("sync-whiteboard-request", handleSyncRequest);
        socket.on("sync-whiteboard-response", handleSyncResponse);

        // Request current state from owner when first mounting
        if (!isOwner) {
            socket.emit("request-whiteboard", { roomId });
        }

        return () => {
            socket.off("draw-line", handleDrawLine);
            socket.off("clear-whiteboard", handleClear);
            socket.off("sync-whiteboard-request", handleSyncRequest);
            socket.off("sync-whiteboard-response", handleSyncResponse);
        };
    }, [socket, roomId, isOwner]);

    const drawLine = (x0: number, y0: number, x1: number, y1: number, sendData: boolean) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        const actualColor = isEraser ? "eraser" : color;
        ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (isEraser) {
            ctx.globalCompositeOperation = "destination-out";
        } else {
            ctx.globalCompositeOperation = "source-over";
        }
        
        ctx.stroke();
        ctx.closePath();

        if (sendData) {
            // Send percentages to handle different screen sizes
            socket.emit("draw-line", {
                roomId,
                x0: x0 / canvas.width,
                y0: y0 / canvas.height,
                x1: x1 / canvas.width,
                y1: y1 / canvas.height,
                color: actualColor,
                width: lineWidth
            });
        }
    };

    const getMousePos = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const pos = getMousePos(e);
        lastPosRef.current = pos;
        // Draw a dot just by clicking
        drawLine(pos.x, pos.y, pos.x + 0.1, pos.y + 0.1, true);
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !lastPosRef.current) return;
        const pos = getMousePos(e);
        drawLine(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y, true);
        lastPosRef.current = pos;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        setIsDrawing(false);
        lastPosRef.current = null;
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    };

    const handleClear = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket.emit("clear-whiteboard", { roomId });
    };

    return (
        <div 
            ref={containerRef}
            className="absolute inset-0 z-30 pointer-events-auto"
            style={{ opacity }}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full touch-none cursor-crosshair"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerOut={handlePointerUp}
            />

            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-zinc-700 shadow-2xl flex items-center gap-4">
                
                {/* Tools */}
                <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setIsEraser(false)}
                        className={`p-1.5 rounded-md transition-colors ${!isEraser ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                        title="Pen"
                    >
                        <Pen size={14} />
                    </button>
                    <button
                        onClick={() => setIsEraser(true)}
                        className={`p-1.5 rounded-md transition-colors ${isEraser ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                        title="Eraser"
                    >
                        <Eraser size={14} />
                    </button>
                </div>

                <div className="w-px h-6 bg-zinc-700" />

                {/* Colors */}
                {!isEraser && (
                    <div className="flex gap-1.5">
                        {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ffffff"].map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-white shadow-md" : "border-transparent hover:scale-110"}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                )}

                <div className="w-px h-6 bg-zinc-700" />

                {/* Opacity */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-medium">Alpha</span>
                    <input 
                        type="range" 
                        min="0.1" max="1" step="0.1"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        className="w-16 accent-indigo-500"
                    />
                </div>

                <div className="w-px h-6 bg-zinc-700" />

                {/* Clear */}
                <button
                    onClick={handleClear}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium"
                >
                    <Trash2 size={14} /> Clear
                </button>

                {/* Close */}
                <button
                    onClick={onClose}
                    className="ml-2 text-zinc-400 hover:text-white transition-colors"
                    title="Close Whiteboard (w)"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
