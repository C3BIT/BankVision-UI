// Reads the manager's JWT from wherever the login flow persisted it, for
// requests (e.g. <img>/window.open) that can't attach an Authorization
// header and must instead pass the token as a query param.
export const getAuthToken = () => {
  try {
    const persistedState = localStorage.getItem('persist:authentication');
    if (persistedState) {
      const authState = JSON.parse(persistedState);
      const token = authState.token ? JSON.parse(authState.token) : null;
      if (token) return token;
    }
  } catch (e) {
    console.error('Error reading token from persisted state:', e);
  }

  return localStorage.getItem('token');
};
