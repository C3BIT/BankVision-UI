import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  Send,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import api from '../../../services/api';
import { useWebSocket } from '../../../providers/WebSocketProvider';


const SignatureVerification = ({ customerPhone, onBack, socket: propSocket }) => {
  const {
    socket: contextSocket,
    signatureUploadedPath,
    clearSignaturePath
  } = useWebSocket();

  const socket = propSocket || contextSocket;

  const [signaturePath, setSignaturePath] = useState(null);

  const [referenceSignature, setReferenceSignature] = useState(null);
  const [loadingReference, setLoadingReference] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);

  // Fetch reference signature on mount
  useEffect(() => {
    const fetchReferenceSignature = async () => {
      setLoadingReference(true);
      try {
        const response = await api.post('/customer/find-phone', { phone: customerPhone });
        if (response.data && response.data.data && response.data.data.length > 0) {
          // CBS Mock returns all accounts for the phone, each has the signature image
          setReferenceSignature(response.data.data[0].signatureImage);
        }
      } catch (err) {
        console.error('Error fetching reference signature:', err);
        // Not a blocking error, but good to log
      } finally {
        setLoadingReference(false);
      }
    };

    fetchReferenceSignature();
  }, [customerPhone]);

  // React to global signature upload state
  useEffect(() => {
    if (signatureUploadedPath) {
      console.log('✍️ [Local] Detected signatureUploadedPath from global state:', signatureUploadedPath);
      setSignaturePath(signatureUploadedPath);
      setRequestSent(false);
      // Automatically verify
      handleVerify(signatureUploadedPath);
      // Clear global state so we don't re-trigger on remount
      clearSignaturePath();
    }
  }, [signatureUploadedPath, clearSignaturePath]);


  const handleRequestSignature = () => {
    if (!socket || !socket.connected) {
      setError('Not connected to server');
      return;
    }

    console.log('📝 Manager requesting signature upload from customer');
    socket.emit('manager:request-signature-upload', {
      customerId: customerPhone,
      timestamp: Date.now(),
    });
    setRequestSent(true);
    setError(null);
  };

  const handleVerify = async (imagePath) => {
    if (!imagePath) {
      setError('No signature image available');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await api.post('/signature/verify', {
        customerPhone,
        signatureImagePath: imagePath,
      });

      if (response.data.success) {
        setVerificationResult({
          matched: response.data.data.matched,
          similarity: response.data.data.similarity || 0,
          confidence: response.data.data.confidence || 0,
        });
      } else {
        setError(response.data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify signature');
    } finally {
      setVerifying(false);
    }
  };

  const handleDecision = (decision) => {
    if (!socket || !socket.connected) {
      setError('Not connected to server');
      return;
    }

    setDecisionPending(true);
    console.log(`✍️ Manager decision for signature: ${decision}`);

    socket.emit('manager:signature-verification-decision', {
      customerId: customerPhone,
      decision: decision,
      message: decision === 'approve'
        ? 'Your signature has been verified and approved.'
        : 'Your signature could not be verified. Please try again or contact support.',
      timestamp: Date.now(),
    });

    setTimeout(() => {
      setDecisionPending(false);
      if (onBack) onBack();
    }, 500);
  };

  const handleReset = () => {
    setSignaturePath(null);
    setVerificationResult(null);
    setError(null);
    setRequestSent(false);
  };

  return (
    <Box
      sx={{
        width: '100%',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {onBack && (
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          sx={{ alignSelf: 'flex-start', mb: 1 }}
        >
          Back
        </Button>
      )}

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Signature Verification
      </Typography>

      <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
        Request customer to upload signature for verification against bank records
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {requestSent && !signaturePath && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Request sent to customer. Waiting for signature upload...
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
            Socket ID: {socket?.id || 'N/A'} | Connected: {socket?.connected ? 'Yes' : 'No'}
          </Typography>
        </Alert>
      )}

      {verificationResult && (
        <Alert
          severity={verificationResult.matched ? 'success' : 'warning'}
          sx={{ mb: 2 }}
          icon={verificationResult.matched ? <CheckCircle /> : <Cancel />}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {verificationResult.matched
              ? 'Signature Matched'
              : 'Signature Not Matched'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            Similarity: {verificationResult.similarity.toFixed(1)}% | Confidence:{' '}
            {verificationResult.confidence.toFixed(1)}%
          </Typography>
        </Alert>
      )}

      {!signaturePath ? (
        <Button
          variant="contained"
          fullWidth
          onClick={handleRequestSignature}
          disabled={requestSent || verifying}
          startIcon={requestSent ? <CircularProgress size={20} /> : <Send />}
          sx={{
            backgroundColor: '#0066FF',
            '&:hover': { backgroundColor: '#0052CC' },
            py: 1.5,
          }}
        >
          {requestSent ? 'Request Sent...' : 'Request Signature Upload'}
        </Button>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            {/* Reference Signature */}
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 2,
                textAlign: 'center',
                backgroundColor: '#F0F7FF',
                border: '1px solid #CCE0FF',
                borderRadius: 2,
                minWidth: '200px',
                overflow: 'hidden' // Prevent overflow
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 700, color: '#0066FF', textTransform: 'uppercase' }}>
                Bank Reference Signature
              </Typography>
              {loadingReference ? (
                <Box sx={{ py: 4 }}><CircularProgress size={24} /></Box>
              ) : referenceSignature ? (
                <Box
                  component="img"
                  src={referenceSignature}
                  alt="Reference"
                  sx={{
                    width: '100%', // Responsive width
                    height: 'auto',
                    maxHeight: '160px',
                    objectFit: 'contain',
                    backgroundColor: '#FFFFFF',
                    p: 1,
                    borderRadius: 1
                  }}
                />
              ) : (
                <Typography variant="body2" sx={{ py: 4, color: '#999' }}>No reference found</Typography>
              )}
            </Paper>

            {/* Customer Captured Signature */}
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 2,
                textAlign: 'center',
                backgroundColor: '#F8F9FA',
                border: '1px solid #E0E0E0',
                borderRadius: 2,
                minWidth: '200px',
                overflow: 'hidden' // Prevent overflow
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>
                Customer Uploaded Signature
              </Typography>
              <Box
                component="img"
                src={signaturePath}
                alt="Captured"
                sx={{
                  width: '100%', // Responsive width
                  height: 'auto',
                  maxHeight: '160px',
                  objectFit: 'contain',
                  backgroundColor: '#FFFFFF',
                  p: 1,
                  borderRadius: 1
                }}
              />
            </Paper>
          </Box>

          {verifying && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
                AI Comparison in progress...
              </Typography>
            </Box>
          )}

          {/* Decision Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              fullWidth
              color="success"
              onClick={() => handleDecision('approve')}
              disabled={decisionPending || verifying}
              startIcon={<CheckCircle />}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Approve
            </Button>
            <Button
              variant="contained"
              fullWidth
              color="error"
              onClick={() => handleDecision('reject')}
              disabled={decisionPending || verifying}
              startIcon={<Cancel />}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Reject
            </Button>
          </Box>

          <Button
            variant="text"
            fullWidth
            onClick={handleReset}
            disabled={decisionPending || verifying}
            sx={{ color: '#666' }}
          >
            Re-request Signature
          </Button>
        </Box>
      )}
    </Box>
  );
};

SignatureVerification.propTypes = {
  customerPhone: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  socket: PropTypes.object,
};

export default SignatureVerification;
