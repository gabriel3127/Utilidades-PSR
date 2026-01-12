import { useState, useEffect } from 'react';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justWentOnline, setJustWentOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustWentOnline(true);
      
      // Reset flag após 5 segundos
      setTimeout(() => setJustWentOnline(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustWentOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, justWentOnline };
};