import { Box, IconButton, Button, Tooltip } from '@mui/material';
import {
  VolumeUp as SpeakerIcon,
  VolumeOff as SpeakerOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideoIcon,
  VideocamOff as VideoOffIcon,
  Edit as WhiteboardIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const VideoControls = ({
  audioEnabled = true,
  videoEnabled = true,
  speakerEnabled = true,
  whiteboardOpen = false,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onToggleWhiteboard,
  onEndCall,
  disabled = false,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
      }}
    >
      {/* Speaker Button */}
      <Tooltip title={speakerEnabled ? 'Mute Speaker' : 'Unmute Speaker'}>
        <IconButton
          onClick={onToggleSpeaker}
          disabled={disabled}
          sx={{
            width: 56,
            height: 56,
            backgroundColor: speakerEnabled ? '#0066FF' : '#FF4444',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: speakerEnabled ? '#0052CC' : '#D32F2F',
            },
            '&.Mui-disabled': {
              backgroundColor: '#999999',
              color: '#CCCCCC',
            },
          }}
        >
          {speakerEnabled ? (
            <SpeakerIcon sx={{ fontSize: 24 }} />
          ) : (
            <SpeakerOffIcon sx={{ fontSize: 24 }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Microphone Button */}
      <Tooltip title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}>
        <IconButton
          onClick={onToggleAudio}
          disabled={disabled}
          sx={{
            width: 56,
            height: 56,
            backgroundColor: audioEnabled ? '#0066FF' : '#FF4444',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: audioEnabled ? '#0052CC' : '#D32F2F',
            },
            '&.Mui-disabled': {
              backgroundColor: '#999999',
              color: '#CCCCCC',
            },
          }}
        >
          {audioEnabled ? (
            <MicIcon sx={{ fontSize: 24 }} />
          ) : (
            <MicOffIcon sx={{ fontSize: 24 }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Video Button */}
      <Tooltip title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}>
        <IconButton
          onClick={onToggleVideo}
          disabled={disabled}
          sx={{
            width: 56,
            height: 56,
            backgroundColor: videoEnabled ? '#0066FF' : '#FF4444',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: videoEnabled ? '#0052CC' : '#D32F2F',
            },
            '&.Mui-disabled': {
              backgroundColor: '#999999',
              color: '#CCCCCC',
            },
          }}
        >
          {videoEnabled ? (
            <VideoIcon sx={{ fontSize: 24 }} />
          ) : (
            <VideoOffIcon sx={{ fontSize: 24 }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Whiteboard Button */}
      <Tooltip title={whiteboardOpen ? 'Close Whiteboard' : 'Open Whiteboard'}>
        <IconButton
          onClick={onToggleWhiteboard}
          disabled={disabled}
          sx={{
            width: 56,
            height: 56,
            backgroundColor: whiteboardOpen ? '#FF9800' : '#0066FF',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: whiteboardOpen ? '#F57C00' : '#0052CC',
            },
            '&.Mui-disabled': {
              backgroundColor: '#999999',
              color: '#CCCCCC',
            },
          }}
        >
          <WhiteboardIcon sx={{ fontSize: 24 }} />
        </IconButton>
      </Tooltip>

      {/* Divider */}
      <Box sx={{ width: 2, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.3)', mx: 1 }} />

      {/* End Call Button */}
      <Button
        onClick={onEndCall}
        disabled={disabled}
        sx={{
          px: 4,
          py: 1.5,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          backgroundColor: '#FF4444',
          color: '#FFFFFF',
          borderRadius: '24px',
          minWidth: 140,
          '&:hover': {
            backgroundColor: '#D32F2F',
          },
          '&.Mui-disabled': {
            backgroundColor: '#999999',
            color: '#CCCCCC',
          },
        }}
        variant="contained"
      >
        End Call
      </Button>
    </Box>
  );
};

VideoControls.propTypes = {
  audioEnabled: PropTypes.bool,
  videoEnabled: PropTypes.bool,
  speakerEnabled: PropTypes.bool,
  whiteboardOpen: PropTypes.bool,
  onToggleAudio: PropTypes.func.isRequired,
  onToggleVideo: PropTypes.func.isRequired,
  onToggleSpeaker: PropTypes.func,
  onToggleWhiteboard: PropTypes.func,
  onEndCall: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default VideoControls;
