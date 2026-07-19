import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Auth is carried by the httpOnly auth_token cookie, not localStorage, so
        // session state has to be bootstrapped from the server on every page load.
        const bootstrapSession = async () => {
            try {
                const response = await api.get('/admin/me');
                if (response.data.success) {
                    setUser(response.data.data.admin);
                }
            } catch {
                // No valid session cookie - stay logged out.
            } finally {
                setLoading(false);
            }
        };
        bootstrapSession();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/admin/login', { email, password });

            if (response.data.success) {
                const { admin } = response.data.data;
                setUser(admin);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed',
                errorCode: error.response?.data?.error?.code
            };
        }
    };

    const logout = () => {
        api.post('/admin/logout').catch(() => {});
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
