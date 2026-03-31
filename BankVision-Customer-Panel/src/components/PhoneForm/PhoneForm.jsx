import { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import PropTypes from 'prop-types';

const PhoneForm = ({ phone, setPhone, onStartCall, isLoading = false, disabled = false }) => {
    const [isTouched, setIsTouched] = useState(false);
    const validPrefixes = ['013', '014', '015', '016', '017', '018', '019'];

    const isValidPhone = (phone) => {
        return phone.length === 11 && validPrefixes.includes(phone.substring(0, 3));
    };

    const isError = isTouched && !isValidPhone(phone);

    const handlePhoneChange = (e) => {
        const input = e.target.value.replace(/\D/g, '');
        if (input.length <= 11) {
            setPhone(input);
        }
    };

    const handleBlur = () => {
        setIsTouched(true);
    };

    const handleSubmit = () => {
        if (isValidPhone(phone)) {
            onStartCall();
        }
    };

    return (
        <Box sx={{
            width: '100%',
            '& .MuiTextField-root': { width: '100%' }
        }}>
            {/* Label */}
            <Typography
                sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#666666',
                    mb: 1,
                }}
            >
                Mobile Number
            </Typography>

            {/* Phone Input */}
            <TextField
                fullWidth
                placeholder="Ex: 017XXXXXXXX"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={handleBlur}
                error={isError}
                helperText={isError ? "Please enter a valid Bangladeshi phone number" : ""}
                margin="none"
                variant="outlined"
                sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#FFFFFF',
                        fontSize: '1rem',
                        '& fieldset': {
                            borderColor: isError ? '#FF4444' : '#E0E0E0',
                        },
                        '&:hover fieldset': {
                            borderColor: isError ? '#FF4444' : '#0066FF',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: isError ? '#FF4444' : '#0066FF',
                            borderWidth: 2,
                        },
                    },
                    '& .MuiInputBase-input': {
                        padding: '14px 16px',
                    },
                    '& .MuiInputBase-input::placeholder': {
                        color: '#999999',
                        opacity: 1,
                    },
                    '& .MuiFormHelperText-root': {
                        marginLeft: 0,
                        marginTop: '6px',
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Typography sx={{ color: '#666666', fontWeight: 500 }}>
                                +88
                            </Typography>
                        </InputAdornment>
                    ),
                }}
            />

            {/* Submit Button */}
            <Button
                fullWidth
                variant="contained"
                disabled={!isValidPhone(phone) || isLoading || disabled}
                onClick={handleSubmit}
                sx={{
                    py: 1.75,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: '#FFFFFF',
                    backgroundColor: '#0066FF',
                    borderRadius: '8px',
                    boxShadow: 'none',
                    '&:hover': {
                        backgroundColor: '#0052CC',
                        boxShadow: 'none',
                        transform: 'translateY(-1px)',
                    },
                    '&:active': {
                        transform: 'translateY(0)',
                    },
                    '&.Mui-disabled': {
                        backgroundColor: '#E0E0E0',
                        color: '#999999',
                    },
                    transition: 'all 0.2s ease-in-out',
                }}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
                {isLoading ? 'Connecting...' : 'Initiate Video Call'}
            </Button>
        </Box>
    );
};

PhoneForm.propTypes = {
    phone: PropTypes.string.isRequired,
    setPhone: PropTypes.func.isRequired,
    onStartCall: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    disabled: PropTypes.bool
};

PhoneForm.defaultProps = {
    isLoading: false,
    disabled: false
};

export default PhoneForm;