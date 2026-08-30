// CanvasGrid.jsx
// This component owns the <canvas> and handles:
//   - Pan (mouse drag)
//   - Zoom (mouse wheel, centered on cursor)
//   - Coordinate conversion between screen pixels and grid units
//   - Viewport culling: only fetches & draws squares currently visible
//   - Click-to-claim interaction
//
// COORDINATE SYSTEM:
//   - Grid space: (0,0) is top-left of the 1B x 1B grid. Each square is 1 unit.
//   - Screen space: (0,0) is top-left of the canvas element.
//   - Transform: screenX = gridX * scale + offsetX
//                gridX  = (screenX - offsetX) / scale
//   - `scale` = pixels per grid square. At scale=1, 1 grid square = 1 pixel.

import { useEffect, useRef, useState, useCallback } from 'react';
import { getVisibleSquares, GRID_SIZE_EXPORT as GRID_SIZE } from './mockApi';

const MIN_SCALE = 0.0000005; // Very zoomed out
const MAX_SCALE = 64;        // Very zoomed in (each square = 64px)

// Checkered pattern colors for empty squares
const CHECK_A = '#f5f5f5';
const CHECK_B = '#e0e0e0';

export default function CanvasGrid({
  userId,
  userColor,
  onSquareClaimed,
  onStatusMessage,
  committing,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Viewport transform state
  // offset = screen-space translation; scale = pixels per grid unit
  const [view, setView] = useState({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });

  // Size of the canvas in CSS pixels
  const [size, setSize] = useState({ width: 800, height: 600 });

  // Claimed squares currently visible (fetched from mock API)
  const [claimedSquares, setClaimedSquares] = useState([]);

  // The grid square currently under the cursor (for hover highlight)
  const [hoveredSquare, setHoveredSquare] = useState(null);

  // Refs for drag state (avoid re-renders during drag)
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  // Refs so event handlers always see latest values without re-binding
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // ---------------- ResizeObserver ----------------
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

  // ---------------- Initial view: center on middle of grid ----------------
  useEffect(() => {
    if (size.width && size.height) {
      // Start zoomed in a bit so the user sees individual squares
      const initialScale = 8;
      const centerGrid = GRID_SIZE / 2;
      setView({
        scale: initialScale,
        offsetX: size.width / 2 - centerGrid * initialScale,
        offsetY: size.height / 2 - centerGrid * initialScale,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  // ---------------- Viewport culling: fetch visible squares ----------------
  // Recompute whenever view or size changes. We debounce slightly via
  // requestAnimationFrame to avoid hammering the mock API during pan/zoom.
  useEffect(() => {
    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      const { offsetX, offsetY, scale } = view;
      const { width, height } = size;

      // Convert viewport corners to grid coordinates
      const minGridX = -offsetX / scale;
      const minGridY = -offsetY / scale;
      const maxGridX = (width - offsetX) / scale;
      const maxGridY = (height - offsetY) / scale;

      // If we're so zoomed out that we'd need to fetch millions of squares,
      // just skip the fetch — we won't be able to render them anyway.
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

  // ---------------- Canvas drawing ----------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { offsetX, offsetY, scale } = view;
    const { width, height } = size;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Compute visible grid bounds
    const minGridX = Math.max(0, Math.floor(-offsetX / scale));
    const minGridY = Math.max(0, Math.floor(-offsetY / scale));
    const maxGridX = Math.min(GRID_SIZE - 1, Math.ceil((width - offsetX) / scale));
    const maxGridY = Math.min(GRID_SIZE - 1, Math.ceil((height - offsetY) / scale));

    // --- Render the checkered pattern ---
    // If each square is smaller than ~0.5px, individual squares are invisible.
    // We still draw the checkered pattern by using a 2x2 tile pattern.
    const squarePixelSize = scale;

    if (squarePixelSize >= 0.5) {
      // Draw checkered background for visible region
      // Optimization: batch by color to minimize fillStyle changes
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        const screenY = gy * scale + offsetY;
        const isEvenRow = gy % 2 === 0;
        for (let gx = minGridX; gx <= maxGridX; gx++) {
          const screenX = gx * scale + offsetX;
          const isEvenCol = gx % 2 === 0;
          ctx.fillStyle = (isEvenRow === isEvenCol) ? CHECK_A : CHECK_B;
          ctx.fillRect(screenX, screenY, scale + 0.5, scale + 0.5); // +0.5 avoids seams
        }
      }
    } else {
      // Very zoomed out: draw a pattern fill instead of per-square
      // Create a 2x2 checkered pattern at the appropriate scale
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

    // --- Render claimed squares on top ---
    for (const sq of claimedSquares) {
      const sx = sq.x * scale + offsetX;
      const sy = sq.y * scale + offsetY;
      ctx.fillStyle = sq.color;
      ctx.fillRect(sx, sy, scale + 0.5, scale + 0.5);

      // If the square belongs to the current user, draw a highlight border
      if (sq.userId === userId) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, scale * 0.1);
        ctx.strokeRect(sx, sy, scale, scale);
      }
    }

    // --- Hover highlight ---
    if (hoveredSquare && !committing) {
      const sx = hoveredSquare.x * scale + offsetX;
      const sy = hoveredSquare.y * scale + offsetY;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, scale - 2, scale - 2);
    }

    // --- Grid lines at high zoom ---
    if (squarePixelSize >= 8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
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
  }, [view, size, claimedSquares, hoveredSquare, userId, committing]);

  // ---------------- Coordinate helpers ----------------
  const screenToGrid = useCallback((screenX, screenY) => {
    const { offsetX, offsetY, scale } = viewRef.current;
    return {
      x: Math.floor((screenX - offsetX) / scale),
      y: Math.floor((screenY - offsetY) / scale),
    };
  }, []);

  // ---------------- Mouse handlers ----------------
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: viewRef.current.offsetX,
      startOffsetY: viewRef.current.offsetY,
      moved: false,
    };
    // Prevent text selection while dragging
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Update hover
    const g = screenToGrid(mx, my);
    if (g.x >= 0 && g.y >= 0 && g.x < GRID_SIZE && g.y < GRID_SIZE) {
      setHoveredSquare(g);
    } else {
      setHoveredSquare(null);
    }

    // Handle drag
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
      // It was a click, not a drag -> attempt to claim
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const g = screenToGrid(mx, my);
      if (g.x >= 0 && g.y >= 0 && g.x < GRID_SIZE && g.y < GRID_SIZE) {
        onSquareClaimed(g.x, g.y);
      }
    }
    ds.isDragging = false;
  };

  const handleMouseLeave = () => {
    dragState.current.isDragging = false;
    setHoveredSquare(null);
  };

  // ---------------- Zoom (wheel) ----------------
  // Zoom is centered on the cursor position so the point under the cursor
  // stays fixed on screen. Math:
  //   newOffset = cursorScreen - (cursorScreen - oldOffset) * (newScale / oldScale)
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

  // Attach wheel with { passive: false } so we can preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, cursor: dragState.current.isDragging ? 'grabbing' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {hoveredSquare && (
        <div className="coords-badge">
          ({hoveredSquare.x.toLocaleString()}, {hoveredSquare.y.toLocaleString()})
        </div>
      )}
    </div>
  );
}