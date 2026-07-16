import { createTheme } from '@mui/material/styles';
import { colors, gradients } from './theme/tokens';

const theme = createTheme({
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2rem',
            fontWeight: 600,
            background: gradients.brand,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        h4: {
            fontSize: '1.75rem',
            fontWeight: 600,
            background: gradients.brand,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        h5: {
            fontSize: '1.5rem',
            fontWeight: 600,
            background: gradients.brand,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        h6: {
            fontSize: '1.25rem',
            fontWeight: 600,
            background: gradients.brand,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    palette: {
        primary: {
            main: colors.primary,
            dark: colors.primaryDark,
            contrastText: colors.surface,
        },
        secondary: {
            main: colors.error,
            contrastText: colors.surface,
        },
        background: {
            default: colors.background,
            paper: colors.surface,
        },
        text: {
            primary: colors.textPrimary,
            secondary: colors.textSecondary,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 20px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                contained: {
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        transition: 'transform 0.2s ease-in-out',
                    },
                },
                containedPrimary: {
                    background: gradients.brand,
                    '&:hover': {
                        background: gradients.brand,
                    },
                    '&.Mui-disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
                elevation3: {
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.primary,
                        borderWidth: 2,
                    },
                },
            },
        },
    },
});

export default theme;
