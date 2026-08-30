// CanvasGrid.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { getVisibleSquares, GRID_SIZE_EXPORT as GRID_SIZE } from './mockApi';

const MIN_SCALE = 0.0000005;
const MAX_SCALE = 64;

const CHECK_A = '#f5f5f5';
const CHECK_B = '#e0e0e0';

export default function CanvasGrid({
                                     userId,
                                     userColor,
                                     stagedSquare,
                                     setStagedSquare,
                                     committing,
                                   }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [view, setView] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [claimedSquares, setClaimedSquares] = useState([]);
  const [hoveredSquare, setHoveredSquare] = useState(null);

  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const viewRef = useRef(view);
  viewRef.current = view;

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Initial view
  useEffect(() => {
    if (size.width && size.height) {
      const initialScale = 8;
      const centerGrid = GRID_SIZE / 2;
      setView({
        scale: initialScale,
        offsetX: size.width / 2 - centerGrid * initialScale,
        offsetY: size.height / 2 - centerGrid * initialScale,
      });
    }
  }, [size.width, size.height]);

  // Viewport culling
  useEffect(() => {
    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      const { offsetX, offsetY, scale } = view;
      const { width, height } = size;

      const minGridX = -offsetX / scale;
      const minGridY = -offsetY / scale;
      const maxGridX = (width - offsetX) / scale;
      const maxGridY = (height - offsetY) / scale;

      const visibleSquaresCount = (maxGridX - minGridX) * (maxGridY - minGridY);
      if (visibleSquaresCount > 500_000) {
        setClaimedSquares([]);
        return;
      }

      try {
        const squares = await getVisibleSquares(minGridX, minGridY, maxGridX, maxGridY);
        if (!cancelled) setClaimedSquares(squares);
      } catch (e) {
        console.error(e);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [view, size]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { offsetX, offsetY, scale } = view;
    const { width, height } = size;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const minGridX = Math.max(0, Math.floor(-offsetX / scale));
    const minGridY = Math.max(0, Math.floor(-offsetY / scale));
    const maxGridX = Math.min(GRID_SIZE - 1, Math.ceil((width - offsetX) / scale));
    const maxGridY = Math.min(GRID_SIZE - 1, Math.ceil((height - offsetY) / scale));

    const squarePixelSize = scale;

    // 1. Draw checkered background
    if (squarePixelSize >= 0.5) {
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        const screenY = gy * scale + offsetY;
        const isEvenRow = gy % 2 === 0;
        for (let gx = minGridX; gx <= maxGridX; gx++) {
          const screenX = gx * scale + offsetX;
          const isEvenCol = gx % 2 === 0;
          ctx.fillStyle = (isEvenRow === isEvenCol) ? CHECK_A : CHECK_B;
          ctx.fillRect(screenX, screenY, scale + 0.5, scale + 0.5);
        }
      }
    } else {
      const patSize = 2;
      const patCanvas = document.createElement('canvas');
      patCanvas.width = patSize;
      patCanvas.height = patSize;
      const pctx = patCanvas.getContext('2d');
      pctx.fillStyle = CHECK_A;
      pctx.fillRect(0, 0, patSize, patSize);
      pctx.fillStyle = CHECK_B;
      pctx.fillRect(1, 0, 1, 1);
      pctx.fillRect(0, 1, 1, 1);
      const pattern = ctx.createPattern(patCanvas, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render claimed squares
    for (const sq of claimedSquares) {
      const sx = sq.x * scale + offsetX;
      const sy = sq.y * scale + offsetY;
      ctx.fillStyle = sq.color;
      ctx.fillRect(sx, sy, scale + 0.5, scale + 0.5);

      if (sq.userId === userId) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, scale * 0.15);
        ctx.strokeRect(sx, sy, scale, scale);
      }
    }

    // 3. Render STAGED square (Static, high-visibility highlight)
    if (stagedSquare && typeof stagedSquare.x === 'number' && typeof stagedSquare.y === 'number') {
      const sx = stagedSquare.x * scale + offsetX;
      const sy = stagedSquare.y * scale + offsetY;

      // Semi-transparent fill
      ctx.fillStyle = stagedSquare.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(sx, sy, scale + 0.5, scale + 0.5);
      ctx.globalAlpha = 1.0;

      // Thick dashed border
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = Math.max(2, scale * 0.1);
      ctx.setLineDash([Math.max(4, scale * 0.2), Math.max(4, scale * 0.2)]);
      ctx.strokeRect(sx + 1, sy + 1, scale - 2, scale - 2);
      ctx.setLineDash([]); // Reset
    }

    // 4. Hover highlight (only if not staged and valid)
    if (hoveredSquare && typeof hoveredSquare.x === 'number' && !committing) {
      const isStaged = stagedSquare && stagedSquare.x === hoveredSquare.x && stagedSquare.y === hoveredSquare.y;
      if (!isStaged) {
        const sx = hoveredSquare.x * scale + offsetX;
        const sy = hoveredSquare.y * scale + offsetY;
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(sx + 1, sy + 1, scale - 2, scale - 2);
      }
    }

    // 5. Grid lines at high zoom
    if (squarePixelSize >= 8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let gx = minGridX; gx <= maxGridX + 1; gx++) {
        const sx = gx * scale + offsetX;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let gy = minGridY; gy <= maxGridY + 1; gy++) {
        const sy = gy * scale + offsetY;
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }
  }, [view, size, claimedSquares, hoveredSquare, userId, committing, stagedSquare]);

  const screenToGrid = useCallback((screenX, screenY) => {
    const { offsetX, offsetY, scale } = viewRef.current;
    return {
      x: Math.floor((screenX - offsetX) / scale),
      y: Math.floor((screenY - offsetY) / scale),
    };
  }, []);

  const handleMouseDown = (e) => {
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: viewRef.current.offsetX,
      startOffsetY: viewRef.current.offsetY,
      moved: false,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const g = screenToGrid(mx, my);
    if (g.x >= 0 && g.y >= 0 && g.x < GRID_SIZE && g.y < GRID_SIZE) {
      setHoveredSquare(g);
    } else {
      setHoveredSquare(null);
    }

    const ds = dragState.current;
    if (ds.isDragging) {
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) ds.moved = true;
      setView((v) => ({
        ...v,
        offsetX: ds.startOffsetX + dx,
        offsetY: ds.startOffsetY + dy,
      }));
    }
  };

  const handleMouseUp = (e) => {
    const ds = dragState.current;
    if (ds.isDragging && !ds.moved) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const g = screenToGrid(mx, my);

      if (g.x >= 0 && g.y >= 0 && g.x < GRID_SIZE && g.y < GRID_SIZE) {
        const claimed = claimedSquares.find(
            (sq) => sq.x === g.x && sq.y === g.y && sq.userId !== userId
        );

        if (claimed) {
          return; // Can't stage a square owned by someone else
        }

        setStagedSquare({ x: g.x, y: g.y, color: userColor });
      }
    }
    ds.isDragging = false;
  };

  const handleMouseLeave = () => {
    dragState.current.isDragging = false;
    setHoveredSquare(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { offsetX, offsetY, scale } = viewRef.current;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * zoomFactor));

    const newOffsetX = cx - (cx - offsetX) * (newScale / scale);
    const newOffsetY = cy - (cy - offsetY) * (newScale / scale);

    setView({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Safe fallback for rendering coordinates
  const formatCoord = (val) => (typeof val === 'number' ? val.toLocaleString() : '0');

  return (
      <div ref={containerRef} className="canvas-container">
        <canvas
            ref={canvasRef}
            style={{
              width: size.width,
              height: size.height,
              cursor: dragState.current.isDragging ? 'grabbing' : 'crosshair'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
        {hoveredSquare && typeof hoveredSquare.x === 'number' && (
            <div className="coords-badge">
              ({formatCoord(hoveredSquare.x)}, {formatCoord(hoveredSquare.y)})
            </div>
        )}
      </div>
  );
}
