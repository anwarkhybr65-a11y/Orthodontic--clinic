"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef } from "react";

export function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(Boolean(value));
  const initial = useRef(value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastWidth = 0;

    const paint = (source?: string) => {
      const width = Math.round(canvas.clientWidth);
      const height = Math.round(canvas.clientHeight);
      if (!width || !height || width === lastWidth) return;
      lastWidth = width;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#243f33";
      if (source) {
        const image = new Image();
        image.onload = () => ctx.drawImage(image, 0, 0, width, height);
        image.src = source;
      }
    };

    paint(initial.current);
    const observer = new ResizeObserver(() => paint(canvas.toDataURL("image/png")));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function context() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return null;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#243f33";
    return { canvas, ctx };
  }

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const pair = context();
    if (!pair) return;
    pair.canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = point(event);
    pair.ctx.beginPath();
    pair.ctx.moveTo(p.x, p.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const pair = context();
    if (!pair) return;
    const p = point(event);
    pair.ctx.lineTo(p.x, p.y);
    pair.ctx.stroke();
    pair.ctx.beginPath();
    pair.ctx.moveTo(p.x, p.y);
    hasInk.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(hasInk.current ? canvas.toDataURL("image/png") : "");
  }

  function clear() {
    const pair = context();
    if (!pair) return;
    pair.ctx.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
    hasInk.current = false;
    initial.current = "";
    onChange("");
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-sage-900">{label}</span>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-700">
          <Eraser size={14} />
          مسح
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-36 w-full touch-none rounded-2xl border border-dashed border-sage-300 bg-white bg-[linear-gradient(to_top,#f3f7f4_0,#f3f7f4_42px,transparent_43px)]"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <p className="mt-1.5 text-xs text-slate-500">وقّع داخل الإطار بالفأرة أو بالإصبع.</p>
    </div>
  );
}
