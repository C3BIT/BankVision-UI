import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

const useSessionTimeout = () => {
  const { isAuthenticated, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_TIME);

  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownRef = useRef(null);

  const handleLogout = useCallback(() => {
    logout();
    setShowWarning(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  }, [logout]);

  const resetTimer = useCallback(() => {
    setShowWarning(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (isAuthenticated) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        setRemainingTime(WARNING_TIME);

        countdownRef.current = setInterval(() => {
          setRemainingTime((prev) => {
            if (prev <= 1000) {
              clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);
      }, SESSION_TIMEOUT - WARNING_TIME);

      timeoutRef.current = setTimeout(() => {
        handleLogout();
      }, SESSION_TIMEOUT);
    }
  }, [isAuthenticated, handleLogout]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, showWarning, resetTimer]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    handleLogout,
  };
};

export default useSessionTimeout;
