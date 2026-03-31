import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Badge,
  Collapse,
  Fab,
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  KeyboardArrowDown as MinimizeIcon,
} from '@mui/icons-material';

const ChatBox = ({
  messages,
  onSendMessage,
  onTyping,
  isTyping,
  customerName,
  isOpen,
  onToggle,
  unreadCount
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      if (onTyping) {
        onTyping(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      {isOpen && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 320, sm: 380 },
            height: 480,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: '#6366f1',
              color: 'white',
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#4f46e5' }}>
                {customerName?.[0] || 'C'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {customerName || 'Customer'}
                </Typography>
                {isTyping && (
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    typing...
                  </Typography>
                )}
              </Box>
            </Box>
            <Box>
              <IconButton size="small" onClick={onToggle} sx={{ color: 'white' }}>
                <MinimizeIcon />
              </IconButton>
              <IconButton size="small" onClick={onToggle} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {messages.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  Start a conversation with the customer
                </Typography>
              </Box>
            ) : (
              messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.senderRole === 'manager' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '75%',
                      bgcolor: msg.senderRole === 'manager' ? '#6366f1' : 'white',
                      color: msg.senderRole === 'manager' ? 'white' : 'text.primary',
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      boxShadow: msg.senderRole === 'customer' ? 1 : 0,
                    }}
                  >
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {msg.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'right',
                        opacity: 0.7,
                        mt: 0.5,
                        fontSize: '0.65rem',
                      }}
                    >
                      {formatTime(msg.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'white',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: '#f1f5f9',
                  },
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                sx={{
                  bgcolor: '#6366f1',
                  color: 'white',
                  '&:hover': { bgcolor: '#4f46e5' },
                  '&:disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

ChatBox.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      senderId: PropTypes.string.isRequired,
      senderName: PropTypes.string,
      senderRole: PropTypes.oneOf(['manager', 'customer']).isRequired,
      message: PropTypes.string.isRequired,
      timestamp: PropTypes.number.isRequired,
    })
  ).isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onTyping: PropTypes.func,
  isTyping: PropTypes.bool,
  customerName: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  unreadCount: PropTypes.number,
};

ChatBox.defaultProps = {
  isTyping: false,
  customerName: 'Customer',
  unreadCount: 0,
};

export default ChatBox;
