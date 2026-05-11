import { useEffect, useRef } from "react";

/**
 * Cursor-reactive blurry gradient background.
 * Soft event-themed blobs (confetti-like) that drift with parallax based on
 * pointer position. Uses CSS variables updated via rAF for smoothness.
 */
export function AnimatedBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX / window.innerWidth;
      target.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.06;
      current.current.y += (target.current.y - current.current.y) * 0.06;
      const el = ref.current;
      if (el) {
        el.style.setProperty("--mx", current.current.x.toString());
        el.style.setProperty("--my", current.current.y.toString());
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ["--mx" as string]: 0.5, ["--my" as string]: 0.5 }}
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/40" />

      {/* Blob 1 — primary, follows cursor strongly */}
      <div
        className="absolute h-[55vmax] w-[55vmax] rounded-full opacity-60 blur-3xl will-change-transform"
        style={{
          left: "calc(var(--mx) * 60% - 10%)",
          top: "calc(var(--my) * 60% - 10%)",
          transform: "translate3d(-50%, -50%, 0)",
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.78 0.18 295 / 0.55), transparent 60%)",
        }}
      />

      {/* Blob 2 — accent, opposite parallax */}
      <div
        className="absolute h-[50vmax] w-[50vmax] rounded-full opacity-55 blur-3xl will-change-transform"
        style={{
          right: "calc(var(--mx) * 50% - 5%)",
          bottom: "calc(var(--my) * 50% - 5%)",
          transform: "translate3d(50%, 50%, 0)",
          background:
            "radial-gradient(circle at 70% 70%, oklch(0.82 0.16 200 / 0.5), transparent 60%)",
        }}
      />

      {/* Blob 3 — warm confetti, subtle drift */}
      <div
        className="absolute h-[40vmax] w-[40vmax] rounded-full opacity-45 blur-3xl will-change-transform"
        style={{
          left: "calc(50% + (var(--mx) - 0.5) * -120px)",
          top: "calc(70% + (var(--my) - 0.5) * -120px)",
          transform: "translate3d(-50%, -50%, 0)",
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.85 0.17 60 / 0.55), transparent 65%)",
        }}
      />

      {/* Blob 4 — cool highlight */}
      <div
        className="absolute h-[45vmax] w-[45vmax] rounded-full opacity-50 blur-3xl will-change-transform"
        style={{
          left: "calc(15% + (var(--mx) - 0.5) * 200px)",
          top: "calc(15% + (var(--my) - 0.5) * 200px)",
          transform: "translate3d(-50%, -50%, 0)",
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.8 0.15 340 / 0.45), transparent 60%)",
        }}
      />

      {/* Subtle grain / vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0_0_0/0.08)_100%)]" />
    </div>
  );
}
