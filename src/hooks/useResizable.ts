import { useState, useRef, useCallback, useEffect } from "react";

interface Size {
  width: number;
  height: number;
}

interface Constraints {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
}

export function useResizable(defaults: Size, constraints: Constraints) {
  const [size, setSize] = useState<Size>(defaults);
  const sizeRef = useRef<Size>(defaults);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef<Size>(defaults);
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      const { minW, maxW, minH, maxH } = constraintsRef.current;
      const newSize: Size = {
        width: Math.min(maxW, Math.max(minW, startSize.current.width + dx)),
        height: Math.min(maxH, Math.max(minH, startSize.current.height + dy)),
      };
      sizeRef.current = newSize;
      setSize(newSize);
    };

    const onMouseUp = () => {
      dragging.current = false;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...sizeRef.current };
  }, []);

  return { size, handleMouseDown };
}
