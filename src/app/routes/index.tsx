import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/login';
import { ChatPage } from '@/pages/chat';
import { useSessionStore } from '@/entities/session';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Хук  для проверки наличия активной авторизованной сессии
  const isAuth = useSessionStore((s) => s.isAuth);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <ChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/chat" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
