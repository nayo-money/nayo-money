"use client";

import { useRef, type ReactNode } from "react";

type HorizontalScrollerProps = {
  children: ReactNode;
  className?: string;
};

export function HorizontalScroller({ children, className = "" }: HorizontalScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;

    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    startScroll.current = el.scrollLeft;
    el.classList.add("is-dragging");
    el.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const el = ref.current;
    if (!el) return;

    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    el.scrollLeft = startScroll.current - dx;
  };

  const stopDragging = () => {
    if (!dragging.current) return;
    dragging.current = false;
    ref.current?.classList.remove("is-dragging");
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
    }
  };

  return (
    <div
      ref={ref}
      className={`horizontal-scroll ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={stopDragging}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
