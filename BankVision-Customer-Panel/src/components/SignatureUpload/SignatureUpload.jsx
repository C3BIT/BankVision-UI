import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Close,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../context/WebSocketContext';
import axios from 'axios';

const SignatureUpload = ({ open, onClose }) => {
  const { socket } = useWebSocket();
  const [signatureFile, setSignatureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [managerReceived, setManagerReceived] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // DIAGNOSTIC LOGGING
  useEffect(() => {
    console.log("🚀 SignatureUpload Mounted");
    console.log("🔌 Socket Status:", socket?.connected ? "Connected" : "Disconnected", socket?.id);
  }, [socket]);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSignatureFile(file);
    setError(null);
    setUploadSuccess(false);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!signatureFile) {
      setError('Please select a signature image');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const formData = new FormData();
      formData.append('file', signatureFile);
      formData.append('type', 'signature');

      const response = await axios.post(`${API_URL}/image/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.status === 'success') {
        let signaturePath = response.data.data.imagePath;

        // Ensure absolute URL if backend returned relative path
        if (signaturePath && !signaturePath.startsWith('http')) {
          const backendOrigin = API_URL.replace('/api', '');
          signaturePath = `${backendOrigin}${signaturePath.startsWith('/') ? '' : '/'}${signaturePath}`;
        }

        console.log('📤 Signature uploaded, emitting to manager:', signaturePath);

        // Send signature path to manager via socket
        if (socket) {
          console.log('📡 Emitting customer:signature-uploaded event with path:', signaturePath);
          console.log('📡 Customer Socket ID:', socket.id);

          // Register one-time listener for acknowledgment
          socket.once('customer:signature-upload-acknowledged', (data) => {
            console.log('📥 Manager acknowledgment received:', data);
            if (data.success) {
              setManagerReceived(true);
              console.log('✅ Signature successfully received by manager according to backend');
            } else {
              setError(`Uploaded, but manager notification failed: ${data.message}`);
              console.error('❌ Backend failed to forward signature to manager:', data.message);
            }
          });

          socket.emit('customer:signature-uploaded', {
            signaturePath,
            timestamp: Date.now(),
          });
        }

        setUploadSuccess(true);

        // Auto-close after success if manager received it
        setTimeout(() => {
          if (socket) {
            // Give 5 seconds to receive ack, then close anyway if success
            handleClose();
          } else {
            handleClose();
          }
        }, 3000);
      } else {
        setError(response.data?.message || 'Failed to upload signature');
      }
    } catch (err) {
      console.error('Error uploading signature:', err);
      setError(err.response?.data?.message || 'Failed to upload signature. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSignatureFile(null);
    setPreviewUrl(null);
    setUploadSuccess(false);
    setManagerReceived(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        handleClose();
      }}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Upload Signature
          </Typography>
          <Button
            onClick={handleClose}
            sx={{ minWidth: 'auto', p: 0.5 }}
          >
            <Close />
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
          Manager has requested your signature. Please upload a clear image of your signature.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {uploadSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
            {managerReceived
              ? 'Signature received by manager!'
              : 'Signature uploaded successfully. Notifying manager...'}
          </Alert>
        )}

        {!previewUrl ? (
          <Box
            sx={{
              border: '2px dashed #E0E0E0',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#0066FF',
                backgroundColor: '#F0F7FF',
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <CloudUpload sx={{ fontSize: 48, color: '#999', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Click to upload signature image
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              Supported formats: JPG, PNG (Max 5MB)
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                backgroundColor: '#F8F9FA',
              }}
            >
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Signature Preview
              </Typography>
              <Box
                component="img"
                src={previewUrl}
                alt="Signature preview"
                sx={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  objectFit: 'contain',
                  border: '1px solid #E0E0E0',
                  borderRadius: 1,
                  backgroundColor: '#FFFFFF',
                }}
              />
            </Paper>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setSignatureFile(null);
                  setPreviewUrl(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={uploading || uploadSuccess}
              >
                Change Image
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleUpload}
                disabled={uploading || uploadSuccess || !signatureFile}
                startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                sx={{
                  backgroundColor: '#0066FF',
                  '&:hover': { backgroundColor: '#0052CC' },
                }}
              >
                {uploading ? 'Uploading...' : 'Upload Signature'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

SignatureUpload.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SignatureUpload;
