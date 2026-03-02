import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('refinery_token');
    if (token) {
      getProfile()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('refinery_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem('refinery_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('refinery_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
