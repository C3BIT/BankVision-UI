import { Box, Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const AccountInfoDisplay = ({ accountDetails }) => {
  if (!accountDetails) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: '#FAFAFA',
          borderRadius: 2,
          border: '1px solid #E0E0E0',
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', color: '#999999', textAlign: 'center' }}>
          No account selected
        </Typography>
      </Paper>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        backgroundColor: '#FAFAFA',
        borderRadius: 2,
        border: '1px solid #E0E0E0',
      }}
    >
      <Typography
        sx={{
          fontSize: '1rem',
          fontWeight: 600,
          color: '#1A1A1A',
          mb: 2,
        }}
      >
        Account Information
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Account Number */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
            A/C Number
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A1A' }}>
            {accountDetails.accountNumber || 'N/A'}
          </Typography>
        </Box>

        {/* Branch Name */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
            Branch Name
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1A1A' }}>
            {accountDetails.branch || accountDetails.branchName || 'N/A'}
          </Typography>
        </Box>

        {/* Opening Date */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
            Opening Date
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1A1A' }}>
            {formatDate(accountDetails.openingDate || accountDetails.createdAt)}
          </Typography>
        </Box>

        {/* Matured Date */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
            Matured Date
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1A1A' }}>
            {formatDate(accountDetails.maturedDate || accountDetails.maturityDate)}
          </Typography>
        </Box>

        {/* Account Type */}
        {accountDetails.accountType && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
              Account Type
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1A1A' }}>
              {accountDetails.accountType}
            </Typography>
          </Box>
        )}

        {/* Account Status */}
        {accountDetails.status && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
              Status
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: accountDetails.status === 'active' ? '#4CAF50' : '#FF9800',
              }}
            >
              {accountDetails.status.toUpperCase()}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

AccountInfoDisplay.propTypes = {
  accountDetails: PropTypes.shape({
    accountNumber: PropTypes.string,
    branch: PropTypes.string,
    branchName: PropTypes.string,
    openingDate: PropTypes.string,
    createdAt: PropTypes.string,
    maturedDate: PropTypes.string,
    maturityDate: PropTypes.string,
    accountType: PropTypes.string,
    status: PropTypes.string,
  }),
};

export default AccountInfoDisplay;
