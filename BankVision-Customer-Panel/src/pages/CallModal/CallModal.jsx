import React from 'react';
import { Dialog, DialogContent, Box, Typography, Button, Avatar } from '@mui/material';
import { Person as PersonIcon, Close as CloseIcon } from '@mui/icons-material';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import { colors } from '../../theme/tokens';

const CallModal = ({ open, onClose, onCancel, inQueue, queuePosition, queueMessage, callStatus }) => {
  const isQueued = callStatus === 'queued' || inQueue;

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: colors.surface,
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          overflow: 'visible',
        }
      }}
    >
      <DialogContent sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 5,
        textAlign: 'center',
      }}>
        {/* Logo at top */}
        <Box sx={{ mb: 3 }}>
          <BrandLogo size="small" />
        </Box>

        {/* Video Banking Title */}
        <Typography
          sx={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: colors.primary,
            mb: 4,
          }}
        >
          Video Banking
        </Typography>

        {/* User Icon Circle */}
        <Avatar
          sx={{
            width: 100,
            height: 100,
            backgroundColor: colors.primary,
            mb: 3,
          }}
        >
          <PersonIcon sx={{ fontSize: 60, color: colors.surface }} />
        </Avatar>

        {/* Status Message */}
        {isQueued ? (
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 500,
                color: colors.textPrimary,
                mb: 2,
              }}
            >
              You are in queue
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
                mb: 2,
              }}
            >
              Position: {queuePosition || '...'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
                mb: 3,
              }}
            >
              {queueMessage || 'Please wait, a Video Banking RM will be with you shortly'}
            </Typography>

            {/* Leave Queue Button */}
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={onCancel}
              sx={{
                textTransform: 'none',
                borderColor: colors.border,
                color: colors.textSecondary,
                fontWeight: 500,
                px: 3,
                py: 1,
                '&:hover': {
                  borderColor: '#FF5252',
                  color: '#FF5252',
                  backgroundColor: 'rgba(255, 82, 82, 0.04)',
                },
              }}
            >
              Leave Queue
            </Button>
          </Box>
        ) : (
          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 500,
                color: colors.textPrimary,
                mb: 2,
              }}
            >
              Please wait, a Video Banking
            </Typography>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 500,
                color: colors.textPrimary,
                mb: 3,
              }}
            >
              RM will be with you shortly
            </Typography>

            {/* Three Dots Loading Animation */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                mb: 3,
              }}
            >
              {[0, 1, 2].map((index) => (
                <Box
                  key={index}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: colors.primary,
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: `${index * 0.16}s`,
                    '@keyframes bounce': {
                      '0%, 80%, 100%': {
                        transform: 'scale(0)',
                        opacity: 0.5,
                      },
                      '40%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                    },
                  }}
                />
              ))}
            </Box>

            {/* Cancel Call Button */}
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={onCancel}
              sx={{
                textTransform: 'none',
                borderColor: colors.border,
                color: colors.textSecondary,
                fontWeight: 500,
                px: 3,
                py: 1,
                '&:hover': {
                  borderColor: '#FF5252',
                  color: '#FF5252',
                  backgroundColor: 'rgba(255, 82, 82, 0.04)',
                },
              }}
            >
              Cancel Call
            </Button>
          </Box>
        )}

        {/* Control Buttons Row */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          {/* Camera Toggle (disabled/placeholder) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: colors.success,
              }}
            />
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
              }}
            >
              Camera
            </Typography>
          </Box>

          {/* Mic Toggle (disabled/placeholder) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: colors.warning,
              }}
            />
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
              }}
            >
              Mic
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;