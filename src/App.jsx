// App.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import CanvasGrid from './CanvasGrid';
import { commitSquare, getUserSquare, loadInitialData } from './mockApi';
import { saveToLocalStorage, downloadJsonFile, loadFromJsonFile } from './storage';
import './App.css';

const CURRENT_USER_ID = 'user_123';

export default function App() {
  const [userColor, setUserColor] = useState('#e74c3c');
  const [mySquare, setMySquare] = useState(null);
  const [stagedSquare, setStagedSquare] = useState(null); // NEW: Stage state
  const [committing, setCommitting] = useState(false);
  const [status, setStatus] = useState({ type: 'info', text: 'Click any square to stage it, then submit.' });
  const [dataLoaded, setDataLoaded] = useState(false);
  const fileInputRef = useRef(null);

  // Load initial data on mount
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

  // Handle submit: commit staged square and save to JSON
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
      setStagedSquare(null); // Clear stage after successful commit

      // Save to localStorage
      saveToLocalStorage();

      setStatus({
        type: 'success',
        text: `Claimed (${stagedSquare.x.toLocaleString()}, ${stagedSquare.y.toLocaleString()})! Data saved.`
      });
    } else {
      setStatus({ type: 'error', text: result.error });
      setStagedSquare(null); // Clear stage on error too
    }
    setCommitting(false);
  }, [stagedSquare, committing]);

  // Handle download JSON
  const handleDownload = () => {
    downloadJsonFile();
    setStatus({ type: 'success', text: 'Downloaded grid-data.json' });
  };

  // Handle upload JSON
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const count = await loadFromJsonFile(file);
      setStatus({ type: 'success', text: `Loaded ${count} squares from file` });
      // Refresh user's square
      const sq = await getUserSquare(CURRENT_USER_ID);
      if (sq) {
        setMySquare(sq);
        setUserColor(sq.color);
      }
    } catch (err) {
      setStatus({ type: 'error', text: 'Failed to load file' });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle clear stage
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
                      {committing ? 'Submitting...' : 'Submit'}
                    </button>
                  </>
              )}

              <button
                  className="btn btn-secondary"
                  onClick={handleDownload}
              >
                Download JSON
              </button>

              <button
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
              >
                Upload JSON
              </button>
              <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleUpload}
              />
            </div>
          </div>

          {mySquare && (
              <div className="my-square-info">
                Your square: ({mySquare.x.toLocaleString()}, {mySquare.y.toLocaleString()})
              </div>
          )}
        </footer>

        {stagedSquare && (
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
