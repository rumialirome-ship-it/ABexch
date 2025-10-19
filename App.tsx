

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { UserRole } from './types';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ResultsPage from './pages/ResultsPage';
// User pages
import UserDashboard from './pages/user/UserDashboard';
import BettingPage from './pages/user/BettingPage';
import MyBetsPage from './pages/user/MyBetsPage';
import TransactionHistoryPage from './pages/user/TransactionHistoryPage';
// Dealer pages
import DealerDashboard from './pages/dealer/DealerDashboard';
import BetOverviewPage from './pages/dealer/BetOverviewPage';
import DealerManageUsersPage from './pages/dealer/DealerManageUsersPage';
import DealerUserDetailsPage from './pages/dealer/DealerUserDetailsPage';
import AddUserPage from './pages/dealer/AddUserPage';
// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsersPage from './pages/admin/ManageUsersPage';
// Corrected import statement for ManageDealersPage. The component is a default export.
import ManageDealersPage from './pages/admin/ManageDealersPage';
import ManageDrawsPage from './pages/admin/ManageDrawsPage';
import ApproveCommissionsPage from './pages/admin/ApproveCommissionsPage';
import ApprovePrizesPage from './pages/admin/ApprovePrizesPage';
import UserDetailsPage from './pages/admin/UserDetailsPage';
import ApproveTopUpsPage from './pages/admin/ApproveTopUpsPage';


const App: React.FC = () => {
    return (
        <Router>
            <RealtimeProvider>
                <NotificationProvider>
                    <AuthProvider>
                        <AppRoutes />
                    </AuthProvider>
                </NotificationProvider>
            </RealtimeProvider>
        </Router>
    );
};

const AppRoutes: React.FC = () => {
    return (
        <div className="bg-background-primary text-text-primary">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login/:role" element={<LoginPage />} />
                <Route path="/results" element={<ResultsPage />} />
                
                {/* User Routes */}
                <Route path="/user/dashboard" element={<ProtectedRoute role={UserRole.USER}><UserDashboard /></ProtectedRoute>} />
                <Route path="/user/betting" element={<ProtectedRoute role={UserRole.USER}><BettingPage /></ProtectedRoute>} />
                <Route path="/user/my-bets" element={<ProtectedRoute role={UserRole.USER}><MyBetsPage /></ProtectedRoute>} />
                <Route path="/user/transactions" element={<ProtectedRoute role={UserRole.USER}><TransactionHistoryPage /></ProtectedRoute>} />


                {/* Dealer Routes */}
                <Route path="/dealer/dashboard" element={<ProtectedRoute role={UserRole.DEALER}><DealerDashboard /></ProtectedRoute>} />
                <Route path="/dealer/manage-users" element={<ProtectedRoute role={UserRole.DEALER}><DealerManageUsersPage /></ProtectedRoute>} />
                <Route path="/dealer/add-user" element={<ProtectedRoute role={UserRole.DEALER}><AddUserPage /></ProtectedRoute>} />
                <Route path="/dealer/users/:userId" element={<ProtectedRoute role={UserRole.DEALER}><DealerUserDetailsPage /></ProtectedRoute>} />
                <Route path="/dealer/bet-overview" element={<ProtectedRoute role={UserRole.DEALER}><BetOverviewPage /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<ProtectedRoute role={UserRole.ADMIN}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/manage-users" element={<ProtectedRoute role={UserRole.ADMIN}><ManageUsersPage /></ProtectedRoute>} />
                <Route path="/admin/users/:userId" element={<ProtectedRoute role={UserRole.ADMIN}><UserDetailsPage /></ProtectedRoute>} />
                <Route path="/admin/manage-dealers" element={<ProtectedRoute role={UserRole.ADMIN}><ManageDealersPage /></ProtectedRoute>} />
                <Route path="/admin/manage-draws" element={<ProtectedRoute role={UserRole.ADMIN}><ManageDrawsPage /></ProtectedRoute>} />
                <Route path="/admin/approve-commissions" element={<ProtectedRoute role={UserRole.ADMIN}><ApproveCommissionsPage /></ProtectedRoute>} />
                <Route path="/admin/approve-prizes" element={<ProtectedRoute role={UserRole.ADMIN}><ApprovePrizesPage /></ProtectedRoute>} />
                <Route path="/admin/approve-top-ups" element={<ProtectedRoute role={UserRole.ADMIN}><ApproveTopUpsPage /></ProtectedRoute>} />


                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </div>
    );
};

export default App;