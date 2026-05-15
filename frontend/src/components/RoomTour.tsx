"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function RoomTour() {
    useEffect(() => {
        // Only run on client-side
        if (typeof window === "undefined") return;

        const hasSeenTour = localStorage.getItem("hasSeenRoomTour");
        if (hasSeenTour) return;

        // Small delay to ensure all UI elements are fully mounted
        const timer = setTimeout(() => {
            const driverObj = driver({
                showProgress: true,
                animate: true,
                popoverClass: "driver-popover",
                steps: [
                    {
                        popover: {
                            title: "Welcome to SyncRoom! 🍿",
                            description: "Let's take a quick tour so you know how everything works.",
                        }
                    },
                    {
                        element: ".tour-video-player",
                        popover: {
                            title: "The Main Stage",
                            description: "Here's the synchronized video player. Remember, only the Room Owner can play, pause, or change the video link!",
                            side: "bottom",
                            align: "center",
                        }
                    },
                    {
                        element: ".tour-controls",
                        popover: {
                            title: "Your Controls",
                            description: "Toggle your microphone, camera, or share your screen using this control bar.",
                            side: "top",
                            align: "center",
                        }
                    },
                    {
                        element: ".tour-topbar-actions",
                        popover: {
                            title: "Communication Hub",
                            description: "Toggle the Chat or Participants sidebar from these buttons.",
                            side: "bottom",
                            align: "end",
                        }
                    },
                    {
                        element: ".tour-sidebar",
                        popover: {
                            title: "Sidebar",
                            description: "If you're not the owner, you can 'Request Owner Access' from the Participants panel here.",
                            side: "left",
                            align: "start",
                        }
                    }
                ],
                onDestroyStarted: () => {
                    if (!driverObj.hasNextStep()) {
                        localStorage.setItem("hasSeenRoomTour", "true");
                    }
                    driverObj.destroy();
                },
            });

            driverObj.drive();
        }, 1500); // 1.5 second delay allows cameras to mount

        return () => clearTimeout(timer);
    }, []);

    return null; // This component doesn't render any visible DOM of its own
}
