import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  Chip
} from '@mui/material';
import { ArrowBack, CheckCircle, Warning, Person } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import api from '../../../services/api';

const steps = ['Enter NID', 'Verify Identity', 'Face Match', 'Complete'];

const AccountActivation = ({ onBack }) => {
  const { accountDetails } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();
  const [activeStep, setActiveStep] = useState(0);
  const [nidNumber, setNidNumber] = useState('');
  const [nidData, setNidData] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customerImage, setCustomerImage] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleImageReceived = (data) => {
      setCustomerImage(data.imagePath);
    };

    socket.on('manager:received-image-link', handleImageReceived);

    return () => {
      socket.off('manager:received-image-link', handleImageReceived);
    };
  }, [socket]);

  const handleLookupNID = async () => {
    if (!nidNumber || nidNumber.length < 10) {
      setError('Please enter a valid NID number (10 or 17 digits)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/nid/lookup/${nidNumber}`);

      if (response.data.success) {
        setNidData(response.data.data);
        setActiveStep(1);
      } else {
        setError(response.data.message || 'NID not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to lookup NID');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateVerification = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/nid/verify/initiate', {
        nidNumber,
        customerName: accountDetails?.name || 'Customer',
        accountNumber: accountDetails?.accountNumber
      });

      if (response.data.success) {
        setVerificationId(response.data.data.verificationId);
        setNidData(prev => ({
          ...prev,
          ...response.data.data
        }));
        setActiveStep(2);

        // Request face capture from customer
        socket?.emit('manager:request-face-verification', {
          verificationId: response.data.data.verificationId
        });
      } else {
        setError(response.data.message || 'Verification initiation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate verification');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFaceMatch = async () => {
    if (!customerImage) {
      setError('Please wait for customer to capture their face');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Submit face match
      await api.post('/nid/verify/face', {
        verificationId,
        capturedImagePath: customerImage
      });

      // Complete verification
      const response = await api.post('/nid/verify/complete', {
        verificationId
      });

      if (response.data.success) {
        setVerificationResult(response.data.data);
        setActiveStep(3);

        // Notify customer of result
        socket?.emit('manager:account-activation-result', {
          success: response.data.data.isVerified,
          referenceNumber: response.data.data.referenceNumber
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Face verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCapture = () => {
    socket?.emit('manager:request-capture-image', {});
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <TextField
              fullWidth
              value={accountDetails?.accountNumber || 'N/A'}
              variant="outlined"
              label="Account Number"
              InputProps={{ readOnly: true }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              value={nidNumber}
              onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ''))}
              variant="outlined"
              label="NID Number"
              placeholder="Enter 10 or 17 digit NID"
              inputProps={{ maxLength: 17 }}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleLookupNID}
              disabled={loading || nidNumber.length < 10}
              sx={{
                py: 1.5,
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#388E3C' }
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Lookup NID'}
            </Button>
          </>
        );

      case 1:
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <Avatar
                src={nidData?.photo || nidData?.nidPhoto}
                sx={{ width: 80, height: 80 }}
              >
                <Person />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: 'white' }}>
                  {nidData?.name || nidData?.nidName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  NID: {nidNumber}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  DOB: {nidData?.dateOfBirth}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Chip
                icon={nidData?.status === 'valid' ? <CheckCircle /> : <Warning />}
                label={nidData?.status === 'valid' ? 'Valid NID' : 'Check NID Status'}
                color={nidData?.status === 'valid' ? 'success' : 'warning'}
                sx={{ mr: 1 }}
              />
            </Box>

            <TextField
              fullWidth
              value={nidData?.permanentAddress || 'N/A'}
              variant="outlined"
              label="Permanent Address"
              InputProps={{ readOnly: true }}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleInitiateVerification}
              disabled={loading || nidData?.status !== 'valid'}
              sx={{
                py: 1.5,
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#388E3C' }
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify Identity'}
            </Button>
          </>
        );

      case 2:
        return (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  NID Photo
                </Typography>
                <Avatar
                  src={nidData?.photo || nidData?.nidPhoto}
                  sx={{ width: 100, height: 100, mt: 1 }}
                  variant="rounded"
                >
                  <Person />
                </Avatar>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Customer Photo
                </Typography>
                <Avatar
                  src={customerImage}
                  sx={{
                    width: 100,
                    height: 100,
                    mt: 1,
                    border: customerImage ? '2px solid #4CAF50' : '2px dashed rgba(255,255,255,0.3)'
                  }}
                  variant="rounded"
                >
                  {customerImage ? null : <Person />}
                </Avatar>
              </Box>
            </Box>

            {nidData?.nameMatched !== undefined && (
              <Alert
                severity={nidData.nameMatched ? 'success' : 'warning'}
                sx={{ mb: 2 }}
              >
                Name Match: {nidData.nameSimilarity}%
                {!nidData.nameMatched && ' - Name does not match closely'}
              </Alert>
            )}

            {!customerImage && (
              <Button
                fullWidth
                variant="outlined"
                onClick={handleRequestCapture}
                sx={{ mb: 2, color: 'white', borderColor: 'white' }}
              >
                Request Customer Photo Capture
              </Button>
            )}

            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmitFaceMatch}
              disabled={loading || !customerImage}
              sx={{
                py: 1.5,
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#388E3C' }
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify Face & Activate'}
            </Button>
          </>
        );

      case 3:
        return (
          <>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              {verificationResult?.isVerified ? (
                <CheckCircle sx={{ fontSize: 64, color: '#4CAF50' }} />
              ) : (
                <Warning sx={{ fontSize: 64, color: '#ff9800' }} />
              )}
            </Box>

            <Typography variant="h5" sx={{ color: 'white', textAlign: 'center', mb: 2 }}>
              {verificationResult?.isVerified
                ? 'Account Activated Successfully!'
                : 'Verification Failed'}
            </Typography>

            {verificationResult?.referenceNumber && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Reference Number: <strong>{verificationResult.referenceNumber}</strong>
              </Alert>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Name Match: {verificationResult?.nameSimilarity}%
                {verificationResult?.nameMatched ? ' ✓' : ' ✗'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Face Match: {verificationResult?.faceMatchScore}%
                {verificationResult?.faceMatched ? ' ✓' : ' ✗'}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={onBack}
              sx={{
                py: 1.5,
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#388E3C' }
              }}
            >
              Done
            </Button>
          </>
        );

      default:
        return null;
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
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
        }}
      >
        Back
      </Button>

      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'medium' }}>
        Dormant Account Activation
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.7)' } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {renderStepContent()}
    </Box>
  );
};

AccountActivation.propTypes = {
  onBack: PropTypes.func.isRequired
};

export default AccountActivation;