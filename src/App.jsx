// App.jsx
import { useState, useEffect, useCallback } from 'react';
import CanvasGrid from './CanvasGrid';
import { commitSquare, getUserSquare, loadInitialData } from './mockApi';
import './App.css';
import {saveNewSquareToServer} from "./storage.js";

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

    try {
      // 1. Update local mock database
    const result = await commitSquare(
        stagedSquare.x,
        stagedSquare.y,
        CURRENT_USER_ID,
        stagedSquare.color
    );

    if (result.success) {
      // 2. Send ONLY the new square to the server to be appended to the JSON file
      const serverSaved = await saveNewSquareToServer({
        x: stagedSquare.x,
        y: stagedSquare.y,
        userId: CURRENT_USER_ID,
        color: stagedSquare.color
      });

      if (serverSaved) {
        setStatus({
          type: 'success',
          text: 'Claimed and saved! Refreshing page...'
        });
        setStagedSquare(null);

          // 3. Automatically refresh the page after 1 second
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setStatus({
          type: 'warn',
          text: 'Claimed locally, but failed to update grid-data.json file.'
        });
        setCommitting(false);
      }
    } else {
      setStatus({ type: 'error', text: result.error });
      setStagedSquare(null);
    setCommitting(false);
      }
    } catch (error) {
      console.error('Error during submit:', error);
      setStatus({ type: 'error', text: 'An error occurred during submission.' });
      setCommitting(false);
    }
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
