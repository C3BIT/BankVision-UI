import { Component } from 'react';
import { BrowserRouter as Router } from "react-router-dom";
import { AppRouter } from "./routes/Router";
import { createTheme, ThemeProvider } from '@mui/material/styles';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[App Error Boundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <h2 style={{ color: '#CC0000', marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              style={{ padding: '10px 24px', backgroundColor: '#0066FF', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.5rem',
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
          padding: '12px 24px',
          fontSize: '1rem',
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
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#E0E0E0',
            },
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
  },
});
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider theme={theme}>
          <AppRouter />
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}
export default App;