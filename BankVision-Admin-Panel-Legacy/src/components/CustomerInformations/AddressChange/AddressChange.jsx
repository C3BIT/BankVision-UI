import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Chip, List, ListItem, ListItemIcon, ListItemText, Link } from '@mui/material';
import { ArrowBack, InsertDriveFile, OpenInNew } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtpToCustomer } from '../../../redux/auth/customerSlice';

const ADDRESS_TYPE_LABELS = {
  present: 'Present Address',
  permanent: 'Permanent Address',
  office: 'Office Address'
};

const AddressChange = ({ currentAddress, onBack }) => {
  const { accountDetails } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();
  const dispatch = useDispatch();
  const [customerTypedAddress, setCustomerTypedAddress] = useState('');
  const [addressType, setAddressType] = useState('present');
  const [isLoading, setIsLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [customerDocuments, setCustomerDocuments] = useState([]);

  useEffect(() => {
    if (!socket) return;
    setIsLoading(true);

    const handleCustomerTyping = (data) => {
      setCustomerTypedAddress(data.newAddress);
      if (data.addressType) {
        setAddressType(data.addressType);
      }
      setIsLoading(false);
      setOtpSent(false);
      setError(null);
    };

    // Listen for customer document uploads
    const handleDocumentsUploaded = (data) => {
      if (data.files) {
        setCustomerDocuments(data.files);
      }
    };

    // Listen for document updates (removal)
    const handleDocumentsUpdated = (data) => {
      if (data.files) {
        setCustomerDocuments(data.files);
      }
    };

    socket.on('customer:typing-address', handleCustomerTyping);
    socket.on('customer:address-documents-uploaded', handleDocumentsUploaded);
    socket.on('customer:address-documents-updated', handleDocumentsUpdated);

    return () => {
      socket.off('customer:typing-address', handleCustomerTyping);
      socket.off('customer:address-documents-uploaded', handleDocumentsUploaded);
      socket.off('customer:address-documents-updated', handleDocumentsUpdated);
    };
  }, [socket, currentAddress]);

  const isValidAddress = customerTypedAddress?.length >= 10;

  const handleSendOtpChangeAddress = async () => {
    if (!isValidAddress) return;

    setIsSendingOtp(true);
    setError(null);

    try {
      const response = await dispatch(
        sendOtpToCustomer({ phone: accountDetails?.mobileNumber })
      );

      if (response?.error) {
        throw new Error(response.error.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      socket.emit('manager:sent-otp-change-address', {
        address: customerTypedAddress,
        addressType,
        phone: accountDetails?.mobileNumber,
        accountNumber: accountDetails?.accountNumber,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      gap: 2
    }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{
          alignSelf: 'flex-start',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        Back
      </Button>

      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'medium' }}>
        Customer Address Update
      </Typography>

      <TextField
        fullWidth
        value={currentAddress || 'Not available'}
        variant="outlined"
        label="Current Address"
        InputProps={{ readOnly: true }}
        multiline
        rows={2}
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {Object.entries(ADDRESS_TYPE_LABELS).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            color={addressType === key ? 'primary' : 'default'}
            size="small"
            onClick={() => setAddressType(key)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>

      <TextField
        fullWidth
        value={customerTypedAddress}
        onChange={(e) => {
          const value = e.target.value;
          setCustomerTypedAddress(value);
          setIsLoading(false);
          setOtpSent(false);
          setError(null);

          // Emit to customer in real-time
          if (typingTimeout) clearTimeout(typingTimeout);
          const timeout = setTimeout(() => {
            if (socket && value) {
              socket.emit('manager:typing-address', {
                newAddress: value,
                addressType,
                currentAddress,
                timestamp: Date.now()
              });
            }
          }, 300);
          setTypingTimeout(timeout);
        }}
        variant="outlined"
        label="New Address"
        multiline
        rows={3}
        placeholder={isLoading ? "Waiting for customer input or type here..." : "Enter new address"}
        helperText="Agent can type here or wait for customer input (synced to customer)"
      />

      {/* Customer Uploaded Documents */}
      {customerDocuments.length > 0 && (
        <Box sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          p: 2,
          border: '1px solid rgba(76, 175, 80, 0.5)'
        }}>
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsertDriveFile fontSize="small" />
            Customer Documents ({customerDocuments.length})
          </Typography>
          <List dense sx={{ p: 0 }}>
            {customerDocuments.map((file, index) => (
              <ListItem
                key={index}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  mb: 0.5,
                  py: 0.5
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <InsertDriveFile sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={file.originalName}
                  primaryTypographyProps={{
                    sx: { color: 'white', fontSize: '0.85rem' }
                  }}
                />
                <Link
                  href={file.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: '#4CAF50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '0.8rem'
                  }}
                >
                  View <OpenInNew fontSize="small" />
                </Link>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {!isLoading && !otpSent && isValidAddress && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleSendOtpChangeAddress}
          disabled={isSendingOtp}
          sx={{
            py: 1.5,
            backgroundColor: '#4CAF50',
            '&:hover': {
              backgroundColor: '#388E3C',
            },
            '&:disabled': {
              backgroundColor: '#81C784',
            },
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {isSendingOtp ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            'Send OTP to Customer'
          )}
        </Button>
      )}

      {otpSent && (
        <Alert severity="success">
          OTP sent successfully to {accountDetails?.mobileNumber}
        </Alert>
      )}

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        {isLoading
          ? "Connecting to customer..."
          : !customerTypedAddress
            ? "Waiting for customer to enter new address"
            : !isValidAddress
              ? "Customer must enter at least 10 characters for address"
              : "Verify the new address and send OTP"}
      </Typography>
    </Box>
  );
};

AddressChange.propTypes = {
  currentAddress: PropTypes.string,
  onBack: PropTypes.func.isRequired
};

export default AddressChange;