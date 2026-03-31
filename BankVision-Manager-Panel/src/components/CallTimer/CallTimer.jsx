import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { AccessTime } from '@mui/icons-material';

const CallTimer = ({ startTime, isActive, variant = 'default' }) => {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      const start = startTime || Date.now();

      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setElapsed(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isActive, startTime]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          container: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '16px',
            px: 1.5,
            py: 0.5,
          },
          icon: { fontSize: 16 },
          text: { fontSize: '0.875rem', fontWeight: 500 }
        };
      case 'large':
        return {
          container: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '12px',
            px: 3,
            py: 1.5,
          },
          icon: { fontSize: 28 },
          text: { fontSize: '1.5rem', fontWeight: 600, fontFamily: 'monospace' }
        };
      case 'minimal':
        return {
          container: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
          },
          icon: { fontSize: 14 },
          text: { fontSize: '0.75rem', fontWeight: 400, fontFamily: 'monospace' }
        };
      default:
        return {
          container: {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            px: 2,
            py: 1,
          },
          icon: { fontSize: 20 },
          text: { fontSize: '1rem', fontWeight: 500, fontFamily: 'monospace' }
        };
    }
  };

  const styles = getStyles();

  if (!isActive && elapsed === 0) {
    return null;
  }

  return (
    <Box sx={{ ...styles.container, color: 'white' }}>
      <AccessTime sx={styles.icon} />
      <Typography sx={styles.text}>
        {formatTime(elapsed)}
      </Typography>
    </Box>
  );
};

CallTimer.propTypes = {
  startTime: PropTypes.number,
  isActive: PropTypes.bool.isRequired,
  variant: PropTypes.oneOf(['default', 'compact', 'large', 'minimal'])
};

export default CallTimer;
