import { Box, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const VideoCallLayout = ({
  children,
  leftContent,
  rightContent,
  controls,
  chatButton,
  overlayContent,
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left Side - Video Area (70%) */}
      <Box
        sx={{
          flex: '0 0 70%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F5F5F5',
          p: 2,
        }}
      >
        {/* Main Video Content */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#000000',
            borderRadius: 2,
          }}
        >
          {leftContent}

          {/* PIP Manager Video Overlay (top-right) */}
          {overlayContent && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 100,
              }}
            >
              {overlayContent}
            </Box>
          )}
        </Box>

        {/* Video Controls at Bottom */}
        {controls && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
            }}
          >
            {controls}
          </Box>
        )}
      </Box>

      {/* Right Side - Sidebar (30%) */}
      <Box
        sx={{
          flex: '0 0 30%',
          height: '100%',
          backgroundColor: '#FFFFFF',
          overflowY: 'auto',
          borderLeft: '1px solid #E0E0E0',
        }}
      >
        {rightContent}
      </Box>

      {/* Chat Button - Bottom Right */}
      {chatButton && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 100,
            right: 16,
            zIndex: 150,
          }}
        >
          {chatButton}
        </Box>
      )}

      {/* Children (for additional overlays if needed) */}
      {children}
    </Box>
  );
};

VideoCallLayout.propTypes = {
  children: PropTypes.node,
  leftContent: PropTypes.node.isRequired,
  rightContent: PropTypes.node.isRequired,
  controls: PropTypes.node,
  chatButton: PropTypes.node,
  overlayContent: PropTypes.node,
};

export default VideoCallLayout;
