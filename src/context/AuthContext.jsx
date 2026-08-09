import { createContext, useContext, useState, useEffect } from 'react';
import { logout as logoutSession } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cw_dash_user');
      const token = localStorage.getItem('cw_dash_token')
        || localStorage.getItem('token')
        || localStorage.getItem('access_token');
      if (stored && token) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  const signOut = async () => {
    // logoutSession revokes the refresh token server-side then clears storage.
    await logoutSession();
    setUser(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('cw:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('cw:unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
