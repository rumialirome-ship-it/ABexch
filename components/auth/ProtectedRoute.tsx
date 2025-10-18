import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  role: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role !== role) {
    // Redirect them to the home page if not authenticated for the required role.
    // This will cause a reload of any protected page to land on the home page,
    // as the application's auth state is not persisted across reloads.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
