import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Grid, Link, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import AuthLayout from '../../components/layout/AuthLayout';
import FormInput from '../../components/common/FormInput';
import PasswordInput from '../../components/common/PasswordInput';
import LoadingButton from '../../components/common/LoadingButton';
import { useDispatch, useSelector } from 'react-redux';
import { loginManager } from '../../redux/auth/authSlice';
import Toast from '../../utils/toast'; 

const Login = () => {
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const dispatch = useDispatch();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    if (errors.submit && (name === 'email' || name === 'password')) {
      setErrors((prev) => ({
        ...prev,
        submit: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      Toast.error('Please fix the errors in the form');
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await dispatch(
        loginManager({
          email: formData.email,
          password: formData.password,
        })
      ).unwrap();
      
      Toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error?.message || 'Invalid email or password';
      setErrors({ submit: errorMessage });
      Toast.error(errorMessage);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    navigate('/forgot-password');
    Toast.info('Enter your email to reset your password');
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Log in to your account to continue">
      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
        <FormInput
          required
          name="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          InputProps={{
            startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#DDE2E5',
              },
              '&:hover fieldset': {
                borderColor: '#DDE2E5',
              },
              backgroundColor: '#EFF1F94D',
            },
          }}
          fullWidth
          margin="normal"
        />

        <PasswordInput
          required
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#DDE2E5',
              },
              '&:hover fieldset': {
                borderColor: '#DDE2E5',
              },
              backgroundColor: '#EFF1F94D',
            },
          }}
          fullWidth
          margin="normal"
        />
        
        <Grid container justifyContent="flex-end">
          <Grid item>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleForgotPassword}
              sx={{ textDecoration: 'none', color: 'text.secondary', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Forgot password?
            </Link>
          </Grid>
        </Grid>
        
        {errors.submit && (
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            {errors.submit}
          </Typography>
        )}
        
        <LoadingButton
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          loading={loading}
          sx={{ 
            mt: 3, 
            mb: 2,
            background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
              opacity: 0.9,
            },
          }}
        >
          Sign In
        </LoadingButton>
        
        <Grid container justifyContent="center">
          <Grid item>
            <Link 
              component={RouterLink} 
              to="/signup" 
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              Don't have an account? Sign up
            </Link>
          </Grid>
        </Grid>
      </Box>
    </AuthLayout>
  );
};

export default Login;