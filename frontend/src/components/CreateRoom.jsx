import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const CreateRoom = () => {
  const [roomName, setRoomName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || !username.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName, username }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      console.log('Room created:', data);
      setCreatedRoomData(data);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Error creating room. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRoomId = () => {
    if (createdRoomData?.roomId) {
      navigator.clipboard.writeText(createdRoomData.roomId);
      alert('Room ID copied to clipboard!');
    }
  };

  const handleEnterRoom = () => {
    if (createdRoomData?.roomId) {
      navigate(`/room/${createdRoomData.roomId}`, { state: { username } });
    }
  };

  if (createdRoomData) {
    return (
      <div className="container">
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50 }}>
          <ThemeToggle />
        </div>

        <div className="animate-in" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <div className="stealth-card">
            <h2 style={{ marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.5rem' }}>ROOM INITIALIZED</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Ready for secure communication.
            </p>

            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {roomName}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ID:</span>
                <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                  {createdRoomData.roomId}
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={handleCopyRoomId} className="btn btn-secondary" style={{ width: '100%' }}>
                COPY ID
              </button>
              <button onClick={handleEnterRoom} className="btn btn-primary" style={{ width: '100%' }}>
                ENTER ROOM
              </button>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link to="/" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                RETURN TO BASE
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <div className="animate-in" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <div className="stealth-card">
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem' }}>INITIALIZE ROOM</h2>

          {error && (
            <div className="error-container" style={{ marginBottom: '1rem' }}>
              <p className="error-text" style={{ color: 'var(--error)', textAlign: 'center', fontSize: '0.875rem' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="roomName" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                ROOM NAME
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Operation Blackout"
                className="input-stealth"
                maxLength={50}
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
                placeholder="e.g. Ghost"
                className="input-stealth"
                maxLength={20}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'CREATING...' : 'CREATE & JOIN'}
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

export default CreateRoom;
