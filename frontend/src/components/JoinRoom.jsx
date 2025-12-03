import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const JoinRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/chat/check/${roomId}`);
      if (!response.ok) {
        throw new Error('Failed to check room');
      }

      const data = await response.json();
      if (data.exists) {
        navigate(`/room/${roomId}`, { state: { username } });
      } else {
        setError('Room not found or expired');
      }
    } catch (err) {
      setError('Error joining room. Please check the Room ID.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <div className="animate-in" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <div className="stealth-card">
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem' }}>JOIN ROOM</h2>

          {error && (
            <div className="error-container" style={{ marginBottom: '1rem' }}>
              <p className="error-text" style={{ color: 'var(--error)', textAlign: 'center', fontSize: '0.875rem' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="roomId" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                ROOM ID
              </label>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="input-stealth"
                required
              />
            </div>

            <div>
              <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                YOUR NICKNAME
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Guest"
                className="input-stealth"
                maxLength={20}
                required
              />
            </div>

            <button type="submit" className="btn btn-secondary" style={{ marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'CONNECTING...' : 'CONNECT'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link to="/" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
              ABORT
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
