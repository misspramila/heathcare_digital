
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserType } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedUserType: UserType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedUserType }) => {
  const { currentUser, userType, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!currentUser) {
    return <Navigate to={`/login/${allowedUserType}`} />;
  }

  if (userType !== allowedUserType) {
    // If wrong user type, redirect them to their own dashboard or home
    const redirectTo = userType === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
    return <Navigate to={redirectTo} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
