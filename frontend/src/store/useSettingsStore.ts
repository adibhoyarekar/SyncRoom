import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
    shortcuts: {
        mute: string;
        camera: string;
        fullscreen: string;
        chat: string;
        whiteboard: string;
        polls: string;
    };
    setShortcut: (action: keyof SettingsStore["shortcuts"], key: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            shortcuts: {
                mute: "m",
                camera: "v",
                fullscreen: "f",
                chat: "c",
                whiteboard: "w",
                polls: "p",
            },
            setShortcut: (action, key) =>
                set((state) => ({
                    shortcuts: {
                        ...state.shortcuts,
                        [action]: key.toLowerCase(),
                    },
                })),
        }),
        {
            name: "syncroom-settings",
        }
    )
);
