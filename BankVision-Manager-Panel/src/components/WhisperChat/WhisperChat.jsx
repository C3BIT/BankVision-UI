import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Badge,
  Collapse,
  Chip,
  List,
  ListItem,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VolumeUp as VolumeUpIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  SwapHoriz as SwapHorizIcon,
  Send as SendIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const getModeConfig = (mode) => {
  const configs = {
    listen: {
      icon: <VisibilityIcon />,
      label: 'Monitoring',
      color: 'info',
      description: 'Supervisor is listening to the call',
    },
    whisper: {
      icon: <VolumeUpIcon />,
      label: 'Whisper',
      color: 'warning',
      description: 'Supervisor can speak to you privately',
    },
    barge: {
      icon: <RecordVoiceOverIcon />,
      label: 'Barged In',
      color: 'error',
      description: 'Supervisor has joined the call',
    },
    takeover: {
      icon: <SwapHorizIcon />,
      label: 'Takeover',
      color: 'error',
      description: 'Supervisor is taking over the call',
    },
  };
  return configs[mode] || configs.listen;
};

const WhisperChat = ({
  supervisorMonitoring,
  whisperMessages,
  isWhisperActive,
  onReply,
  isCallActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [message, setMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [whisperMessages]);

  // Track unread messages when collapsed
  useEffect(() => {
    if (!isExpanded && whisperMessages.length > prevMessagesLengthRef.current) {
      const newMessages = whisperMessages.slice(prevMessagesLengthRef.current);
      const newReceivedCount = newMessages.filter(m => m.type === 'received').length;
      setUnreadCount(prev => prev + newReceivedCount);
    }
    prevMessagesLengthRef.current = whisperMessages.length;
  }, [whisperMessages, isExpanded]);

  // Reset unread when expanded
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);

  // Auto-expand when whisper starts
  useEffect(() => {
    if (isWhisperActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isWhisperActive]);

  const handleSendMessage = () => {
    if (message.trim() && onReply) {
      onReply(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't render if no supervisor is monitoring or call not active
  if (!supervisorMonitoring || !isCallActive) {
    return null;
  }

  const modeConfig = getModeConfig(supervisorMonitoring.mode);

  return (
    <Fade in>
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          top: 80,
          right: 16,
          width: 320,
          maxHeight: isExpanded ? 400 : 'auto',
          borderRadius: 2,
          overflow: 'hidden',
          zIndex: 1200,
          border: isWhisperActive ? '2px solid' : '1px solid',
          borderColor: isWhisperActive ? 'warning.main' : 'divider',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            bgcolor: modeConfig.color + '.light',
            borderBottom: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: 10 } }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: modeConfig.color + '.dark',
                }}
              >
                {modeConfig.icon}
              </Box>
            </Badge>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {supervisorMonitoring.name || 'Supervisor'}
              </Typography>
              <Chip
                label={modeConfig.label}
                size="small"
                color={modeConfig.color}
                sx={{ height: 20, fontSize: 10 }}
              />
            </Box>
          </Box>
          <IconButton size="small">
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={isExpanded}>
          {/* Mode Description */}
          <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              {modeConfig.description}
            </Typography>
          </Box>

          {/* Messages */}
          <List
            sx={{
              height: 200,
              overflowY: 'auto',
              p: 1,
              bgcolor: 'background.paper',
            }}
          >
            {whisperMessages.length === 0 ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No messages yet
                </Typography>
              </Box>
            ) : (
              whisperMessages.map((msg, index) => (
                <ListItem
                  key={msg.id || index}
                  sx={{
                    p: 0.5,
                    justifyContent: msg.type === 'sent' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '85%',
                      p: 1,
                      borderRadius: 2,
                      bgcolor: msg.type === 'sent' ? 'primary.main' : 'grey.200',
                      color: msg.type === 'sent' ? 'white' : 'text.primary',
                    }}
                  >
                    {msg.type === 'received' && msg.senderName && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          display: 'block',
                          mb: 0.5,
                          color: 'primary.main',
                        }}
                      >
                        {msg.senderName}
                      </Typography>
                    )}
                    <Typography variant="body2">{msg.message}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'right',
                        opacity: 0.7,
                        mt: 0.5,
                        fontSize: 10,
                      }}
                    >
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </Typography>
                  </Box>
                </ListItem>
              ))
            )}
            <div ref={messagesEndRef} />
          </List>

          {/* Input Area */}
          <Box
            sx={{
              p: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Reply to supervisor..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  fontSize: 14,
                },
              }}
            />
            <Tooltip title="Send">
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!message.trim()}
                size="small"
              >
                <SendIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Collapse>
      </Paper>
    </Fade>
  );
};

WhisperChat.propTypes = {
  supervisorMonitoring: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    mode: PropTypes.oneOf(['listen', 'whisper', 'barge', 'takeover']),
    joinedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  whisperMessages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      senderId: PropTypes.string,
      senderName: PropTypes.string,
      message: PropTypes.string,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      type: PropTypes.oneOf(['sent', 'received']),
    })
  ),
  isWhisperActive: PropTypes.bool,
  onReply: PropTypes.func,
  isCallActive: PropTypes.bool,
};

WhisperChat.defaultProps = {
  whisperMessages: [],
  isWhisperActive: false,
  isCallActive: false,
};

export default WhisperChat;
