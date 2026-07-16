import { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Paper,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { colors } from '../../styles/tokens';

const SERVICE_OPTIONS = [
  {
    value: 'email_change',
    label: 'Email Change',
    icon: EmailIcon,
    description: 'Update customer email address',
  },
  {
    value: 'phone_change',
    label: 'Phone Change',
    icon: PhoneIcon,
    description: 'Update customer phone number',
  },
  {
    value: 'address_change',
    label: 'Address Change',
    icon: HomeIcon,
    description: 'Update customer address (present or permanent)',
  },
  {
    value: 'account_activation',
    label: 'Account Activation',
    icon: AccountIcon,
    description: 'Activate customer account or service',
  },
];

const ServiceSelector = ({ onServiceSelect, disabled = false }) => {
  const [selectedService, setSelectedService] = useState('');

  const handleChange = (event) => {
    setSelectedService(event.target.value);
  };

  const handleContinue = () => {
    if (selectedService && onServiceSelect) {
      onServiceSelect(selectedService);
    }
  };

  const selectedOption = SERVICE_OPTIONS.find((opt) => opt.value === selectedService);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        backgroundColor: colors.surface,
        borderRadius: 2,
        border: `1px solid ${colors.border}`,
      }}
    >
      <Typography
        sx={{
          fontSize: '1rem',
          fontWeight: 600,
          color: colors.textPrimary,
          mb: 2,
        }}
      >
        Select Service
      </Typography>

      <Typography
        sx={{
          fontSize: '0.875rem',
          color: colors.textSecondary,
          mb: 3,
        }}
      >
        Choose the service you want to provide to the customer
      </Typography>

      {/* Service Selector Dropdown */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <Select
          value={selectedService}
          onChange={handleChange}
          displayEmpty
          disabled={disabled}
          sx={{
            backgroundColor: '#FAFAFA',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary,
              borderWidth: 2,
            },
          }}
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Typography sx={{ color: colors.textMuted, fontSize: '0.875rem' }}>
                  Select your Service
                </Typography>
              );
            }
            const option = SERVICE_OPTIONS.find((opt) => opt.value === selected);
            const Icon = option?.icon;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {Icon && <Icon sx={{ fontSize: 20, color: colors.primary }} />}
                <Typography sx={{ fontSize: '0.875rem' }}>{option?.label}</Typography>
              </Box>
            );
          }}
        >
          <MenuItem value="" disabled>
            <Typography sx={{ fontSize: '0.875rem', color: colors.textMuted }}>
              Select your Service
            </Typography>
          </MenuItem>
          {SERVICE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Icon sx={{ fontSize: 20, color: colors.primary }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {option.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                      {option.description}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* Service Description */}
      {selectedOption && (
        <Box
          sx={{
            p: 2,
            backgroundColor: '#E3F2FD',
            borderRadius: 2,
            mb: 3,
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', color: colors.primary, fontWeight: 500 }}>
            {selectedOption.description}
          </Typography>
        </Box>
      )}

      {/* Continue Button */}
      <Button
        fullWidth
        onClick={handleContinue}
        disabled={!selectedService || disabled}
        sx={{
          py: 1.5,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          backgroundColor: colors.primary,
          color: '#FFFFFF',
          borderRadius: '8px',
          '&:hover': {
            backgroundColor: colors.primaryDark,
          },
          '&.Mui-disabled': {
            backgroundColor: colors.border,
            color: colors.textMuted,
          },
        }}
        variant="contained"
      >
        Continue
      </Button>
    </Paper>
  );
};

ServiceSelector.propTypes = {
  onServiceSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ServiceSelector;
