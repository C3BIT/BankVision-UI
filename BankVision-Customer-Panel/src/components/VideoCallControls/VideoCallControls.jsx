import { Box, IconButton, Tooltip, useMediaQuery, useTheme, Badge } from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  Edit as WhiteboardIcon,
  Person,
  Settings,
  Chat,
  CallEnd,
} from '@mui/icons-material';

const VideoCallControls = ({
  isMuted = false,
  isVideoOff = false,
  whiteboardOpen = false,
  onToggleMic,
  onToggleVideo,
  onToggleWhiteboard,
  onToggleParticipants,
  onToggleChat,
  onOpenSettings,
  onEndCall,
  unreadChatCount = 0,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const controlButtonStyle = {
    width: { xs: 40, sm: 48 },
    height: { xs: 40, sm: 48 },
    backgroundColor: '#0066FF',
    color: '#FFFFFF',
    '&:hover': {
      backgroundColor: '#0052CC',
      transform: 'scale(1.05)',
    },
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 2px 8px rgba(0, 102, 255, 0.3)',
  };

  const endCallButtonStyle = {
    width: { xs: '100%', sm: 56 },
    height: { xs: 40, sm: 56 },
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
    borderRadius: { xs: '20px', sm: '50%' },
    px: { xs: 3, sm: 0 },
    '&:hover': {
      backgroundColor: '#CC0000',
      transform: 'scale(1.05)',
    },
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 2px 12px rgba(255, 68, 68, 0.4)',
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: { xs: 16, sm: 24 },
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1.5, sm: 1.5 },
        alignItems: 'center',
        zIndex: 10,
        width: { xs: 'auto', sm: 'auto' },
      }}
    >
      {/* Control Buttons Row */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 0.75, sm: 1.5 },
          alignItems: 'center',
          backgroundColor: 'rgba(30, 30, 30, 0.85)',
          padding: { xs: '10px 16px', sm: '12px 20px' },
          borderRadius: '50px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Microphone Toggle */}
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'} disableHoverListener={isMobile}>
          <IconButton sx={controlButtonStyle} onClick={onToggleMic}>
            {isMuted ? <MicOff sx={{ fontSize: { xs: 18, sm: 24 } }} /> : <Mic sx={{ fontSize: { xs: 18, sm: 24 } }} />}
          </IconButton>
        </Tooltip>

        {/* Camera Toggle */}
        <Tooltip title={isVideoOff ? 'Turn on camera' : 'Turn off camera'} disableHoverListener={isMobile}>
          <IconButton sx={controlButtonStyle} onClick={onToggleVideo}>
            {isVideoOff ? <VideocamOff sx={{ fontSize: { xs: 18, sm: 24 } }} /> : <Videocam sx={{ fontSize: { xs: 18, sm: 24 } }} />}
          </IconButton>
        </Tooltip>

        {/* Whiteboard Toggle */}
        <Tooltip title={whiteboardOpen ? 'Close Whiteboard' : 'Open Whiteboard'} disableHoverListener={isMobile}>
          <IconButton
            sx={{
              ...controlButtonStyle,
              backgroundColor: whiteboardOpen ? '#FF9800' : '#0066FF',
              '&:hover': {
                backgroundColor: whiteboardOpen ? '#F57C00' : '#0052CC',
                transform: 'scale(1.05)',
              },
            }}
            onClick={onToggleWhiteboard}
          >
            <WhiteboardIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
          </IconButton>
        </Tooltip>

        {/* Chat Toggle */}
        <Tooltip title="Chat" disableHoverListener={isMobile}>
          <IconButton sx={controlButtonStyle} onClick={onToggleChat}>
            <Badge
              badgeContent={unreadChatCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.65rem',
                  height: 16,
                  minWidth: 16,
                  padding: '0 4px',
                }
              }}
            >
              <Chat sx={{ fontSize: { xs: 18, sm: 24 } }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Participants */}
        <Tooltip title="Participants" disableHoverListener={isMobile}>
          <IconButton sx={controlButtonStyle} onClick={onToggleParticipants}>
            <Person sx={{ fontSize: { xs: 18, sm: 24 } }} />
          </IconButton>
        </Tooltip>

        {/* Settings */}
        <Tooltip title="Settings" disableHoverListener={isMobile}>
          <IconButton sx={controlButtonStyle} onClick={onOpenSettings}>
            <Settings sx={{ fontSize: { xs: 18, sm: 24 } }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* End Call Button - Separate row on mobile, inline on desktop */}
      {isMobile && (
        <Box
          sx={{
            backgroundColor: '#FF4444',
            borderRadius: '20px',
            px: 4,
            py: 1,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#CC0000',
            },
            boxShadow: '0 2px 12px rgba(255, 68, 68, 0.4)',
          }}
          onClick={onEndCall}
        >
          End Call
        </Box>
      )}

      {!isMobile && (
        <Box
          sx={{
            backgroundColor: '#FF4444',
            borderRadius: '24px',
            px: 3,
            py: 1.25,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            boxShadow: '0 4px 12px rgba(255, 68, 68, 0.4)',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#CC0000',
              boxShadow: '0 6px 16px rgba(255, 68, 68, 0.5)',
              transform: 'scale(1.05)',
            },
          }}
          onClick={onEndCall}
        >
          <CallEnd sx={{ fontSize: 18 }} />
          End Call
        </Box>
      )}
    </Box>
  );
};

export default VideoCallControls;
