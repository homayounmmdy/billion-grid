// App.jsx
import { useState, useEffect, useCallback } from 'react';
import CanvasGrid from './CanvasGrid';
import { commitSquare, getUserSquare, loadInitialData } from './mockApi';
import { saveToServer, saveToLocalStorage } from './storage';
import './App.css';

const CURRENT_USER_ID = 'user_123';

export default function App() {
  const [userColor, setUserColor] = useState('#e74c3c');
  const [mySquare, setMySquare] = useState(null);
  const [stagedSquare, setStagedSquare] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [status, setStatus] = useState({ type: 'info', text: 'Click any square to stage it, then submit.' });
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    loadInitialData().then(() => {
      setDataLoaded(true);
      return getUserSquare(CURRENT_USER_ID);
    }).then((sq) => {
      if (sq) {
        setMySquare(sq);
        setUserColor(sq.color);
      }
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!stagedSquare || committing) return;

    setCommitting(true);
    setStatus({
      type: 'info',
      text: `Submitting (${stagedSquare.x.toLocaleString()}, ${stagedSquare.y.toLocaleString()})...`
    });

    const result = await commitSquare(
        stagedSquare.x,
        stagedSquare.y,
        CURRENT_USER_ID,
        stagedSquare.color
    );

    if (result.success) {
      setMySquare({ x: stagedSquare.x, y: stagedSquare.y, color: stagedSquare.color });
      setStagedSquare(null);

      // Save to both localStorage (instant fallback) and the server (public/grid-data.json)
      saveToLocalStorage();
      const serverSaved = await saveToServer();

      if (serverSaved) {
        setStatus({
          type: 'success',
          text: `Claimed! Data saved directly to public/grid-data.json.`
        });
      } else {
        setStatus({
          type: 'warn',
          text: `Claimed locally, but failed to update grid-data.json file.`
        });
      }
    } else {
      setStatus({ type: 'error', text: result.error });
      setStagedSquare(null);
    }
    setCommitting(false);
  }, [stagedSquare, committing]);

  const handleClearStage = () => {
    setStagedSquare(null);
    setStatus({ type: 'info', text: 'Stage cleared' });
  };

  if (!dataLoaded) {
    return <div className="loading">Loading grid data...</div>;
  }

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
                  disabled={committing || !!stagedSquare}
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
              stagedSquare={stagedSquare}
              setStagedSquare={setStagedSquare}
              committing={committing}
          />
        </main>

        <footer className="status-bar">
          <div className="status-actions">
            <div className={`status status-${status.type}`}>
              {committing && <span className="spinner" />}
              {status.text}
            </div>

            <div className="action-buttons">
              {stagedSquare && (
                  <>
                    <button
                        className="btn btn-clear"
                        onClick={handleClearStage}
                        disabled={committing}
                    >
                      Clear Stage
                    </button>
                    <button
                        className="btn btn-submit"
                        onClick={handleSubmit}
                        disabled={committing}
                    >
                      {committing ? 'Saving...' : 'Submit & Save to File'}
                    </button>
                  </>
              )}
            </div>
          </div>

          {mySquare && (
              <div className="my-square-info">
                Your square: ({mySquare.x.toLocaleString()}, {mySquare.y.toLocaleString()})
              </div>
          )}
        </footer>

        {stagedSquare && typeof stagedSquare.x === 'number' && (
            <div className="stage-info">
              <div className="stage-label">STAGED</div>
              <div className="stage-coords">
                ({stagedSquare.x.toLocaleString()}, {stagedSquare.y.toLocaleString()})
              </div>
              <div
                  className="stage-color"
                  style={{ background: stagedSquare.color }}
              />
            </div>
        )}
      </div>
  );
}
