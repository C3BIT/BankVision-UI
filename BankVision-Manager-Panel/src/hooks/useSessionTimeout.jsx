import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/auth/authSlice';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

const useSessionTimeout = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_TIME);

  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const handleLogout = useCallback(() => {
    dispatch(logout());
    setShowWarning(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  }, [dispatch]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    if (isAuthenticated) {
      // Set warning timeout
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        setRemainingTime(WARNING_TIME);

        // Start countdown
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

      // Set logout timeout
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
      // Only reset if warning is not showing
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
  }, [isAuthenticated, showWarning, resetTimer]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    handleLogout,
  };
};

export default useSessionTimeout;
