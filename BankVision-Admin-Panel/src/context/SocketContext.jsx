import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'https://mtb-backend.ucchash4vc.xyz';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [managerStatuses, setManagerStatuses] = useState({}); // { email: { status: 'online', socketId: '...' } }

    useEffect(() => {
        if (user && user.role) {
            const token = localStorage.getItem('adminToken');

            const newSocket = io(SOCKET_URL, {
                query: {
                    role: 'admin', // identify as admin
                    // name: user.name,
                    // email: user.email,
                    token: token // pass token for auth if backend expects it
                },
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

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, managerStatuses }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
