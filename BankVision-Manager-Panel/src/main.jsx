import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider } from "react-redux";
import { store, persistor } from './redux/store.jsx';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from './styles/theme.js';
import { ToastContainer } from 'react-toastify';
import { WebSocketProvider } from './providers/WebSocketProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <WebSocketProvider>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
            <ToastContainer />
          </ThemeProvider>
        </BrowserRouter>
      </WebSocketProvider>
    </PersistGate>
  </Provider>,
);