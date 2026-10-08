"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from "lucide-react";

type Props = {
  images: { id: string; src: string }[];
  videoUrl: string | null;
  floorPlanUrl: string | null;
  floorPlanPdfUrl: string | null;
  alt: string;
  accent?: string;
};

export default function TourViewer({ images, videoUrl, floorPlanUrl, floorPlanPdfUrl, alt, accent = "#ffffff" }: Props) {
  const tabs = [
    images.length > 0 && "photos",
    videoUrl && "video",
    floorPlanUrl && "plan",
  ].filter(Boolean) as ("photos" | "video" | "plan")[];
  const [tab, setTab] = useState(tabs[0] ?? "photos");
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const stage = useRef<HTMLDivElement>(null);

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (tab !== "photos") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, go]);

  const label = { photos: "Photos", video: "Video", plan: "Floor Plan" };

  return (
    <div ref={stage} className="bg-black text-white">
      <div role="tablist" className="flex items-center justify-center gap-1 border-b border-white/10 p-2">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="rounded px-4 py-2 text-sm font-semibold"
            style={tab === t ? { background: accent, color: "#000" } : undefined}
          >
            {label[t]}
          </button>
        ))}
        <button aria-label="Toggle fullscreen" className="ml-2 rounded p-2 hover:bg-white/10" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())}>
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {tab === "photos" && images.length > 0 && (
        <div>
          <div className="relative flex h-[68vh] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index].src} alt={`${alt} — photo ${index + 1} of ${images.length}`} className="max-h-full max-w-full object-contain" />
            {images.length > 1 && (
              <>
                <button aria-label="Previous photo" onClick={() => go(-1)} className="absolute left-3 rounded-full bg-black/60 p-2 hover:bg-black/80"><ChevronLeft /></button>
                <button aria-label="Next photo" onClick={() => go(1)} className="absolute right-3 rounded-full bg-black/60 p-2 hover:bg-black/80"><ChevronRight /></button>
              </>
            )}
            <span className="absolute bottom-2 right-3 rounded bg-black/60 px-2 py-1 text-xs">{index + 1} / {images.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto p-3">
            {images.map((image, i) => (
              <button key={image.id} aria-label={`Show photo ${i + 1}`} onClick={() => setIndex(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded ${i === index ? "ring-2 ring-white" : "opacity-60"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "video" && videoUrl && (
        <div className="flex h-[75vh] items-center justify-center bg-black">
          <video src={videoUrl} controls playsInline preload="metadata" className="max-h-full max-w-full" />
        </div>
      )}

      {tab === "plan" && floorPlanUrl && (
        <div>
          <div className="flex items-center justify-center gap-2 p-2 text-sm">
            <button aria-label="Zoom out" className="rounded bg-white/10 p-2" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}><Minus className="h-4 w-4" /></button>
            <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button aria-label="Zoom in" className="rounded bg-white/10 p-2" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}><Plus className="h-4 w-4" /></button>
            {floorPlanPdfUrl && <a href={floorPlanPdfUrl} target="_blank" rel="noreferrer" className="ml-3 underline">Open PDF</a>}
          </div>
          {/* Scrolling the zoomed container pans the plan. */}
          <div className="h-[68vh] overflow-auto bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={floorPlanUrl} alt={`${alt} — floor plan`} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} className="mx-auto block h-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
