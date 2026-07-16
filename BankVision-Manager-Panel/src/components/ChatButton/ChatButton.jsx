import { IconButton, Badge, Tooltip, Zoom } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { colors } from '../../styles/tokens';

const ChatButton = ({ unreadCount = 0, onClick, isChatOpen = false }) => {
  return (
    <Tooltip title={isChatOpen ? 'Close Chat' : 'Open Chat'} placement="left" TransitionComponent={Zoom}>
      <IconButton
        onClick={onClick}
        sx={{
          width: 64,
          height: 64,
          backgroundColor: isChatOpen ? colors.primaryDark : colors.primary,
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(0, 102, 255, 0.4)',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: colors.primaryDark,
            transform: 'scale(1.1)',
            boxShadow: '0 6px 20px rgba(0, 102, 255, 0.6)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              fontWeight: 700,
              minWidth: 20,
              height: 20,
              borderRadius: '10px',
              border: '2px solid #FFFFFF',
            },
          }}
        >
          <ChatIcon sx={{ fontSize: 28 }} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

ChatButton.propTypes = {
  unreadCount: PropTypes.number,
  onClick: PropTypes.func.isRequired,
  isChatOpen: PropTypes.bool,
};

export default ChatButton;
