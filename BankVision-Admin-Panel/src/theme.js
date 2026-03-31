import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2rem',
            fontWeight: 600,
        },
        h4: {
            fontSize: '1.75rem',
            fontWeight: 600,
        },
        h5: {
            fontSize: '1.5rem',
            fontWeight: 600,
        },
        h6: {
            fontSize: '1.25rem',
            fontWeight: 600,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    palette: {
        primary: {
            main: '#0066FF',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#FF4444',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#F5F5F5',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#1A1A1A',
            secondary: '#666666',
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
                    backgroundColor: '#FFFFFF',
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#0066FF',
                        borderWidth: 2,
                    },
                },
            },
        },
    },
});

export default theme;
