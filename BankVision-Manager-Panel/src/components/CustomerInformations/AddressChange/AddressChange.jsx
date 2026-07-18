import { API_URL } from '../../../config.js';
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  Chip
} from '@mui/material';
import { ArrowBack, InsertDriveFile, OpenInNew } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtpToCustomer } from '../../../redux/auth/customerSlice';
import { publicPost } from '../../../services/apiCaller';
import { BD_GEO, DISTRICTS } from '../../../utils/bdGeo';
import Captcha from '../../Captcha/Captcha';
import { colors } from '../../../styles/tokens';
import { getAuthToken } from '../../../utils/authToken';

const API_BASE = (API_URL || '').replace('/api', '');
const getDocUrl = (path) => {
  if (!path) return '#';
  // Stored document URLs (S3/MinIO) 403 when hit directly — the bucket has
  // no public-read policy. Route through the authenticated backend proxy
  // instead, which also self-heals records with a stale storage host baked
  // into the stored URL.
  if (path.includes('/uploads/')) {
    const token = getAuthToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${API_BASE}/api/image/view?path=${encodeURIComponent(path)}${tokenParam}`;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}/${path.startsWith('/') ? path.slice(1) : path}`;
};

const AddressChange = ({ presentAddress, permanentAddress, onBack }) => {
  const { accountDetails } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();
  const dispatch = useDispatch();

  // All 7 fields matching customer panel
  const [addressType, setAddressType] = useState('present');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [postCode, setPostCode] = useState('');
  const [customerDocuments, setCustomerDocuments] = useState([]);

  const [documentsWaived, setDocumentsWaived] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaId, setCaptchaId] = useState(null);
  const captchaRef = useRef(null);

  // Separate timeouts for each field
  const typingTimeoutsRef = useRef({});

  // Listen for customer typing in all fields
  useEffect(() => {
    if (!socket) return;
    setIsLoading(true);
    const readyTimer = setTimeout(() => setIsLoading(false), 1500);

    const handleCustomerTypingAddressChange = (data) => {
      const { addressType: type, field, value } = data;

      if (type) setAddressType(type);

      switch (field) {
        case 'addressLine1':
          setAddressLine1(value);
          break;
        case 'addressLine2':
          setAddressLine2(value);
          break;
        case 'district':
          setDistrict(value);
          break;
        case 'upazila':
          setUpazila(value);
          break;
        case 'postCode':
          setPostCode(value);
          break;
        default:
          break;
      }

      setIsLoading(false);
      setOtpSent(false);
      setError(null);
    };

    // Listen for customer document uploads
    const handleDocumentsUploaded = (data) => {
      if (data.files) {
        setCustomerDocuments(data.files);
        // Auto-clear waiver when customer actually uploads documents
        if (data.files.length > 0) setDocumentsWaived(false);
      }
    };

    // Listen for document updates (removal)
    const handleDocumentsUpdated = (data) => {
      if (data.files) {
        setCustomerDocuments(data.files);
      }
    };

    socket.on('customer:typing-address-change', handleCustomerTypingAddressChange);
    socket.on('customer:address-documents-uploaded', handleDocumentsUploaded);
    socket.on('customer:address-documents-updated', handleDocumentsUpdated);

    return () => {
      clearTimeout(readyTimer);
      socket.off('customer:typing-address-change', handleCustomerTypingAddressChange);
      socket.off('customer:address-documents-uploaded', handleDocumentsUploaded);
      socket.off('customer:address-documents-updated', handleDocumentsUpdated);
    };
  }, [socket]);

  // Emit field change to customer
  const emitFieldChange = (field, value) => {
    if (!socket) return;

    // Clear existing timeout for this field
    if (typingTimeoutsRef.current[field]) {
      clearTimeout(typingTimeoutsRef.current[field]);
    }

    typingTimeoutsRef.current[field] = setTimeout(() => {
      socket.emit('manager:typing-address-change', {
        addressType,
        field,
        value,
        timestamp: Date.now()
      });
    }, 300);
  };

  const isValidAddress = addressLine1 && district && upazila && postCode && (customerDocuments.length > 0 || documentsWaived);

  const handleSendOtpChangeAddress = async () => {
    if (!isValidAddress || !captchaAnswer.trim()) return;

    setIsSendingOtp(true);
    setError(null);

    try {
      await dispatch(
        sendOtpToCustomer({
          phone: accountDetails?.mobileNumber,
          checkDuplicate: false,
          captchaId,
          captchaAnswer,
        })
      ).unwrap();

      setOtpSent(true);
      setOtp('');

      if (socket) {
        socket.emit('manager:sent-otp-change-address', {
          phone: accountDetails?.mobileNumber,
          accountNumber: accountDetails?.accountNumber,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to send OTP');
      captchaRef.current?.refresh();
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Use standard phone verification endpoint
      const response = await publicPost('/otp/verify-phone', {
        phone: accountDetails?.mobileNumber,
        otp: otp
      });

      if (response?.status === 'success') {
        setVerified(true);
        // Trigger approval modal for manager (via echo)
        if (socket) {
          const oldAddress = addressType === 'permanent'
            ? (permanentAddress || '')
            : (presentAddress || '');
          socket.emit('customer:submit-address-change-request', {
            addressType: addressType,
            oldAddress,
            addressData: {
              addressLine1,
              addressLine2,
              district,
              upazila,
              postCode,
              documents: customerDocuments,
              documentsWaived: documentsWaived && customerDocuments.length === 0
            }
          });
        }
      } else {
        throw new Error(response.data?.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.surface,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      gap: 2
    }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{
          alignSelf: 'flex-start',
          color: colors.textPrimary,
          '&:hover': {
            backgroundColor: '#F0F0F0'
          }
        }}
      >
        Back
      </Button>

      <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 'medium' }}>
        Customer Address Update
      </Typography>

      <Divider sx={{ borderColor: colors.border }} />

      {/* Current Address */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Current {addressType === 'permanent' ? 'Permanent' : 'Present'} Address
        </Typography>
        <TextField
          fullWidth
          value={(addressType === 'permanent' ? permanentAddress : presentAddress) || 'Not available'}
          variant="outlined"
          InputProps={{
            readOnly: true,
            sx: { color: colors.textPrimary }
          }}
          multiline
          rows={2}
          sx={{
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: colors.background,
              '& fieldset': {
                borderColor: colors.border,
              },
            },
          }}
        />
      </Box>

      <Divider sx={{ borderColor: colors.border }} />

      {/* Address Type Toggle */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block' }}>
          Address Type (Customer Typing)
        </Typography>
        <ToggleButtonGroup
          value={addressType}
          exclusive
          onChange={(e, newType) => {
            if (newType !== null) {
              setAddressType(newType);
              setIsLoading(false);
              setOtpSent(false);
              setError(null);
              emitFieldChange('addressType', newType);
            }
          }}
          sx={{
            width: '100%',
            '& .MuiToggleButton-root': {
              flex: 1,
              py: 1.5,
              color: '#666',
              borderColor: colors.border,
              '&.Mui-selected': {
                backgroundColor: colors.primary,
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: colors.primaryDark,
                },
              },
            },
          }}
        >
          <ToggleButton value="present" disabled={verified}>Present Address</ToggleButton>
          <ToggleButton value="permanent" disabled={verified}>Permanent Address</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
          Manager can change - synced to customer in real-time
        </Typography>
      </Box>

      {/* Address Fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Address Line 1 */}
        <Box>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Address Line 1 (Customer Typing)
          </Typography>
          <TextField
            fullWidth
            value={addressLine1}
            disabled={verified}
            onChange={(e) => {
              const value = e.target.value;
              setAddressLine1(value);
              setIsLoading(false);
              setOtpSent(false);
              setError(null);
              emitFieldChange('addressLine1', value);
            }}
            variant="outlined"
            placeholder={isLoading ? "Waiting for customer or type here..." : "Enter address line 1"}
            helperText="Manager can type/edit - synced to customer in real-time"
            sx={{
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FAFAFA',
                color: colors.textPrimary,
                '& fieldset': { borderColor: colors.border },
                '&:hover fieldset': { borderColor: '#BDBDBD' },
                '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: 2 },
              },
              '& .MuiFormHelperText-root': { color: '#666', fontSize: '0.7rem' },
            }}
          />
        </Box>

        {/* Address Line 2 */}
        <Box>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Address Line 2 (Customer Typing)
          </Typography>
          <TextField
            fullWidth
            value={addressLine2}
            disabled={verified}
            onChange={(e) => {
              const value = e.target.value;
              setAddressLine2(value);
              setIsLoading(false);
              setOtpSent(false);
              setError(null);
              emitFieldChange('addressLine2', value);
            }}
            variant="outlined"
            placeholder={isLoading ? "Waiting for customer or type here..." : "Enter address line 2 (optional)"}
            helperText="Manager can type/edit - synced to customer in real-time"
            sx={{
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FAFAFA',
                color: colors.textPrimary,
                '& fieldset': { borderColor: colors.border },
                '&:hover fieldset': { borderColor: '#BDBDBD' },
                '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: 2 },
              },
              '& .MuiFormHelperText-root': { color: '#666', fontSize: '0.7rem' },
            }}
          />
        </Box>

        {/* District and Post Code Row */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* District */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              District (Customer Typing)
            </Typography>
            <FormControl fullWidth sx={{ mt: 0.5 }}>
              <Select
                value={district}
                disabled={verified}
                onChange={(e) => {
                  const value = e.target.value;
                  setDistrict(value);
                  setUpazila('');
                  setIsLoading(false);
                  setOtpSent(false);
                  setError(null);
                  emitFieldChange('district', value);
                  emitFieldChange('upazila', '');
                }}
                displayEmpty
                sx={{
                  backgroundColor: '#FAFAFA',
                  color: colors.textPrimary,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BDBDBD' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary, borderWidth: 2 },
                }}
              >
                <MenuItem value="" disabled>
                  <em style={{ color: '#999' }}>Select District</em>
                </MenuItem>
                {DISTRICTS.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Post Code */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Post Code (Customer Typing)
            </Typography>
            <TextField
              fullWidth
              value={postCode}
              disabled={verified}
              onChange={(e) => {
                const value = e.target.value;
                setPostCode(value);
                setIsLoading(false);
                setOtpSent(false);
                setError(null);
                emitFieldChange('postCode', value);
              }}
              variant="outlined"
              placeholder={isLoading ? "Waiting..." : "Post Code"}
              sx={{
                mt: 0.5,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FAFAFA',
                  color: colors.textPrimary,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#BDBDBD' },
                  '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: 2 },
                },
              }}
            />
          </Box>
        </Box>

        {/* Upazila/Thana */}
        <Box>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Upazila / Thana (Customer Typing)
          </Typography>
          <FormControl fullWidth sx={{ mt: 0.5 }}>
            <Select
              value={upazila}
              disabled={verified || !district}
              onChange={(e) => {
                const value = e.target.value;
                setUpazila(value);
                setIsLoading(false);
                setOtpSent(false);
                setError(null);
                emitFieldChange('upazila', value);
              }}
              displayEmpty
              sx={{
                backgroundColor: '#FAFAFA',
                color: colors.textPrimary,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BDBDBD' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary, borderWidth: 2 },
              }}
            >
              <MenuItem value="" disabled>
                <em style={{ color: '#999' }}>{district ? 'Select Thana / Upazila' : 'Select district first'}</em>
              </MenuItem>
              {(BD_GEO[district] || []).map((u) => (
                <MenuItem key={u} value={u}>{u}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ borderColor: colors.border }} />

      {/* Customer Uploaded Documents */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block' }}>
          Supporting Documents (Customer Uploaded)
        </Typography>
        {customerDocuments.length > 0 ? (
          <Box sx={{
            backgroundColor: '#F8F9FA',
            borderRadius: '12px',
            p: 2,
            border: `1px solid ${colors.border}`
          }}>
            <Typography variant="subtitle2" sx={{ color: colors.textPrimary, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InsertDriveFile fontSize="small" />
              Customer Documents ({customerDocuments.length})
            </Typography>
            <List dense sx={{ p: 0 }}>
              {customerDocuments.map((file, index) => (
                <ListItem
                  key={index}
                  sx={{
                    backgroundColor: colors.surface,
                    borderRadius: '6px',
                    mb: 0.5,
                    py: 0.5,
                    border: '1px solid #EEEEEE'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <InsertDriveFile sx={{ color: '#666', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name || file.originalName}
                    primaryTypographyProps={{
                      sx: { color: colors.textPrimary, fontSize: '0.85rem' }
                    }}
                  />
                  <Link
                    href={getDocUrl(file.url || file.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: colors.success,
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
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Alert severity="info" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)' }}>
              Waiting for customer to upload supporting documents
            </Alert>
            <FormControlLabel
              control={
                <Checkbox
                  checked={documentsWaived}
                  onChange={(e) => setDocumentsWaived(e.target.checked)}
                  disabled={verified}
                  size="small"
                  sx={{ color: colors.warning, '&.Mui-checked': { color: colors.warning } }}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Proceed without documents (manager override — document collection waived)
                </Typography>
              }
            />
          </Box>
        )}
      </Box>

      {/* Validation Status */}
      {!isLoading && !verified && (addressLine1 || district || upazila || postCode) && (
        <Box>
          {!addressLine1 || !district || !upazila || !postCode ? (
            <Alert severity="warning" sx={{ backgroundColor: 'rgba(255, 152, 0, 0.08)' }}>
              Please fill in all required address fields
            </Alert>
          ) : customerDocuments.length === 0 && !documentsWaived ? (
            <Alert severity="warning" sx={{ backgroundColor: 'rgba(255, 152, 0, 0.08)' }}>
              No documents uploaded. Check the override box below to proceed without documents.
            </Alert>
          ) : (
            <Alert severity="success" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}>
              Address information complete! Ready to send OTP.
            </Alert>
          )}
        </Box>
      )}

      {/* OTP and Submit Handling */}
      {!isLoading && !otpSent && !verified && isValidAddress && (
        <Captcha
          ref={captchaRef}
          value={captchaAnswer}
          onChange={(e) => setCaptchaAnswer(e.target.value)}
          onCaptchaIdChange={setCaptchaId}
        />
      )}
      {!isLoading && !otpSent && !verified && isValidAddress && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleSendOtpChangeAddress}
          disabled={isSendingOtp || !captchaAnswer.trim()}
          sx={{
            py: 1.5,
            backgroundColor: '#2196F3',
            '&:hover': { backgroundColor: colors.primary },
            '&:disabled': { backgroundColor: '#90CAF9' },
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {isSendingOtp ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            'Submit on Behalf of Customer & Send OTP'
          )}
        </Button>
      )}

      {otpSent && !verified && (
        <>
          <Alert severity="success" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}>
            OTP sent successfully to {accountDetails?.mobileNumber}
          </Alert>

          <Divider sx={{ borderColor: colors.border, my: 1 }} />

          <Box>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Enter 6-Digit OTP
            </Typography>
            <TextField
              fullWidth
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                setError(null);
              }}
              variant="outlined"
              placeholder="000000"
              inputProps={{
                maxLength: 6,
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
              }}
              sx={{
                mt: 0.5,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FAFAFA',
                  color: colors.textPrimary,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#BDBDBD' },
                  '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: 2 },
                },
              }}
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={handleVerifyOtp}
            disabled={isVerifying || otp.length !== 6}
            sx={{
              py: 1.5,
              backgroundColor: colors.success,
              '&:hover': { backgroundColor: colors.success },
              '&:disabled': { backgroundColor: '#A5D6A7' },
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            {isVerifying ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              'Verify OTP & Submit for Approval'
            )}
          </Button>
        </>
      )}

      {verified && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="success" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Success!</Typography>
            Address change submitted for approval.
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#666' }}>
              OTP verified — please complete the approval in the approval dialog above, then return to services.
            </Typography>
          </Alert>

          <Button
            fullWidth
            variant="contained"
            onClick={onBack}
            sx={{
              py: 1.5,
              backgroundColor: colors.success,
              '&:hover': { backgroundColor: colors.success },
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            Back to Services
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ backgroundColor: 'rgba(244, 67, 54, 0.08)' }}>
          {error}
        </Alert>
      )}

      <Typography variant="caption" sx={{ color: '#666', textAlign: 'center' }}>
        {isLoading
          ? "Connecting to customer..."
          : !addressLine1 && !district && !upazila && !postCode
            ? "Waiting for customer to enter address information or type to override"
            : !isValidAddress
              ? "All fields must be filled (documents required or override checked)"
              : "Ready to submit on behalf of customer"}
      </Typography>
    </Box>
  );
};

AddressChange.propTypes = {
  presentAddress: PropTypes.string,
  permanentAddress: PropTypes.string,
  onBack: PropTypes.func.isRequired
};

export default AddressChange;
