import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Home = () => {
  return (
    <div className="container">
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <main className="main-content animate-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>

        <div className="animate-in delay-100" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          {/* Animated 3D Cube Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 3rem',
            perspective: '1000px'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transformStyle: 'preserve-3d',
              animation: 'rotateCube 20s infinite linear'
            }}>
              {/* Cube faces */}
              {['front', 'back', 'right', 'left', 'top', 'bottom'].map((face, i) => (
                <div
                  key={face}
                  style={{
                    position: 'absolute',
                    width: '80px',
                    height: '80px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'inset 0 0 30px rgba(255, 255, 255, 0.05), 0 0 20px rgba(255, 255, 255, 0.1)',
                    transform:
                      face === 'front' ? 'rotateY(0deg) translateZ(40px)' :
                        face === 'back' ? 'rotateY(180deg) translateZ(40px)' :
                          face === 'right' ? 'rotateY(90deg) translateZ(40px)' :
                            face === 'left' ? 'rotateY(-90deg) translateZ(40px)' :
                              face === 'top' ? 'rotateX(90deg) translateZ(40px)' :
                                'rotateX(-90deg) translateZ(40px)'
                  }}
                />
              ))}
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            lineHeight: '1',
            marginBottom: '1rem',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(to bottom, #fff 0%, #666 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            BLACKROOM
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            maxWidth: '320px',
            margin: '0 auto',
            fontFamily: 'var(--font-mono)'
          }}>
            Zero Trace. Total Stealth.
          </p>
        </div>

        <div className="action-buttons animate-in delay-200" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '320px'
        }}>
          <Link to="/create-room" className="btn btn-primary">
            INITIALIZE ROOM
          </Link>
          <Link to="/join-room" className="btn btn-secondary">
            JOIN EXISTING
          </Link>
        </div>

        <div className="animate-in delay-300" style={{
          marginTop: '3rem',
          width: '100%',
          maxWidth: '400px',
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'left'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '0.5rem'
            }}>
              // HOW IT WORKS
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { step: '01', title: 'INITIALIZE', desc: 'Create a secure, temporary room.' },
                { step: '02', title: 'INVITE', desc: 'Share the Room ID with your contact.' },
                { step: '03', title: 'CONNECT', desc: 'They join using the ID. No sign-up.' },
                { step: '04', title: 'VANISH', desc: 'Close the room. Data is obliterated.' }
              ].map((item) => (
                <div key={item.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-blue)',
                    fontSize: '0.75rem',
                    paddingTop: '0.2rem'
                  }}>
                    {item.step}
                  </span>
                  <div>
                    <div style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      marginBottom: '0.1rem'
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      lineHeight: '1.4'
                    }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Home;
