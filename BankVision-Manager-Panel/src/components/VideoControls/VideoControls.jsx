import { Box, IconButton, Button, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import {
  VolumeUp as SpeakerIcon,
  VolumeOff as SpeakerOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideoIcon,
  VideocamOff as VideoOffIcon,
  Edit as WhiteboardIcon,
  PauseCircleFilled as HoldIcon,
  PlayCircleFilled as ResumeIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import VirtualBackgroundMenu from '../VirtualBackgroundMenu/VirtualBackgroundMenu';
import { colors } from '../../styles/tokens';

const VideoControls = ({
  audioEnabled = true,
  videoEnabled = true,
  speakerEnabled = true,
  whiteboardOpen = false,
  activeBackground = 'none',
  onHold = false,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onToggleWhiteboard,
  onSetBackground,
  onToggleHold,
  onEndCall,
  disabled = false,
}) => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const buttonSize = isCompact ? 44 : 56;
  const iconSize = isCompact ? 20 : 24;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: { xs: 1, md: 2 },
        padding: { xs: 1, md: 2 },
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        maxWidth: '100%',
      }}
    >
      {/* Speaker Button */}
      <Tooltip title={speakerEnabled ? 'Mute Speaker' : 'Unmute Speaker'}>
        <IconButton
          onClick={onToggleSpeaker}
          disabled={disabled}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: speakerEnabled ? colors.primary : colors.error,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: speakerEnabled ? colors.primaryDark : colors.error,
            },
            '&.Mui-disabled': {
              backgroundColor: colors.textMuted,
              color: '#CCCCCC',
            },
          }}
        >
          {speakerEnabled ? (
            <SpeakerIcon sx={{ fontSize: iconSize }} />
          ) : (
            <SpeakerOffIcon sx={{ fontSize: iconSize }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Microphone Button */}
      <Tooltip title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}>
        <IconButton
          onClick={onToggleAudio}
          disabled={disabled || onHold}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: audioEnabled ? colors.primary : colors.error,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: audioEnabled ? colors.primaryDark : colors.error,
            },
            '&.Mui-disabled': {
              backgroundColor: colors.textMuted,
              color: '#CCCCCC',
            },
          }}
        >
          {audioEnabled ? (
            <MicIcon sx={{ fontSize: iconSize }} />
          ) : (
            <MicOffIcon sx={{ fontSize: iconSize }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Video Button */}
      <Tooltip title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}>
        <IconButton
          onClick={onToggleVideo}
          disabled={disabled || onHold}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: videoEnabled ? colors.primary : colors.error,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: videoEnabled ? colors.primaryDark : colors.error,
            },
            '&.Mui-disabled': {
              backgroundColor: colors.textMuted,
              color: '#CCCCCC',
            },
          }}
        >
          {videoEnabled ? (
            <VideoIcon sx={{ fontSize: iconSize }} />
          ) : (
            <VideoOffIcon sx={{ fontSize: iconSize }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Whiteboard Button */}
      <Tooltip title={whiteboardOpen ? 'Close Whiteboard' : 'Open Whiteboard'}>
        <IconButton
          onClick={onToggleWhiteboard}
          disabled={disabled}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: whiteboardOpen ? colors.warning : colors.primary,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: whiteboardOpen ? colors.warning : colors.primaryDark,
            },
            '&.Mui-disabled': {
              backgroundColor: colors.textMuted,
              color: '#CCCCCC',
            },
          }}
        >
          <WhiteboardIcon sx={{ fontSize: iconSize }} />
        </IconButton>
      </Tooltip>

      {/* Hold / Resume Button */}
      {onToggleHold && (
        <Tooltip title={onHold ? 'Resume Call' : 'Place Call on Hold'}>
          <IconButton
            onClick={onToggleHold}
            disabled={disabled}
            sx={{
              width: buttonSize,
              height: buttonSize,
              backgroundColor: onHold ? colors.warning : colors.primary,
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: onHold ? colors.warning : colors.primaryDark,
              },
              '&.Mui-disabled': {
                backgroundColor: colors.textMuted,
                color: '#CCCCCC',
              },
            }}
          >
            {onHold ? (
              <ResumeIcon sx={{ fontSize: iconSize }} />
            ) : (
              <HoldIcon sx={{ fontSize: iconSize }} />
            )}
          </IconButton>
        </Tooltip>
      )}

      {/* Virtual Background */}
      {onSetBackground && (
        <VirtualBackgroundMenu
          onSelect={onSetBackground}
          activeMode={activeBackground}
          disabled={disabled || !videoEnabled}
        />
      )}

      {/* Divider */}
      <Box sx={{ width: 2, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.3)', mx: 1 }} />

      {/* End Call Button */}
      <Button
        onClick={onEndCall}
        disabled={disabled}
        sx={{
          px: { xs: 2.5, md: 4 },
          py: { xs: 1, md: 1.5 },
          textTransform: 'none',
          fontWeight: 600,
          fontSize: { xs: '0.875rem', md: '1rem' },
          backgroundColor: colors.error,
          color: '#FFFFFF',
          borderRadius: '24px',
          minWidth: { xs: 100, md: 140 },
          '&:hover': {
            backgroundColor: colors.error,
          },
          '&.Mui-disabled': {
            backgroundColor: colors.textMuted,
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
  activeBackground: PropTypes.string,
  onHold: PropTypes.bool,
  onToggleAudio: PropTypes.func.isRequired,
  onToggleVideo: PropTypes.func.isRequired,
  onToggleSpeaker: PropTypes.func,
  onToggleWhiteboard: PropTypes.func,
  onSetBackground: PropTypes.func,
  onToggleHold: PropTypes.func,
  onEndCall: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default VideoControls;
