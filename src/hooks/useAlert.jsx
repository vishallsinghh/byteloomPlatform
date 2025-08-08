// src/hooks/useAlert.js
import { useState, useCallback } from 'react';

export function useAlert() {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, type = 'info') => {
    const id = `alert-${Date.now()}-${Math.random()}`;
    const newAlert = { id, message, type };

    setAlerts(prev => [...prev, newAlert]);

    // auto-remove after 5s
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);

    return id;
  }, []);

  const removeAlert = useCallback(id => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    showAlert,
    removeAlert,
    clearAlerts
  };
}
