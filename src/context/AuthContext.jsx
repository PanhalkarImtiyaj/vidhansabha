import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Loader } from '../components/common';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    currentUser,
    logout,
    isAuthenticated: !!currentUser
  };

  if (loading) {
    return (
      <Loader 
        overlay={true}
        size="large" 
        color="primary" 
        text="प्रमाणीकरण तपासत आहे..." 
      />
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};