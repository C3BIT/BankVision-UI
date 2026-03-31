import { Box, IconButton, Paper } from '@mui/material';
import { CloseFullscreen, Fullscreen } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useState } from 'react';

const PIPVideo = ({ videoElement, onToggleSize, managerName = 'Manager' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (onToggleSize) {
      onToggleSize(!isExpanded);
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        width: isExpanded ? 300 : 200,
        height: isExpanded ? 225 : 150,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        border: '3px solid #0066FF',
        transition: 'all 0.3s ease',
        backgroundColor: '#000000',
      }}
    >
      {/* Video Content */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A1A1A',
        }}
      >
        {videoElement || (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '0.875rem',
            }}
          >
            {managerName}
          </Box>
        )}
      </Box>

      {/* Controls Overlay (appears on hover) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)',
          opacity: 0,
          transition: 'opacity 0.2s',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 1,
          '&:hover': {
            opacity: 1,
          },
        }}
      >
        {/* Top Bar - Manager Name */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box
            sx={{
              backgroundColor: 'rgba(0, 102, 255, 0.9)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            {managerName}
          </Box>

          {/* Toggle Size Button */}
          <IconButton
            size="small"
            onClick={handleToggle}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: '#FFFFFF',
              width: 28,
              height: 28,
              '&:hover': {
                backgroundColor: 'rgba(0, 102, 255, 0.9)',
              },
            }}
          >
            {isExpanded ? (
              <CloseFullscreen sx={{ fontSize: 16 }} />
            ) : (
              <Fullscreen sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

PIPVideo.propTypes = {
  videoElement: PropTypes.node,
  onToggleSize: PropTypes.func,
  managerName: PropTypes.string,
};

export default PIPVideo;
