"use client";

import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import HTMLFlipBook from "react-pageflip";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStickerStore } from "@/stores/sticker-store";
import { StickerDefinition } from "@/types/sticker";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useStickerSounds } from "@/hooks/useStickerSounds";

// Wrapper to filter null children for React 19 compatibility with react-pageflip
function FlipBookWrapper({ children, ...props }: React.ComponentProps<typeof HTMLFlipBook>) {
  // Filter out null/undefined/false children before passing to HTMLFlipBook
  const validChildren = useMemo(() => {
    return React.Children.toArray(children).filter(
      (child): child is React.ReactElement => React.isValidElement(child)
    );
  }, [children]);

  return (
    <HTMLFlipBook {...props}>
      {validChildren}
    </HTMLFlipBook>
  );
}

// Page component for the flipbook
const StickerPage = React.forwardRef<
  HTMLDivElement,
  {
    stickers: StickerDefinition[];
    pageNumber: number;
    isLeftPage: boolean;
    onStickerDragStart: (sticker: StickerDefinition, e: React.MouseEvent | React.TouchEvent) => void;
  }
>(({ stickers, pageNumber, isLeftPage, onStickerDragStart }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full h-full p-4 flex flex-col",
        "bg-gradient-to-br from-amber-50 to-orange-50",
        "border border-amber-200/50",
        isLeftPage ? "rounded-l-lg" : "rounded-r-lg"
      )}
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.03) 0%, transparent 5%, transparent 95%, rgba(0,0,0,0.03) 100%),
          repeating-linear-gradient(transparent, transparent 27px, rgba(200,180,160,0.15) 28px)
        `,
      }}
    >
      {/* Page header */}
      <div className="text-center mb-3">
        <span className="text-xs text-amber-600/70 font-medium">
          Page {pageNumber + 1}
        </span>
      </div>

      {/* Stickers grid */}
      <div className="flex-1 grid grid-cols-3 gap-3 content-start">
        {stickers.map((sticker) => (
          <div
            key={sticker.id}
            className={cn(
              "aspect-square rounded-lg p-2",
              "bg-white/50 backdrop-blur-sm",
              "border border-amber-200/30",
              "cursor-grab active:cursor-grabbing",
              "hover:bg-white/80 hover:scale-105 hover:shadow-md",
              "transition-all duration-200",
              "group"
            )}
            style={{
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onStickerDragStart(sticker, e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onStickerDragStart(sticker, e);
            }}
          >
            <div className="w-full h-full relative flex items-center justify-center">
              <Image
                src={sticker.path}
                alt={sticker.name}
                width={60}
                height={60}
                className="object-contain pointer-events-none select-none group-hover:scale-110 transition-transform"
                draggable={false}
              />
            </div>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 12 - stickers.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={cn(
              "aspect-square rounded-lg",
              "bg-amber-100/20 border border-dashed border-amber-200/30"
            )}
          />
        ))}
      </div>
    </div>
  );
});

StickerPage.displayName = "StickerPage";

// Cover page with Navy/Gold theme and glossy cartoon style
const CoverPage = React.forwardRef<HTMLDivElement, { isBack?: boolean }>(
  ({ isBack }, ref) => (
    <div
      ref={ref}
      className={cn(
        "w-full h-full flex items-center justify-center relative overflow-hidden",
        isBack ? "rounded-r-lg" : "rounded-l-lg"
      )}
      style={{
        // Navy gradient background
        background: "linear-gradient(145deg, #1a2744 0%, #0a1628 50%, #0d1a30 100%)",
        // Inner shadow for depth
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.5), inset 0 0 80px rgba(0,0,0,0.2)",
      }}
    >
      {/* Glossy highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              135deg,
              rgba(255,255,255,0.15) 0%,
              rgba(255,255,255,0.05) 25%,
              transparent 50%,
              transparent 100%
            )
          `,
          borderRadius: "inherit",
        }}
      />

      {/* Subtle cartoon pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(212,168,83,0.8) 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, rgba(212,168,83,0.8) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(212,168,83,0.5) 2px, transparent 2px)
          `,
          backgroundSize: "60px 60px, 50px 50px, 80px 80px",
        }}
      />

      {/* Gold decorative border */}
      <div
        className="absolute inset-3 pointer-events-none"
        style={{
          border: "2px solid rgba(212,168,83,0.3)",
          borderRadius: "8px",
          boxShadow: "0 0 15px rgba(212,168,83,0.1), inset 0 0 15px rgba(212,168,83,0.05)",
        }}
      />

      {/* Corner decorations */}
      {!isBack && (
        <>
          <div className="absolute top-5 left-5 w-4 h-4 border-t-2 border-l-2 border-[#d4a853]/50 rounded-tl-sm" />
          <div className="absolute top-5 right-5 w-4 h-4 border-t-2 border-r-2 border-[#d4a853]/50 rounded-tr-sm" />
          <div className="absolute bottom-5 left-5 w-4 h-4 border-b-2 border-l-2 border-[#d4a853]/50 rounded-bl-sm" />
          <div className="absolute bottom-5 right-5 w-4 h-4 border-b-2 border-r-2 border-[#d4a853]/50 rounded-br-sm" />
        </>
      )}

      {/* Content - centered absolutely */}
      {!isBack && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <div className="text-center">
            {/* Glowing book icon */}
            <div className="relative inline-block mb-4">
              <BookOpen
                className="w-16 h-16 mx-auto"
                style={{
                  color: "#d4a853",
                  filter: "drop-shadow(0 0 10px rgba(212,168,83,0.4))",
                }}
              />
              {/* Sparkle effect */}
              <div
                className="absolute -top-1 -right-1 w-3 h-3"
                style={{
                  background: "radial-gradient(circle, rgba(212,168,83,0.8) 0%, transparent 70%)",
                }}
              />
            </div>

            {/* Title with gold gradient */}
            <h2
              className="text-2xl font-bold tracking-wide mb-2"
              style={{
                background: "linear-gradient(180deg, #e6c77a 0%, #d4a853 50%, #b8923f 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 10px rgba(212,168,83,0.3)",
              }}
            >
              Sticker Book
            </h2>

            {/* Subtitle */}
            <p
              className="text-sm mt-2"
              style={{ color: "rgba(212,168,83,0.6)" }}
            >
              Drag stickers to place them
            </p>

            {/* Decorative line */}
            <div
              className="w-24 h-0.5 mx-auto mt-4"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(212,168,83,0.5), transparent)",
              }}
            />
          </div>
        </div>
      )}

      {/* Back cover subtle design */}
      {isBack && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #d4a853 0%, transparent 70%)",
            }}
          />
        </div>
      )}

      {/* Glossy bottom reflection */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.2), transparent)",
          borderRadius: "inherit",
        }}
      />
    </div>
  )
);

CoverPage.displayName = "CoverPage";

interface StickerBookProps {
  onClose: () => void;
}

// Calculate book dimensions based on viewport
function useBookDimensions() {
  const [dimensions, setDimensions] = useState({ width: 280, height: 400 });

  useEffect(() => {
    function calculateDimensions() {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // Leave space for padding, buttons, and page indicator
      const maxHeight = Math.min(vh - 150, 450);
      const maxWidth = Math.min(vw - 150, 320);

      // Maintain aspect ratio (280:400 = 0.7)
      const aspectRatio = 0.7;

      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setDimensions({
        width: Math.max(200, Math.floor(width)),
        height: Math.max(286, Math.floor(height))
      });
    }

    calculateDimensions();
    window.addEventListener("resize", calculateDimensions);
    return () => window.removeEventListener("resize", calculateDimensions);
  }, []);

  return dimensions;
}

export function StickerBook({ onClose }: StickerBookProps) {
  const bookRef = useRef<typeof HTMLFlipBook>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const bookDimensions = useBookDimensions();
  const { playGrab } = useStickerSounds();
  const {
    stickersByPage,
    currentPage,
    setCurrentPage,
    getTotalPages,
    startDrag,
    availableStickers,
    loadStickers,
    setBookBounds,
  } = useStickerStore();

  // Set portal container on mount (for SSR compatibility)
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Update book bounds when mounted and on resize
  useEffect(() => {
    function updateBounds() {
      if (bookContainerRef.current) {
        const rect = bookContainerRef.current.getBoundingClientRect();
        setBookBounds({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        });
      }
    }

    updateBounds();
    window.addEventListener("resize", updateBounds);

    return () => {
      window.removeEventListener("resize", updateBounds);
      setBookBounds(null);
    };
  }, [setBookBounds]);

  // Load stickers on mount
  useEffect(() => {
    async function fetchStickers() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/stickers", { credentials: "include" });
        const data = await response.json();
        loadStickers(data);
      } catch (error) {
        console.error("Failed to load stickers:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (availableStickers.length === 0) {
      fetchStickers();
    }
  }, [availableStickers.length, loadStickers]);

  const totalPages = getTotalPages();
  const hasPages = stickersByPage.length > 0;

  const handleStickerDragStart = useCallback(
    (sticker: StickerDefinition, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Play grab sound
      playGrab();

      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetX = clientX - rect.left - rect.width / 2;
      const offsetY = clientY - rect.top - rect.height / 2;

      startDrag(sticker, offsetX, offsetY);
    },
    [startDrag, playGrab]
  );

  const handleFlip = useCallback((e: { data: number }) => {
    setIsFlipping(true);
    setTimeout(() => setIsFlipping(false), 500);
    // Adjust for cover page offset
    const pageIndex = Math.max(0, Math.floor((e.data - 1) / 2));
    setCurrentPage(pageIndex);
  }, [setCurrentPage]);

  const goToPage = useCallback((direction: "prev" | "next") => {
    if (!bookRef.current || isFlipping) return;

    // @ts-expect-error - HTMLFlipBook methods
    const flipBook = bookRef.current.pageFlip();
    if (direction === "prev") {
      flipBook.flipPrev();
    } else {
      flipBook.flipNext();
    }
  }, [isFlipping]);

  // Don't render until portal container is ready
  if (!portalContainer) {
    return null;
  }

  // Show loading state while stickers are being fetched
  if (isLoading || !hasPages) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 overflow-hidden"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4"
            style={{
              background: "linear-gradient(145deg, #1a2744 0%, #0a1628 100%)",
              border: "1px solid rgba(212,168,83,0.2)",
            }}
          >
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#d4a853" }} />
            <p style={{ color: "rgba(212,168,83,0.8)" }}>Loading stickers...</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            Cancel
          </Button>
        </motion.div>
      </motion.div>,
      portalContainer
    );
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 overflow-hidden"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateY: -30 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.8, opacity: 0, rotateY: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative my-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ perspective: 2000 }}
        >
          {/* Close button - positioned inside the modal */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 z-10 text-white bg-black/50 hover:bg-black/70 rounded-full"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Navigation buttons - primary navigation method */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 text-white bg-black/30 hover:bg-white/30 disabled:opacity-30 rounded-full transition-all"
            onClick={() => goToPage("prev")}
            disabled={isFlipping}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 text-white bg-black/30 hover:bg-white/30 disabled:opacity-30 rounded-full transition-all"
            onClick={() => goToPage("next")}
            disabled={isFlipping}
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>

          {/* Book */}
          <div
            ref={bookContainerRef}
            className="p-2 rounded-xl shadow-2xl relative"
            data-sticker-book
            style={{
              background: "linear-gradient(145deg, #1a2744 0%, #0a1628 100%)",
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(212,168,83,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Click zones for page navigation on the edges */}
            <div
              className="absolute left-0 top-0 bottom-0 w-12 z-40 cursor-pointer hover:bg-black/10 transition-colors rounded-l-lg"
              onClick={() => goToPage("prev")}
              title="Página anterior"
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-12 z-40 cursor-pointer hover:bg-black/10 transition-colors rounded-r-lg"
              onClick={() => goToPage("next")}
              title="Página siguiente"
            />
            <FlipBookWrapper
              ref={bookRef}
              width={bookDimensions.width}
              height={bookDimensions.height}
              size="fixed"
              minWidth={bookDimensions.width}
              maxWidth={bookDimensions.width}
              minHeight={bookDimensions.height}
              maxHeight={bookDimensions.height}
              showCover={true}
              mobileScrollSupport={false}
              onFlip={handleFlip}
              className="shadow-xl"
              style={{ margin: "0 auto" }}
              startPage={0}
              drawShadow={true}
              flippingTime={600}
              usePortrait={false}
              startZIndex={0}
              autoSize={false}
              maxShadowOpacity={0.5}
              showPageCorners={false}
              disableFlipByClick={true}
              swipeDistance={9999}
              clickEventForward={true}
              useMouseEvents={false}
            >
              <CoverPage key="cover-front" />
              {stickersByPage.map((pageStickers, index) => (
                <StickerPage
                  key={`page-${index}`}
                  stickers={pageStickers}
                  pageNumber={index}
                  isLeftPage={index % 2 === 0}
                  onStickerDragStart={handleStickerDragStart}
                />
              ))}
              {stickersByPage.length % 2 !== 0 ? (
                <StickerPage
                  key={`empty-page-${stickersByPage.length}`}
                  stickers={[]}
                  pageNumber={stickersByPage.length}
                  isLeftPage={false}
                  onStickerDragStart={handleStickerDragStart}
                />
              ) : null}
              <CoverPage key="cover-back" isBack />
            </FlipBookWrapper>
          </div>

          {/* Page indicator */}
          <div className="text-center mt-4 text-white/70 text-sm">
            Page {currentPage + 1} of {totalPages || 1}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    portalContainer
  );
}
