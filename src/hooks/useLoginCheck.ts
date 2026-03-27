import { useAuth } from '../contexts/AuthContext';

export const useLoginCheck = () => {
  const { isLoggedIn, checkLogin } = useAuth();

  return {
    isLoggedIn,
    checkLogin,
  };
};
