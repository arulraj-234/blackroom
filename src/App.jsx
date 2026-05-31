import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import ErrorBoundary from './components/ErrorBoundary';

// Placeholder for the main app container
function MainApp() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Blackroom</h1>
        <p className="text-gray-400">You are logged in as {user.email}</p>
        <button 
          onClick={() => {
             import('./lib/supabase').then(({ supabase }) => supabase.auth.signOut());
          }}
          className="mt-4 px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ErrorBoundary>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<MainApp />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
