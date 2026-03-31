import { useState, useRef, useEffect } from 'react';
import { Box, TextField } from '@mui/material';
import PropTypes from 'prop-types';

const OtpInput = ({ length = 6, onComplete, reset = false }) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Clear OTP when reset prop changes
  useEffect(() => {
    if (reset) {
      setOtp(Array(length).fill(''));
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  }, [reset, length]);

  useEffect(() => {
    const allFilled = otp.every(digit => digit !== '');
    if (allFilled) {
      onComplete(otp.join(''));
    }
  }, [otp, onComplete]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    
    if (value && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };
  
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      
      for (let i = 0; i < Math.min(length, pastedData.length); i++) {
        newOtp[i] = pastedData[i];
      }
      
      setOtp(newOtp);
      
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIndex].focus();
    }
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        gap: 2,
        width: '100%',
        my: 2
      }}
    >
      {Array.from({ length }, (_, index) => (
        <TextField
          key={index}
          inputRef={(ref) => {
            inputRefs.current[index] = ref;
          }}
          value={otp[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={index === 0 ? handlePaste : undefined}
          variant="outlined"
          sx={{
            width: '60px',
            textAlign: 'center',
            '& input': { textAlign: 'center', fontSize: '1.5rem' }
          }}
          inputProps={{
            maxLength: 1,
            style: { textAlign: 'center' }
          }}
        />
      ))}
    </Box>
  );
};

OtpInput.propTypes = {
  length: PropTypes.number,
  onComplete: PropTypes.func.isRequired,
  reset: PropTypes.bool
};

export default OtpInput;