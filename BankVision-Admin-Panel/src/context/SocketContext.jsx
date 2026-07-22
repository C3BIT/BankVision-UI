import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { WS_URL } from '../config.js';

const SOCKET_URL = WS_URL;

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [managerStatuses, setManagerStatuses] = useState({}); // { email: { status: 'online', socketId: '...' } }
    const [assistanceRequests, setAssistanceRequests] = useState([]); // pending manager support requests

    useEffect(() => {
        if (user && user.role) {
            // Auth is resolved server-side from the httpOnly auth_token cookie
            // (socketAuthMiddleware parses it from the handshake's Cookie header),
            // so withCredentials replaces passing the token in the query string.
            const newSocket = io(SOCKET_URL, {
                query: {
                    role: 'admin', // identify as admin
                },
                withCredentials: true,
                transports: ['websocket'],
                reconnection: true,
            });

            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
                setIsConnected(true);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            // Listen for manager status updates (if backend emits them globally or to admins)
            // The backend emits 'manager:status-changed' or broadcost via 'manager:available'
            // We might need to handle specific events.
            // For now, we expose the socket so components can listen.

            // Example: Capture status updates globally if needed
            newSocket.on('manager:status-update', (data) => {
                // data: { email, status, socketId }
                setManagerStatuses(prev => ({
                    ...prev,
                    [data.email]: data
                }));
            });

            // Also potentially 'customer:queue-updated'

            // A manager needs supervisor help during a call — keep a de-duped
            // pending list; the backend re-emits this on an interval until
            // accepted/cancelled/timed out, so ignore repeats of the same requestId.
            newSocket.on('supervisor:assistance-requested', (request) => {
                setAssistanceRequests(prev =>
                    prev.some(r => r.requestId === request.requestId) ? prev : [...prev, request]
                );
            });

            newSocket.on('supervisor:assistance-cancelled', ({ requestId }) => {
                setAssistanceRequests(prev => prev.filter(r => r.requestId !== requestId));
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user]);

    const dismissAssistanceRequest = (requestId) => {
        setAssistanceRequests(prev => prev.filter(r => r.requestId !== requestId));
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, managerStatuses, assistanceRequests, dismissAssistanceRequest }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
