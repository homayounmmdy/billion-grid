// App.jsx
import { useState, useEffect, useCallback } from 'react';
import CanvasGrid from './CanvasGrid';
import { commitSquare, getUserSquare } from './mockApi';
import './App.css';

const CURRENT_USER_ID = 'user_123';

export default function App() {
  const [userColor, setUserColor] = useState('#e74c3c');
  const [mySquare, setMySquare] = useState(null); // { x, y, color }
  const [committing, setCommitting] = useState(false);
  const [status, setStatus] = useState({ type: 'info', text: 'Click any square to claim it.' });

  // Load user's currently-owned square on mount
  useEffect(() => {
    getUserSquare(CURRENT_USER_ID).then((sq) => {
      if (sq) {
        setMySquare(sq);
        setUserColor(sq.color);
      }
    });
  }, []);

  const handleClaim = useCallback(async (x, y) => {
    if (committing) return;

    // If user already owns this exact square, do nothing
    if (mySquare && mySquare.x === x && mySquare.y === y) {
      setStatus({ type: 'warn', text: 'You already own this square.' });
      return;
    }

    setCommitting(true);
    setStatus({ type: 'info', text: `Committing (${x.toLocaleString()}, ${y.toLocaleString()})...` });

    const result = await commitSquare(x, y, CURRENT_USER_ID, userColor);

    if (result.success) {
      setMySquare({ x, y, color: userColor });
      setStatus({ type: 'success', text: `Claimed (${x.toLocaleString()}, ${y.toLocaleString()})!` });
    } else {
      setStatus({ type: 'error', text: result.error });
    }
    setCommitting(false);
  }, [committing, mySquare, userColor]);

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">
          <span className="logo">◼</span>
          <h1>Billion Grid</h1>
          <span className="subtitle">1,000,000,000 × 1,000,000,000</span>
        </div>

        <div className="controls">
          <label className="color-control">
            <span>Your color:</span>
            <input
              type="color"
              value={userColor}
              disabled={committing}
              onChange={(e) => setUserColor(e.target.value)}
            />
          </label>

          <div className="user-badge">
            <span className="dot" style={{ background: userColor }} />
            {CURRENT_USER_ID}
          </div>
        </div>
      </header>

      <main className="main">
        <CanvasGrid
          userId={CURRENT_USER_ID}
          userColor={userColor}
          onSquareClaimed={handleClaim}
          onStatusMessage={setStatus}
          committing={committing}
        />
      </main>

      <footer className="status-bar">
        <div className={`status status-${status.type}`}>
          {committing && <span className="spinner" />}
          {status.text}
        </div>
        {mySquare && (
          <div className="my-square-info">
            Your square: ({mySquare.x.toLocaleString()}, {mySquare.y.toLocaleString()})
          </div>
        )}
      </footer>
    </div>
  );
}