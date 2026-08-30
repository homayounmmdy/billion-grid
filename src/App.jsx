// App.jsx
import { useState, useEffect, useCallback } from 'react';
import CanvasGrid from './CanvasGrid';
import { commitSquare, getUserSquare, loadInitialData } from './mockApi';
import './App.css';

const DEFAULT_USER_ID = 'user_123'; // Fallback for local dev

export default function App() {
  const [userColor, setUserColor] = useState('#e74c3c');
  const [mySquare, setMySquare] = useState(null);
  const [stagedSquare, setStagedSquare] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [status, setStatus] = useState({ type: 'info', text: 'Click any square to stage it, then submit.' });
  const [dataLoaded, setDataLoaded] = useState(false);

  // New state for GitHub username
  const [githubUsername, setGithubUsername] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  useEffect(() => {
    loadInitialData().then(() => {
      setDataLoaded(true);
      // Try to load from localStorage if they've used it before
      const savedName = localStorage.getItem('billionGridGithubUser');
      if (savedName) setGithubUsername(savedName);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!stagedSquare || committing) return;

    // Require GitHub username in production
    if (!githubUsername.trim()) {
      setShowUsernameModal(true);
      return;
    }

    setCommitting(true);
    setStatus({
      type: 'info',
      text: `Preparing PR for (${stagedSquare.x.toLocaleString()}, ${stagedSquare.y.toLocaleString()})...`
    });

    try {
      // 1. Update local mock database (for immediate UI feedback)
      await commitSquare(stagedSquare.x, stagedSquare.y, githubUsername, stagedSquare.color);

      // 2. Call Vercel API to create the Pull Request
      const response = await fetch('/api/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: stagedSquare.x,
          y: stagedSquare.y,
          color: stagedSquare.color,
          githubUsername: githubUsername.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('billionGridGithubUser', githubUsername.trim());
        setStatus({
          type: 'success',
          text: 'PR Created! Redirecting to GitHub...'
        });
        setStagedSquare(null);

        // Open the PR in a new tab after a short delay
        setTimeout(() => {
          window.open(result.prUrl, '_blank');
          window.location.reload(); // Refresh to show updated state
        }, 1500);
      } else {
        setStatus({ type: 'error', text: result.error || 'Failed to create PR' });
        setCommitting(false);
      }
    } catch (error) {
      console.error('Error during submit:', error);
      setStatus({ type: 'error', text: 'Network error. Please try again.' });
      setCommitting(false);
    }
  }, [stagedSquare, committing, githubUsername]);

  const handleClearStage = () => {
    setStagedSquare(null);
    setStatus({ type: 'info', text: 'Stage cleared' });
  };

  if (!dataLoaded) {
    return <div className="loading">Loading grid data...</div>;
  }

  return (
      <div className="app">
        {/* Username Modal */}
        {showUsernameModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Enter your GitHub Username</h3>
                <p>This will be used as your User ID and to create the Pull Request.</p>
                <input
                    type="text"
                    placeholder="e.g., homayounmmdy"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    autoFocus
                />
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowUsernameModal(false)}>Cancel</button>
                  <button className="btn btn-submit" onClick={() => {
                    if (githubUsername.trim()) {
                      setShowUsernameModal(false);
                      handleSubmit();
                    }
                  }}>Continue</button>
                </div>
              </div>
            </div>
        )}

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

            <div className="user-badge" onClick={() => setShowUsernameModal(true)} style={{ cursor: 'pointer' }}>
              <span className="dot" style={{ background: userColor }} />
              {githubUsername || 'Set GitHub User'}
            </div>
          </div>
        </header>

        <main className="main">
          <CanvasGrid
              userId={githubUsername || DEFAULT_USER_ID}
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
                    <button className="btn btn-clear" onClick={handleClearStage} disabled={committing}>
                      Clear Stage
                    </button>
                    <button className="btn btn-submit" onClick={handleSubmit} disabled={committing}>
                      {committing ? 'Creating PR...' : 'Submit & Create PR'}
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
              <div className="stage-color" style={{ background: stagedSquare.color }} />
            </div>
        )}
      </div>
  );
}
