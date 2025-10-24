
import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { UserRole } from './types';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy-loaded Pages for code-splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));

// User pages
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const BettingPage = lazy(() => import('./pages/user/BettingPage').then(module => ({ default: module.BettingPage })));
const MyBetsPage = lazy(() => import('./pages/user/MyBetsPage'));
const TransactionHistoryPage = lazy(() => import('./pages/user/TransactionHistoryPage'));

// Dealer pages
const DealerDashboard = lazy(() => import('./pages/dealer/DealerDashboard'));
const BetOverviewPage = lazy(() => import('./pages/dealer/BetOverviewPage'));
const DealerManageUsersPage = lazy(() => import('./pages/dealer/DealerManageUsersPage'));
const DealerUserDetailsPage = lazy(() => import('./pages/dealer/DealerUserDetailsPage'));
const AddUserPage = lazy(() => import('./pages/dealer/AddUserPage'));
const CommissionOverviewPage = lazy(() => import('./pages/dealer/CommissionOverviewPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageUsersPage = lazy(() => import('./pages/admin/ManageUsersPage'));
const ManageDealersPage = lazy(() => import('./pages/admin/ManageDealersPage'));
const ManageDrawsPage = lazy(() => import('./pages/admin/ManageDrawsPage'));
const ApproveCommissionsPage = lazy(() => import('./pages/admin/ApproveCommissionsPage'));
const ApprovePrizesPage = lazy(() => import('./pages/admin/ApprovePrizesPage'));
const UserDetailsPage = lazy(() => import('./pages/admin/UserDetailsPage'));
const DealerDetailsPage = lazy(() => import('./pages/admin/DealerDetailsPage'));
const ApproveTopUpsPage = lazy(() => import('./pages/admin/ApproveTopUpsPage'));

const FullPageLoader: React.FC = () => (
    <div className="flex justify-center items-center min-h-screen">
        <div className="loader"></div>
    </div>
);

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
        <div className="bg-bg-primary text-text-primary">
            <Suspense fallback={<FullPageLoader />}>
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
                    <Route path="/dealer/commission-overview" element={<ProtectedRoute role={UserRole.DEALER}><CommissionOverviewPage /></ProtectedRoute>} />

                    {/* Admin Routes */}
                    <Route path="/admin/dashboard" element={<ProtectedRoute role={UserRole.ADMIN}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/manage-users" element={<ProtectedRoute role={UserRole.ADMIN}><ManageUsersPage /></ProtectedRoute>} />
                    <Route path="/admin/users/:userId" element={<ProtectedRoute role={UserRole.ADMIN}><UserDetailsPage /></ProtectedRoute>} />
                    <Route path="/admin/manage-dealers" element={<ProtectedRoute role={UserRole.ADMIN}><ManageDealersPage /></ProtectedRoute>} />
                    <Route path="/admin/dealers/:dealerId" element={<ProtectedRoute role={UserRole.ADMIN}><DealerDetailsPage /></ProtectedRoute>} />
                    <Route path="/admin/manage-draws" element={<ProtectedRoute role={UserRole.ADMIN}><ManageDrawsPage /></ProtectedRoute>} />
                    <Route path="/admin/approve-commissions" element={<ProtectedRoute role={UserRole.ADMIN}><ApproveCommissionsPage /></ProtectedRoute>} />
                    <Route path="/admin/approve-prizes" element={<ProtectedRoute role={UserRole.ADMIN}><ApprovePrizesPage /></ProtectedRoute>} />
                    <Route path="/admin/approve-top-ups" element={<ProtectedRoute role={UserRole.ADMIN}><ApproveTopUpsPage /></ProtectedRoute>} />


                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Suspense>
        </div>
    );
};

export default App;