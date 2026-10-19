import { useEffect, useRef, useState, useCallback } from "react";
import { extractWavPeaks } from "./wavPeaks";

/** Lightweight waveform scrubber drawn from decoded audio peaks (no WaveSurfer dependency). */
export function AudioWaveform({
  url,
  audioRef,
  rate,
}: {
  url: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  rate: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<Float32Array | null>(null);

  const [progress, setProgress] = useState(0);
  const paint = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    const peaks = peaksRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 48;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);
    const count = peaks?.length ?? 64;
    const gap = 1;
    const bar = Math.max(1, (width - gap * count) / count);
    const styles = getComputedStyle(canvas);
    const played = styles.getPropertyValue("--primary").trim(),
      remaining = styles.getPropertyValue("--border").trim();
    for (let i = 0; i < count; i += 1) {
      const amp = peaks ? peaks[i]! : 0.2 + Math.sin(i / 6) * 0.15;
      const h = Math.max(2, amp * (height - 4));
      const x = i * (bar + gap);
      const y = (height - h) / 2;
      ctx.fillStyle = i / count <= progress ? played : remaining;
      ctx.fillRect(x, y, bar, h);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    peaksRef.current = null;
    paint(0);
    void (async () => {
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const wav = extractWavPeaks(buffer, 180);
        if (wav) {
          if (!cancelled) {
            peaksRef.current = new Float32Array(wav.peaks);
            paint(0);
          }
          return;
        }
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(buffer.slice(0)).finally(() => ctx.close());
        if (cancelled) return;
        const channel = decoded.getChannelData(0);
        const buckets = 180;
        const peaks = new Float32Array(buckets);
        const step = Math.floor(channel.length / buckets) || 1;
        for (let i = 0; i < buckets; i += 1) {
          let max = 0;
          const start = i * step;
          for (let j = 0; j < step && start + j < channel.length; j += 1) {
            max = Math.max(max, Math.abs(channel[start + j] ?? 0));
          }
          peaks[i] = max;
        }
        peaksRef.current = peaks;
        paint(0);
      } catch {
        if (cancelled) return;
        peaksRef.current = null;
        paint(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, paint]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    const onTime = () => {
      const progress = audio.duration ? audio.currentTime / audio.duration : 0;
      paint(progress);
      setProgress(progress * 100);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("seeked", onTime);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("seeked", onTime);
    };
  }, [audioRef, rate, url, paint]);

  return (
    <canvas
      ref={canvasRef}
      className="h-12 w-full cursor-pointer"
      role="slider"
      tabIndex={0}
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="waveform"
      onKeyDown={(event) => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration)) return;
        const delta = event.key === "ArrowRight" ? 5 : event.key === "ArrowLeft" ? -5 : 0;
        if (delta || event.key === "Home" || event.key === "End") {
          event.preventDefault();
          audio.currentTime =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? audio.duration
                : Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
        }
      }}
      onClick={(event) => {
        const audio = audioRef.current;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!audio || !audio.duration || rect.width === 0) return;
        audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
      }}
    />
  );
}
