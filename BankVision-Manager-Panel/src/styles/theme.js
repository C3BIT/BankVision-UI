import { createTheme } from '@mui/material/styles';
import { colors, gradients } from './tokens';

const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      dark: colors.primaryDark,
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: colors.background,
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      background: gradients.brand,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      background: gradients.brand,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h3: {
      background: gradients.brand,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h4: {
      background: gradients.brand,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h5: {
      background: gradients.brand,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h6: {
      background: gradients.brand,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          background: gradients.brand,
          boxShadow: 'none',
          '&:hover': {
            background: gradients.brand,
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          },
          '&.Mui-disabled': {
            background: 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export default theme;