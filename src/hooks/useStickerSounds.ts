"use client";

import { useCallback, useRef, useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";

const SOUND_PATHS = {
  grab: "/sounds/sticker-grab.wav",
  drop: "/sounds/sticker-drop.wav",
} as const;

type SoundType = keyof typeof SOUND_PATHS;

/**
 * Hook for playing sticker interaction sounds.
 * Preloads audio files for instant playback.
 * Volume is controlled via settings store (0-100).
 */
export function useStickerSounds() {
  const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
    grab: null,
    drop: null,
  });
  const stickerSoundVolume = useSettingsStore((state) => state.stickerSoundVolume);

  // Preload audio files on mount
  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Preload sounds
    Object.entries(SOUND_PATHS).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = "auto";
      audioRefs.current[key as SoundType] = audio;
    });

    // Cleanup on unmount
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, []);

  // Update volume when setting changes
  useEffect(() => {
    const volume = stickerSoundVolume / 100; // Convert 0-100 to 0-1
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.volume = volume;
      }
    });
  }, [stickerSoundVolume]);

  const playSound = useCallback((type: SoundType) => {
    // Don't play if volume is 0 (muted)
    if (stickerSoundVolume === 0) return;

    const audio = audioRefs.current[type];
    if (!audio) return;

    // Reset to beginning if already playing
    audio.currentTime = 0;

    // Play the sound (handle promise to avoid uncaught errors)
    audio.play().catch((err) => {
      // Silently fail - browsers may block autoplay until user interaction
      console.debug(`Could not play sticker ${type} sound:`, err.message);
    });
  }, [stickerSoundVolume]);

  const playGrab = useCallback(() => {
    playSound("grab");
  }, [playSound]);

  const playDrop = useCallback(() => {
    playSound("drop");
  }, [playSound]);

  return {
    playGrab,
    playDrop,
    playSound,
  };
}
