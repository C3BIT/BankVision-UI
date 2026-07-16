import { Box, Typography, IconButton, Button, useMediaQuery, useTheme } from '@mui/material';
import { Description, MoreVert, Close } from '@mui/icons-material';
import { colors } from '../../theme/tokens';

const DocumentPanel = ({ documents = [], onNewUpload, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: { xs: 120, sm: 90 },
        left: { xs: 0, sm: 24 },
        right: { xs: 0, sm: 'auto' },
        width: { xs: '100%', sm: 360 },
        backgroundColor: colors.surface,
        borderRadius: { xs: '16px 16px 0 0', sm: 3 },
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        zIndex: 10,
        maxHeight: { xs: '60vh', sm: '400px' },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.primary,
          color: '#FFFFFF',
          px: 2,
          py: 1.5,
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
          New upload
        </Typography>
        <IconButton size="small" sx={{ color: '#FFFFFF' }} onClick={onClose}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Document List */}
      <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
        {documents.length > 0 ? (
          documents.map((doc, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.5,
                borderBottom: index < documents.length - 1 ? '1px solid #F0F0F0' : 'none',
                '&:hover': {
                  backgroundColor: colors.background,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                <Description sx={{ fontSize: 20, color: colors.textSecondary }} />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: colors.textPrimary,
                    }}
                  >
                    {doc.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: colors.textMuted,
                    }}
                  >
                    {doc.size}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small">
                <MoreVert sx={{ fontSize: 18, color: colors.textSecondary }} />
              </IconButton>
            </Box>
          ))
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: colors.textMuted,
              }}
            >
              Click to browse or
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: colors.textMuted,
              }}
            >
              drag and drop your files
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentPanel;
