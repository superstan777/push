import { useEffect, useRef, useState } from "react";

interface Props {
  duration: number;
  onComplete: () => void;
}

export function RestTimer({ duration, onComplete }: Props) {
  const circleRef = useRef<SVGCircleElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const radius = 90;
    const circumference = 2 * Math.PI * radius;

    if (circleRef.current) {
      circleRef.current.style.strokeDasharray = `${circumference}`;
      circleRef.current.style.strokeDashoffset = `${circumference}`;
    }

    startTimeRef.current = performance.now();
    setRemaining(duration);

    let lastSecond = duration;

    const tick = (now: number) => {
      if (!startTimeRef.current || !circleRef.current) return;

      const elapsed = (now - startTimeRef.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      // 🔥 120fps: bez React re-render
      const offset = circumference * (1 - progress);
      circleRef.current.style.strokeDashoffset = `${offset}`;

      const color = Math.round(255 * progress);
      circleRef.current.style.stroke = `rgb(${color}, ${color}, ${color})`;

      const secondsLeft = Math.max(Math.ceil(duration - elapsed), 0);
      if (secondsLeft !== lastSecond) {
        lastSecond = secondsLeft;
        setRemaining(secondsLeft);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, onComplete]);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="200" height="200" className="absolute -rotate-90">
        <circle
          ref={circleRef}
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="black"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>

      <div className="flex flex-col items-center">
        <div className="text-6xl font-bold">{remaining}</div>
      </div>
    </div>
  );
}
