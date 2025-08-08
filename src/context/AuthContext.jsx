// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import { authUrl } from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Load stored tokens (refresh + access) from sessionStorage
  const raw = sessionStorage.getItem('tokens');
  const initialTokens = raw ? JSON.parse(raw) : null;

  const [tokens, setTokens] = useState(initialTokens);
  const [user, setUser] = useState(() => {
    if (initialTokens?.access) {
      try {
        const { user_id } = jwtDecode(initialTokens.access);
        return { id: user_id };
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialTokens?.access);

  // Auto-logout one minute before the access token expires
  useEffect(() => {
    if (!tokens?.access) return;
    let timer;
    try {
      const { exp } = jwtDecode(tokens.access);
      const msUntilLogout = exp * 1000 - Date.now() - 60_000;
      if (msUntilLogout <= 0) {
        logout();
      } else {
        timer = setTimeout(logout, msUntilLogout);
      }
    } catch {
      logout();
    }
    return () => clearTimeout(timer);
  }, [tokens]);

  const login = async ({ email, password }) => {
    const { data } = await axios.post(
      `${authUrl.BASE_URL}/auth/login/`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const newTokens = data.tokens;
    // Persist both tokens in sessionStorage
    sessionStorage.setItem('tokens', JSON.stringify(newTokens));
    // Also save the access token to localStorage
    localStorage.setItem('accessToken', newTokens.access);

    setTokens(newTokens);

    // Decode user ID from access token
    try {
      const { user_id } = jwtDecode(newTokens.access);
      setUser({ id: user_id });
    } catch {
      setUser(null);
    }

    setIsAuthenticated(true);
  };

  const logout = () => {
    sessionStorage.removeItem('tokens');
    localStorage.removeItem('accessToken');
    setTokens(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, tokens, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
