import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  checkLoginAndProceed: (callback: () => void) => boolean;
  checkLogin: () => boolean;
  setIsLoggedIn: (logged: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('login_token');
  });

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('login_token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkLoginAndProceed = useCallback((callback: () => void): boolean => {
    if (isLoggedIn) {
      callback();
      return true;
    } else {
      setShowLoginModal(true);
      return false;
    }
  }, [isLoggedIn]);

  const checkLogin = useCallback((): boolean => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    }
    return isLoggedIn;
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, showLoginModal, setShowLoginModal, checkLoginAndProceed, checkLogin, setIsLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
