import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

// Create context
const WebSocketContext = createContext(null);

// Minimal WebSocketProvider for admin panel
// Accepts socket as a prop and provides it via context to child components
export const WebSocketProvider = ({ socket, children }) => {
  // Minimal implementation of functions that components might need
  const requestRetakeImage = () => {
    socket?.emit('manager:request-retake-image', { timestamp: Date.now() });
  };

  const requestCaptureImage = () => {
    socket?.emit('manager:capture-image', { timestamp: Date.now() });
  };

  const verifyFaceClientSide = async (image1, image2) => {
    // Client-side face verification not available in admin panel
    // Fall back to server-side
    return { matched: false, similarity: 0, confidence: 0 };
  };

  const value = {
    socket,
    requestRetakeImage,
    requestCaptureImage,
    verifyFaceClientSide,
    faceApiReady: false, // Client-side face-api not available in admin panel
    customerEmotions: null,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

WebSocketProvider.propTypes = {
  socket: PropTypes.object,
  children: PropTypes.node.isRequired,
};

// Hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Return a safe default if used outside provider
    return {
      socket: null,
      requestRetakeImage: () => {},
      requestCaptureImage: () => {},
      verifyFaceClientSide: async () => ({ matched: false, similarity: 0, confidence: 0 }),
      faceApiReady: false,
      customerEmotions: null,
    };
  }
  return context;
};

export default WebSocketProvider;
