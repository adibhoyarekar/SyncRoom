import { Socket } from "socket.io-client";
import { MicOff, Hand, ShieldAlert } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HostControlsProps {
    socket: Socket | null;
    roomId: string;
}

export default function HostControls({ socket, roomId }: HostControlsProps) {
    if (!socket) return null;

    const handleMuteAll = () => {
        if (confirm("Are you sure you want to mute all participants?")) {
            socket.emit("force-mute-all", { roomId });
        }
    };

    const handleLowerAllHands = () => {
        socket.emit("lower-all-hands", { roomId });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 gap-1.5 rounded-lg border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                >
                    <ShieldAlert size={16} />
                    <span className="hidden sm:inline text-xs font-semibold">Host Controls</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300 rounded-xl shadow-2xl p-1">
                <DropdownMenuLabel className="text-xs text-zinc-500 uppercase tracking-wider font-bold px-2 py-1.5">
                    Room Management
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem 
                    onClick={handleMuteAll}
                    className="flex items-center gap-2 cursor-pointer focus:bg-red-500/10 focus:text-red-400 rounded-lg p-2 transition-colors"
                >
                    <MicOff size={14} className="text-red-400" />
                    <span className="font-medium text-sm">Force Mute All</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={handleLowerAllHands}
                    className="flex items-center gap-2 cursor-pointer focus:bg-yellow-500/10 focus:text-yellow-400 rounded-lg p-2 transition-colors"
                >
                    <Hand size={14} className="text-yellow-400" />
                    <span className="font-medium text-sm">Lower All Hands</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
