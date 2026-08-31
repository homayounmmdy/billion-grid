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

  const handleSubmit = useCallback(() => {
    if (!stagedSquare) return;

    const finalUsername = githubUsername.trim();
    if (!finalUsername) {
      setShowUsernameModal(true);
      return;
    }

    // 1. Exact format the CI expects
    const issueTitle = `Claim: Square (${stagedSquare.x.toLocaleString()}, ${stagedSquare.y.toLocaleString()})`;
    const issueBody = `X: ${stagedSquare.x}\nY: ${stagedSquare.y}\nColor: ${stagedSquare.color}\nUserId: ${finalUsername}`;
    const labels = 'block-claim';

    // 2. Construct the GitHub Issue creation URL
    const repoUrl = 'https://github.com/homayounmmdy/billion-grid';
    const issueUrl = `${repoUrl}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}&labels=${encodeURIComponent(labels)}`;

    // 3. Save username and redirect
    localStorage.setItem('billionGridGithubUser', finalUsername);
    setStatus({ type: 'info', text: 'Redirecting to GitHub to finalize claim...' });

        setTimeout(() => {
      window.open(issueUrl, '_blank');
      setStagedSquare(null);
    }, 500);
  }, [stagedSquare, githubUsername]);
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
                      {committing ? 'Loading...' : 'Submit'}
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
