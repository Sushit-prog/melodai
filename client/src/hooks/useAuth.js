import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    loadUser,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      loadUser();
    }
  }, [token, user, loadUser]);

  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return false;
    }
    return true;
  };

  const requireGuest = () => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return false;
    }
    return true;
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    loadUser,
    clearError,
    requireAuth,
    requireGuest,
  };
};

export default useAuth;
