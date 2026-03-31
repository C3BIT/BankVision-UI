import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Select,
  FormControl,
  Alert,
  Divider,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../../context/WebSocketContext';
import { publicPostFile } from '../../services/apiCaller';

const ChangeAddressModal = ({ open, onClose, onSubmit, currentAddress }) => {
  const { socket } = useWebSocket();
  const fileInputRef = useRef(null);
  const managerTypingTimerRef = useRef(null);
  const [addressType, setAddressType] = useState('present');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [postCode, setPostCode] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [managerIsTyping, setManagerIsTyping] = useState(false);

  // Listen for manager typing - update fields in real-time
  useEffect(() => {
    if (!socket) return;

    const handleManagerTyping = (data) => {
      const { field, value, addressType: type } = data;

      // Flash indicator to show manager is filling data
      setManagerIsTyping(true);
      if (managerTypingTimerRef.current) clearTimeout(managerTypingTimerRef.current);
      managerTypingTimerRef.current = setTimeout(() => setManagerIsTyping(false), 1500);

      if (type) setAddressType(type);

      switch (field) {
        case 'addressLine1': setAddressLine1(value); break;
        case 'addressLine2': setAddressLine2(value); break;
        case 'district': setDistrict(value); break;
        case 'upazila': setUpazila(value); break;
        case 'postCode': setPostCode(value); break;
        case 'addressType': setAddressType(value); break;
        default: break;
      }
    };

    socket.on('manager:typing-address-change', handleManagerTyping);

    return () => {
      socket.off('manager:typing-address-change', handleManagerTyping);
      if (managerTypingTimerRef.current) clearTimeout(managerTypingTimerRef.current);
    };
  }, [socket]);

  // Per-field timers so paste into one field never cancels another field's pending emit
  const emitTimersRef = useRef({});
  const socketRef = useRef(socket);
  const addressTypeRef = useRef(addressType);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { addressTypeRef.current = addressType; }, [addressType]);

  const emitAddressChange = (field, value) => {
    if (emitTimersRef.current[field]) clearTimeout(emitTimersRef.current[field]);
    emitTimersRef.current[field] = setTimeout(() => {
      const s = socketRef.current;
      if (s) {
        s.emit('customer:typing-address-change', {
          addressType: addressTypeRef.current,
          field,
          value,
        });
      }
    }, 300);
  };

  const handleAddressTypeChange = (event, newType) => {
    if (newType !== null) {
      setAddressType(newType);
    }
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      let validFileCount = 0;

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name} is too large. Max size is 10MB.`);
          continue;
        }
        formData.append('files', file);
        validFileCount++;
      }

      if (validFileCount === 0) return;

      const response = await publicPostFile('/image/upload-multiple', formData);
      const newFiles = response?.data?.files || [];

      if (newFiles.length > 0) {
        setUploadedFiles((prev) => {
          const combined = [...prev, ...newFiles];
          // Notify manager in real-time about the uploaded documents
          if (socket) {
            socket.emit('customer:address-documents-uploaded', {
              files: combined,
              timestamp: Date.now()
            });
          }
          return combined;
        });
      } else {
        setUploadError('Upload failed — no files returned');
      }
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Failed to upload file(s)');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (socket) {
        socket.emit('customer:address-document-removed', {
          fileIndex: index,
          files: updated,
          timestamp: Date.now()
        });
      }
      return updated;
    });
  };

  const handleSubmit = () => {
    const addressData = {
      type: addressType,
      addressLine1,
      addressLine2,
      district,
      upazila,
      postCode,
      documents: uploadedFiles,
    };

    console.log('📤 Submitting address change request:', {
      addressType,
      addressData,
      uploadedFiles: JSON.stringify(uploadedFiles)
    });

    // Send to manager for approval (not directly to backend)
    if (socket) {
      socket.emit('customer:submit-address-change-request', {
        addressType,
        addressData
      });
    }

    onSubmit(addressData);
  };

  const handleClose = () => {
    setAddressLine1('');
    setAddressLine2('');
    setDistrict('');
    setUpazila('');
    setPostCode('');
    setUploadedFiles([]);
    setUploadError('');
    onClose();
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon />;
    if (fileType === 'application/pdf') return <PdfIcon />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isFormValid = addressLine1 && district && upazila && postCode && uploadedFiles.length > 0;

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
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              color: '#666666',
              '&:hover': { backgroundColor: '#F0F0F0' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography
          sx={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#0066FF',
            mb: 2,
            textAlign: 'center',
          }}
        >
          Change Address
        </Typography>

        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#666666',
            mb: 2,
            textAlign: 'center',
          }}
        >
          Select your address type
        </Typography>

        {/* Manager typing indicator */}
        {managerIsTyping && (
          <Alert
            severity="info"
            icon={<EditIcon fontSize="small" />}
            sx={{ mb: 2, py: 0.5, fontSize: '0.8125rem' }}
          >
            Manager is filling in your address details...
          </Alert>
        )}

        {/* Current Address Display */}
        {currentAddress && currentAddress[addressType] && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: '#666666', mb: 0.5, fontWeight: 600 }}>
              Current {addressType === 'present' ? 'Present' : 'Permanent'} Address:
            </Typography>
            <Typography sx={{ fontSize: '0.813rem', color: '#1A1A1A', lineHeight: 1.4 }}>
              {currentAddress[addressType].addressLine1}
              {currentAddress[addressType].addressLine2 && `, ${currentAddress[addressType].addressLine2}`}
              <br />
              {currentAddress[addressType].upazila}, {currentAddress[addressType].district}
              {currentAddress[addressType].postCode && ` - ${currentAddress[addressType].postCode}`}
            </Typography>
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Address Type Toggle */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={addressType}
            exclusive
            onChange={handleAddressTypeChange}
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderColor: '#E0E0E0',
                color: '#666666',
                '&.Mui-selected': {
                  backgroundColor: '#0066FF',
                  color: '#FFFFFF',
                  '&:hover': {
                    backgroundColor: '#0052CC',
                  },
                },
              },
            }}
          >
            <ToggleButton value="present">Present Address</ToggleButton>
            <ToggleButton value="permanent">Permanent Address</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Your new address label */}
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#666666',
            mb: 2,
          }}
        >
          Your new address
        </Typography>

        {/* Address Line 1 */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#999999',
              mb: 0.5,
            }}
          >
            Address Line 1
          </Typography>
          <TextField
            fullWidth
            placeholder="Address"
            value={addressLine1}
            onChange={(e) => {
              const value = e.target.value;
              setAddressLine1(value);
              emitAddressChange('addressLine1', value);
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FFFFFF',
                fontSize: '0.875rem',
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
        </Box>

        {/* Address Line 2 */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#999999',
              mb: 0.5,
            }}
          >
            Address Line 2
          </Typography>
          <TextField
            fullWidth
            placeholder="Address"
            value={addressLine2}
            onChange={(e) => {
              const value = e.target.value;
              setAddressLine2(value);
              emitAddressChange('addressLine2', value);
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FFFFFF',
                fontSize: '0.875rem',
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
        </Box>

        {/* District and Upazila/Thana Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {/* District */}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#999999',
                mb: 0.5,
              }}
            >
              District
            </Typography>
            <FormControl fullWidth>
              <Select
                value={district}
                onChange={(e) => {
                  const value = e.target.value;
                  setDistrict(value);
                  emitAddressChange('district', value);
                }}
                displayEmpty
                sx={{
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.875rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0066FF',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0066FF',
                    borderWidth: 2,
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select District
                </MenuItem>
                <MenuItem value="dhaka">Dhaka</MenuItem>
                <MenuItem value="chittagong">Chittagong</MenuItem>
                <MenuItem value="rajshahi">Rajshahi</MenuItem>
                <MenuItem value="sylhet">Sylhet</MenuItem>
                <MenuItem value="khulna">Khulna</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Post Code */}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#999999',
                mb: 0.5,
              }}
            >
              Post Code
            </Typography>
            <TextField
              fullWidth
              placeholder="Post Code"
              value={postCode}
              onChange={(e) => {
                const value = e.target.value;
                setPostCode(value);
                emitAddressChange('postCode', value);
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.875rem',
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
          </Box>
        </Box>

        {/* Upazila/Thana */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#999999',
              mb: 0.5,
            }}
          >
            Upazila / Thana
          </Typography>
          <FormControl fullWidth>
            <Select
              value={upazila}
              onChange={(e) => {
                const value = e.target.value;
                setUpazila(value);
                emitAddressChange('upazila', value);
              }}
              displayEmpty
              sx={{
                backgroundColor: '#FFFFFF',
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#E0E0E0',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#0066FF',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#0066FF',
                  borderWidth: 2,
                },
              }}
            >
              <MenuItem value="" disabled>
                Select Thana
              </MenuItem>
              <MenuItem value="dhanmondi">Dhanmondi</MenuItem>
              <MenuItem value="gulshan">Gulshan</MenuItem>
              <MenuItem value="mirpur">Mirpur</MenuItem>
              <MenuItem value="uttara">Uttara</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Supporting Documents Section */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#1A1A1A',
              mb: 1,
            }}
          >
            Supporting Documents *
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#666666',
              mb: 2,
            }}
          >
            Upload proof of address (utility bill, bank statement, etc.)
          </Typography>

          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <Button
            fullWidth
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              borderColor: '#E0E0E0',
              color: '#666666',
              borderStyle: 'dashed',
              borderWidth: 2,
              '&:hover': {
                borderColor: '#0066FF',
                backgroundColor: '#F0F7FF',
              },
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload Files (JPG, PNG, PDF)'}
          </Button>

          {/* Upload Error */}
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {uploadedFiles.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    backgroundColor: '#F5F5F5',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ color: '#0066FF', display: 'flex' }}>
                    {getFileIcon(file.type)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#1A1A1A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: '#999999',
                      }}
                    >
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    sx={{
                      color: '#FF4444',
                      '&:hover': {
                        backgroundColor: '#FFE5E5',
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {uploadedFiles.length === 0 && !isUploading && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please upload at least one supporting document
            </Alert>
          )}
        </Box>

        {/* Submit to Manager Button */}
        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={!isFormValid}
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            backgroundColor: '#0066FF',
            color: '#FFFFFF',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#0052CC',
            },
            '&.Mui-disabled': {
              backgroundColor: '#E0E0E0',
              color: '#999999',
            },
          }}
          variant="contained"
        >
          Send to Manager
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeAddressModal;
