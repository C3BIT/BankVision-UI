import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    Alert,
    Collapse,
    IconButton,
    Skeleton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    CircularProgress,
    Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { verifyPhoneOtp } from '../../redux/auth/customerSlice';
import OtpInput from '../common/OtpInput';
import { fetchCustomerDetailsByAccount, updateCustomerAddress } from '../../redux/auth/customerInfoSlice';
import LoadingButton from '../common/LoadingButton';
import { publicPostFile } from '../../services/apiCaller';

const ADDRESS_TYPES = [
    { value: 'present', label: 'Present Address' },
    { value: 'permanent', label: 'Permanent Address' },
    { value: 'office', label: 'Office Address' }
];


const AddressChangeRequest = ({ currentAddress, socket }) => {
    const { accountDetails } = useSelector((state) => state.customerInfo);
    const [newAddress, setNewAddress] = useState('');
    const [addressType, setAddressType] = useState('present');
    const [customerUpdateInfo, setCustomerUpdateInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showOtpAlert, setShowOtpAlert] = useState(false);
    const [showOtpVerification, setShowOtpVerification] = useState(false);
    const [otp, setOtp] = useState('');
    const [addressError, setAddressError] = useState('');
    const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
    const [addressUpdated, setAddressUpdated] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const dispatch = useDispatch();

    const handleAddressChange = (e) => {
        const value = e.target.value;
        setNewAddress(value);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socket && value) {
                socket.emit('customer:typing-address-change', {
                    addressType,
                    field: 'addressLine1',
                    value: value,
                    timestamp: new Date().toISOString()
                });
            }
        }, 500);
    };

    const fetchAccountDetails = async (accountNumber) => {
        try {
            setLoading(true);
            await dispatch(fetchCustomerDetailsByAccount({ accountNumber })).unwrap();
        } catch (error) {
            console.error('Failed to fetch account details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddressVerification = async () => {
        if (otp.length === 6) {
            try {
                setIsVerifyingAddress(true);
                setAddressError('');

                const verificationResponse = await dispatch(
                    verifyPhoneOtp({ phone: customerUpdateInfo?.phone, otp })
                ).unwrap();

                if (verificationResponse.isVerified) {
                    const updateResponse = await dispatch(
                        updateCustomerAddress({
                            accountNumber: customerUpdateInfo?.accountNumber,
                            address: newAddress,
                            addressType
                        })
                    ).unwrap();

                    if (updateResponse.isAddressUpadated) {
                        socket.emit('customer:address-changed', {
                            address: newAddress,
                            addressType,
                            accountNumber: customerUpdateInfo?.accountNumber,
                            documents: uploadedFiles,
                            timestamp: new Date().toISOString()
                        });
                        setAddressUpdated(true);
                        setShowSuccessMessage(true);
                        setTimeout(() => setShowSuccessMessage(false), 10000);
                        await fetchAccountDetails(customerUpdateInfo?.accountNumber);
                    }
                }
            } catch (error) {
                setAddressError('Error during verification: ' + error.message);
            } finally {
                setIsVerifyingAddress(false);
            }
        }
    };

    // File upload handlers
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Check max files limit
        if (uploadedFiles.length + files.length > 5) {
            setUploadError('Maximum 5 files allowed');
            return;
        }

        setIsUploading(true);
        setUploadError('');

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            const response = await publicPostFile('/image/upload-multiple', formData);

            if (response?.data?.files) {
                const newFiles = [...uploadedFiles, ...response.data.files];
                setUploadedFiles(newFiles);

                // Notify manager about uploaded files
                if (socket) {
                    socket.emit('customer:address-documents-uploaded', {
                        files: newFiles,
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.response?.data?.message || 'Failed to upload files');
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveFile = (index) => {
        const newFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(newFiles);

        // Notify manager about removed file
        if (socket) {
            socket.emit('customer:address-document-removed', {
                fileIndex: index,
                files: newFiles,
                timestamp: Date.now()
            });
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    useEffect(() => {
        if (!socket) return;

        const handleOtpSent = (data) => {
            setCustomerUpdateInfo({
                phone: data.phone,
                accountNumber: data.accountNumber,
                timestamp: data.timestamp
            });
            setShowOtpAlert(true);
            setShowOtpVerification(true);
            setTimeout(() => setShowOtpAlert(false), 8000);
        };

        // Listen for manager typing individual address fields
        const handleManagerTyping = (data) => {
            if (data.addressType) {
                setAddressType(data.addressType);
            }
            // Map any address field to the single newAddress textarea
            if (data.value !== undefined && data.field && data.field !== 'addressType') {
                setNewAddress(prev => {
                    // If manager is setting addressLine1, replace address; otherwise append
                    if (data.field === 'addressLine1') return data.value;
                    return prev;
                });
            }
        };

        // Listen for manager completing address submission on behalf of customer
        const handleAddressSubmitted = (data) => {
            if (data.addressData) {
                const parts = [
                    data.addressData.addressLine1,
                    data.addressData.addressLine2,
                    data.addressData.upazila,
                    data.addressData.district,
                    data.addressData.postCode
                ].filter(Boolean);
                setNewAddress(parts.join(', '));
                if (data.addressType) setAddressType(data.addressType);
            }
        };

        socket.on('customer:address-change-otp-sent', handleOtpSent);
        socket.on('manager:typing-address-change', handleManagerTyping);
        socket.on('customer:submit-address-change-request', handleAddressSubmitted);

        return () => {
            socket.off('customer:address-change-otp-sent', handleOtpSent);
            socket.off('manager:typing-address-change', handleManagerTyping);
            socket.off('customer:submit-address-change-request', handleAddressSubmitted);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [socket]);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            gap: 2,
            p: 2
        }}>
            {addressUpdated ? (
                <>
                    <Collapse in={showSuccessMessage}>
                        <Alert
                            severity="success"
                            sx={{ mb: 3 }}
                            action={
                                <IconButton
                                    aria-label="close"
                                    color="inherit"
                                    size="small"
                                    onClick={() => setShowSuccessMessage(false)}
                                >
                                    <CloseIcon fontSize="inherit" />
                                </IconButton>
                            }
                        >
                            Address updated successfully!
                        </Alert>
                    </Collapse>

                    <Typography variant="h5" sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
                        Account Details
                    </Typography>

                    {loading ? (
                        <Box sx={{ p: 2 }}>
                            <Skeleton variant="rectangular" width="100%" height={118} sx={{ mb: 1, borderRadius: 1 }} />
                            <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
                            <Skeleton variant="text" width="70%" sx={{ mb: 1 }} />
                            <Skeleton variant="text" width="80%" sx={{ mb: 1 }} />
                        </Box>
                    ) : (
                        <Box sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            p: 3,
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{
                                    width: 100,
                                    height: 100,
                                    mr: 3,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '2px solid white'
                                }}>
                                    <img
                                        src={accountDetails?.profileImage}
                                        alt={accountDetails?.name || "Profile"}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            backgroundColor: !accountDetails?.profileImage ? '#eee' : 'transparent'
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={{ color: 'white', mb: 0.5 }}>
                                        <strong>Name: </strong>{accountDetails?.name}
                                    </Typography>
                                    <Typography sx={{ color: 'white', mb: 0.5 }}>
                                        <strong>Mobile: </strong>{accountDetails?.mobileNumber}
                                    </Typography>
                                    <Typography sx={{ color: 'white', mb: 0.5 }}>
                                        <strong>Email: </strong>{accountDetails?.email}
                                    </Typography>
                                    <Typography sx={{ color: 'white', mb: 0.5 }}>
                                        <strong>Address: </strong>{accountDetails?.address}
                                    </Typography>
                                    <Typography sx={{ color: 'white', mb: 0 }}>
                                        <strong>Branch: </strong>{accountDetails?.branch}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </>
            ) : (
                <>
                    <Typography variant="h6" sx={{ color: 'white', textAlign: "center", fontWeight: 'medium' }}>
                        Address Update
                    </Typography>

                    <Collapse in={showOtpAlert}>
                        <Alert
                            severity="success"
                            action={
                                <IconButton
                                    aria-label="close"
                                    color="inherit"
                                    size="small"
                                    onClick={() => setShowOtpAlert(false)}
                                >
                                    <CloseIcon fontSize="inherit" />
                                </IconButton>
                            }
                            sx={{ mb: 2 }}
                        >
                            OTP sent to your registered phone for account {customerUpdateInfo?.accountNumber}
                        </Alert>
                    </Collapse>

                    <TextField
                        fullWidth
                        value={currentAddress || 'Not available'}
                        variant="outlined"
                        label="Current Address"
                        InputProps={{ readOnly: true }}
                        multiline
                        rows={2}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '6px',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(0, 0, 0, 0.1)',
                                },
                            },
                        }}
                    />

                    <FormControl fullWidth sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '6px' }}>
                        <InputLabel>Address Type</InputLabel>
                        <Select
                            value={addressType}
                            label="Address Type"
                            onChange={(e) => setAddressType(e.target.value)}
                        >
                            {ADDRESS_TYPES.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        value={newAddress}
                        onChange={handleAddressChange}
                        onBlur={() => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); }}
                        variant="outlined"
                        label="New Address"
                        placeholder="Enter new address"
                        multiline
                        rows={3}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '6px',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(0, 0, 0, 0.1)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#4CAF50',
                                },
                            },
                        }}
                    />

                    {/* File Upload Section */}
                    <Box sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        p: 2,
                        border: '1px dashed rgba(255, 255, 255, 0.3)'
                    }}>
                        <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                            Supporting Documents (Optional)
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 2 }}>
                            Upload utility bill, bank statement, or other address proof (Max 5 files, 10MB each)
                        </Typography>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            accept="image/*,.pdf,.doc,.docx"
                            style={{ display: 'none' }}
                        />

                        <Button
                            variant="outlined"
                            startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || uploadedFiles.length >= 5}
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                '&:hover': {
                                    borderColor: 'white',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                },
                                '&.Mui-disabled': {
                                    color: 'rgba(255, 255, 255, 0.3)',
                                    borderColor: 'rgba(255, 255, 255, 0.2)'
                                }
                            }}
                        >
                            {isUploading ? 'Uploading...' : 'Upload Documents'}
                        </Button>

                        {uploadError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {uploadError}
                            </Alert>
                        )}

                        {uploadedFiles.length > 0 && (
                            <List sx={{ mt: 2 }}>
                                {uploadedFiles.map((file, index) => (
                                    <ListItem
                                        key={index}
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            mb: 1
                                        }}
                                    >
                                        <ListItemIcon>
                                            <InsertDriveFileIcon sx={{ color: 'white' }} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={file.originalName}
                                            secondary={formatFileSize(file.size)}
                                            primaryTypographyProps={{ sx: { color: 'white', fontSize: '0.9rem' } }}
                                            secondaryTypographyProps={{ sx: { color: 'rgba(255, 255, 255, 0.6)' } }}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton
                                                edge="end"
                                                onClick={() => handleRemoveFile(index)}
                                                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        )}

                        {uploadedFiles.length > 0 && (
                            <Chip
                                label={`${uploadedFiles.length}/5 files uploaded`}
                                size="small"
                                sx={{
                                    mt: 1,
                                    backgroundColor: 'rgba(76, 175, 80, 0.3)',
                                    color: 'white'
                                }}
                            />
                        )}
                    </Box>

                    {showOtpVerification && (
                        <>
                            <Typography variant="body2" sx={{ color: 'white', textAlign: 'center', mb: 1 }}>
                                Enter OTP sent to your registered phone
                            </Typography>
                            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                                <OtpInput
                                    length={6}
                                    onComplete={setOtp}
                                    inputStyle={{
                                        width: '40px',
                                        height: '40px',
                                        margin: '0 5px',
                                        border: '1px solid #DDE2E5',
                                        backgroundColor: '#EFF1F94D',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '16px',
                                    }}
                                />
                            </Box>

                            {addressError && (
                                <Alert severity="error" sx={{ mb: 3 }}>
                                    {addressError}
                                </Alert>
                            )}

                            <LoadingButton
                                variant="contained"
                                fullWidth
                                onClick={handleAddressVerification}
                                loading={isVerifyingAddress}
                                disabled={otp.length !== 6}
                                sx={{
                                    mt: 3,
                                    background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                                    color: 'white',
                                    '&:hover': {
                                        background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                                        opacity: 0.9,
                                    },
                                    '&.Mui-disabled': {
                                        background: '#f5f5f5',
                                        color: '#bdbdbd',
                                    },
                                }}
                            >
                                Verify OTP & Update Address
                            </LoadingButton>
                        </>
                    )}
                </>
            )}
        </Box>
    );
};

AddressChangeRequest.propTypes = {
    currentAddress: PropTypes.string,
    socket: PropTypes.object.isRequired
};

export default AddressChangeRequest;
