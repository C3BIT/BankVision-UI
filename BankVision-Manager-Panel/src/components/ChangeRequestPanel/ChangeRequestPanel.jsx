import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  Divider,
  Chip,
  IconButton,
  ImageList,
  ImageListItem,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Verified as VerifiedIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  OpenInNew as OpenIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';

const ChangeRequestPanel = ({ customerPhone, customerName, onApprovalComplete }) => {
  const [open, setOpen] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [realtimeValue, setRealtimeValue] = useState({});
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const { socket } = useWebSocket();

  const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '');

  useEffect(() => {
    if (!socket) return;

    // Listen for customer typing (real-time display)
    const handleTypingChange = (data) => {
      // data: { changeType: 'phone'|'email', field: 'new'|'confirm', value: '...' }
      setRealtimeValue((prev) => ({
        ...prev,
        [`${data.changeType}_${data.field}`]: data.value,
      }));
    };

    // Listen for customer typing address changes
    const handleTypingAddress = (data) => {
      // data: { addressType: 'present'|'permanent', field: '...', value: '...' }
      setRealtimeValue((prev) => ({
        ...prev,
        [`address_${data.addressType}_${data.field}`]: data.value,
      }));
    };

    // Listen for customer submission (phone/email)
    const handleSubmitChange = (data) => {
      // data: { changeType: 'phone'|'email', newValue: '...', currentValue: '...' }
      setRequestData({
        type: data.changeType,
        newValue: data.newValue,
        currentValue: data.currentValue,
      });
      setOpen(true);
    };

    // Listen for customer address submission
    const handleSubmitAddress = (data) => {
      // data: { addressType: 'present'|'permanent', addressData: {...} }
      setRequestData({
        type: 'address',
        addressType: data.addressType,
        addressData: data.addressData,
      });
      setOpen(true);
    };

    socket.on('customer:typing-change', handleTypingChange);
    socket.on('customer:typing-address-change', handleTypingAddress);
    socket.on('customer:submit-change-request', handleSubmitChange);
    socket.on('customer:submit-address-change-request', handleSubmitAddress);

    return () => {
      socket.off('customer:typing-change', handleTypingChange);
      socket.off('customer:typing-address-change', handleTypingAddress);
      socket.off('customer:submit-change-request', handleSubmitChange);
      socket.off('customer:submit-address-change-request', handleSubmitAddress);
    };
  }, [socket]);

  const handleApprove = () => {
    if (!socket || !requestData) return;

    if (requestData.type === 'address') {
      socket.emit('manager:approve-address-change', {
        customerId: customerPhone,
        addressType: requestData.addressType,
        addressData: requestData.addressData,
      });
    } else {
      socket.emit('manager:approve-change', {
        changeType: requestData.type,
        customerId: customerPhone,
        newValue: requestData.newValue,
        currentValue: requestData.currentValue,
      });
    }

    setIsApproved(true);
  };

  const handleReject = () => {
    if (!socket || !requestData) return;

    if (requestData.type === 'address') {
      socket.emit('manager:reject-address-change', {
        customerId: customerPhone,
        addressType: requestData.addressType,
        reason: rejectReason || 'Manager rejected the request',
      });
    } else {
      socket.emit('manager:reject-change', {
        changeType: requestData.type,
        customerId: customerPhone,
        reason: rejectReason || 'Manager rejected the request',
      });
    }

    handleClose();
  };

  const handleClose = (wasApproved = false) => {
    setOpen(false);
    setRequestData(null);
    setRealtimeValue({});
    setRejectReason('');
    setShowRejectInput(false);
    setIsApproved(false);
    if (wasApproved && onApprovalComplete) onApprovalComplete();
  };

  const getIcon = () => {
    if (!requestData) return null;
    switch (requestData.type) {
      case 'phone':
        return <PhoneIcon sx={{ fontSize: 40, color: '#0066FF' }} />;
      case 'email':
        return <EmailIcon sx={{ fontSize: 40, color: '#0066FF' }} />;
      case 'address':
        return <HomeIcon sx={{ fontSize: 40, color: '#0066FF' }} />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    if (!requestData) return '';
    switch (requestData.type) {
      case 'phone':
        return 'Phone Number Change Request';
      case 'email':
        return 'Email Change Request';
      case 'address':
        return 'Address Change Request';
      default:
        return 'Change Request';
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon sx={{ fontSize: 20 }} />;
    if (fileType === 'application/pdf') return <PdfIcon sx={{ fontSize: 20 }} />;
    return <FileIcon sx={{ fontSize: 20 }} />;
  };

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Remove leading slash if present to avoid double slashes
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return `${API_BASE_URL}/${cleanUrl}`;
  };

  const handleDocumentClick = (doc) => {
    const fullUrl = getFullUrl(doc.url || doc.path);

    if (doc.type?.startsWith('image/')) {
      // Show image preview modal
      setPreviewImage(fullUrl);
      setShowImagePreview(true);
    } else {
      // Open PDF or other files in new tab
      window.open(fullUrl, '_blank');
    }
  };

  const renderContent = () => {
    if (!requestData) return null;

    if (isApproved) {
      return (
        <Box sx={{ py: 2 }}>
          <Alert
            severity="success"
            icon={<CheckIcon sx={{ fontSize: 30 }} />}
            sx={{
              borderRadius: 2,
              backgroundColor: '#E8F5E9',
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
              Approved & Synchronized!
            </Typography>
            <Typography variant="body2">
              The {requestData.type === 'address' ? 'address' : requestData.type} change has been successfully processed and updated in the Core Banking System.
            </Typography>
          </Alert>
        </Box>
      );
    }

    if (requestData.type === 'address') {
      const { addressData } = requestData;
      const documents = addressData.documents || [];

      return (
        <Box>
          <Typography sx={{ fontSize: '0.875rem', color: '#666666', mb: 2 }}>
            Customer wants to update their {requestData.addressType} address:
          </Typography>

          <Box
            sx={{
              backgroundColor: '#F5F5F5',
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
              New Address:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A' }}>
              {addressData.addressLine1}
              {addressData.addressLine2 && `, ${addressData.addressLine2}`}
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#1A1A1A' }}>
              {addressData.upazila}, {addressData.district}
              {addressData.postCode && ` - ${addressData.postCode}`}
            </Typography>
          </Box>

          {/* Supporting Documents */}
          {documents.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1.5 }}>
                Supporting Documents: ({documents.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {documents.map((doc, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E0E0E0',
                      borderRadius: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: '#F0F7FF',
                        borderColor: '#0066FF',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0,102,255,0.1)',
                      },
                    }}
                    onClick={() => handleDocumentClick(doc)}
                  >
                    {/* Thumbnail or Icon */}
                    {doc.type?.startsWith('image/') ? (
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F5',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={getFullUrl(doc.url || doc.path)}
                          alt={doc.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          backgroundColor: '#F5F5F5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0066FF',
                          flexShrink: 0,
                        }}
                      >
                        {getFileIcon(doc.type)}
                      </Box>
                    )}

                    {/* File Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1A1A1A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: '#666666',
                          mt: 0.25,
                        }}
                      >
                        {doc.type?.startsWith('image/') ? 'Image' : 'PDF Document'}
                      </Typography>
                    </Box>

                    {/* Open Icon */}
                    <OpenIcon sx={{ fontSize: 20, color: '#0066FF' }} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Real-time typing display */}
          {Object.keys(realtimeValue).some((key) => key.startsWith('address_')) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>
                Customer is typing...
              </Typography>
              {Object.entries(realtimeValue)
                .filter(([key]) => key.startsWith(`address_${requestData.addressType}_`))
                .map(([key, value]) => (
                  <Typography key={key} sx={{ fontSize: '0.75rem' }}>
                    {key.split('_')[2]}: {value}
                  </Typography>
                ))}
            </Alert>
          )}
        </Box>
      );
    }

    // Phone or Email change
    const isVerified = requestData.verified === true;

    return (
      <Box>
        <Typography sx={{ fontSize: '0.875rem', color: '#666666', mb: 2 }}>
          Customer wants to change their {requestData.type}:
        </Typography>

        {/* Verified Badge */}
        {isVerified && (
          <Alert severity="success" icon={<VerifiedIcon />} sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
              New {requestData.type} verified with OTP
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
              Current {requestData.type === 'phone' ? 'Number' : 'Email'}:
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#FF4444',
                backgroundColor: '#FFE5E5',
                p: 1.5,
                borderRadius: 1,
              }}
            >
              {requestData.type === 'phone' && '+88'}
              {requestData.currentValue}
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '1.5rem', color: '#999999' }}>→</Typography>

          <Box sx={{ flex: 1, position: 'relative' }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#999999', mb: 0.5 }}>
              New {requestData.type === 'phone' ? 'Number' : 'Email'}:
            </Typography>
            <Box sx={{ position: 'relative' }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#4CAF50',
                  backgroundColor: '#E5F7E5',
                  p: 1.5,
                  borderRadius: 1,
                  pr: isVerified ? 5 : 1.5,
                }}
              >
                {requestData.type === 'phone' && '+88'}
                {requestData.newValue}
              </Typography>
              {isVerified && (
                <CheckIcon
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#4CAF50',
                    fontSize: 24,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Real-time typing display */}
        {(realtimeValue[`${requestData.type}_new`] || realtimeValue[`${requestData.type}_confirm`]) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>
              Customer is typing...
            </Typography>
            {realtimeValue[`${requestData.type}_new`] && (
              <Typography sx={{ fontSize: '0.75rem' }}>
                New: {realtimeValue[`${requestData.type}_new`]}
              </Typography>
            )}
            {realtimeValue[`${requestData.type}_confirm`] && (
              <Typography sx={{ fontSize: '0.75rem' }}>
                Confirm: {realtimeValue[`${requestData.type}_confirm`]}
              </Typography>
            )}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <DialogContent sx={{ p: 4 }}>
          {/* Header with Icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#E3F2FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getIcon()}
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#1A1A1A',
                }}
              >
                {getTitle()}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#666666' }}>
                From: {customerName || customerPhone}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Content */}
          {renderContent()}

          {/* Reject Reason Input */}
          {showRejectInput && (
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Enter reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FFFFFF',
                  '& fieldset': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#0066FF',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0066FF',
                    borderWidth: 2,
                  },
                },
              }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          {isApproved ? (
            <Button
              fullWidth
              onClick={() => handleClose(true)}
              startIcon={<CheckIcon />}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#43A047',
                },
              }}
              variant="contained"
            >
              Done - Request Resolved
            </Button>
          ) : !showRejectInput ? (
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <Button
                fullWidth
                onClick={() => setShowRejectInput(true)}
                startIcon={<CancelIcon />}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#FF4444',
                  borderColor: '#FF4444',
                  '&:hover': {
                    borderColor: '#D32F2F',
                    backgroundColor: '#FFE5E5',
                  },
                }}
                variant="outlined"
              >
                Reject
              </Button>
              <Button
                fullWidth
                onClick={handleApprove}
                startIcon={<CheckIcon />}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: '#4CAF50',
                  color: '#FFFFFF',
                  '&:hover': {
                    backgroundColor: '#43A047',
                  },
                }}
                variant="contained"
              >
                Approve & Update
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <Button
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason('');
                }}
                sx={{
                  textTransform: 'none',
                  color: '#666666',
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleReject}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: '#FF4444',
                  color: '#FFFFFF',
                  '&:hover': {
                    backgroundColor: '#D32F2F',
                  },
                }}
                variant="contained"
              >
                Confirm Rejection
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog
        open={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: '#000000',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            backgroundColor: '#000000',
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={() => setShowImagePreview(false)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#1A1A1A',
              zIndex: 10,
              '&:hover': {
                backgroundColor: '#FFFFFF',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Download Button */}
          <IconButton
            component="a"
            href={previewImage}
            download
            target="_blank"
            sx={{
              position: 'absolute',
              top: 16,
              right: 72,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#1A1A1A',
              zIndex: 10,
              '&:hover': {
                backgroundColor: '#FFFFFF',
              },
            }}
          >
            <DownloadIcon />
          </IconButton>

          {/* Image */}
          {previewImage && (
            <img
              src={previewImage}
              alt="Document preview"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

ChangeRequestPanel.propTypes = {
  customerPhone: PropTypes.string.isRequired,
  customerName: PropTypes.string,
  onApprovalComplete: PropTypes.func,
};

export default ChangeRequestPanel;
