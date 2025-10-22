import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAdminDashboardStats, AdminDashboardStats } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../contexts/NotificationContext';

const StatCard: React.FC<{label: string, value: string, isLoading?: boolean}> = ({label, value, isLoading}) => (
    <div className="bg-bg-primary/50 p-6 rounded-lg border border-border-color transition-all duration-300 hover:border-accent-violet/30 hover:-translate-y-1 hover:shadow-glow-accent hover:shadow-glow-inset-accent">
        <h3 className="text-text-secondary text-base mb-1">{label}</h3>
        {isLoading
            ? <div className="h-10 mt-1 flex items-center"><div className="loader !w-6 !h-6 !border-2 !border-accent-violet/50 !border-t-accent-violet"></div></div>
            : <p className="text-3xl font-bold text-accent-violet font-mono">{value}</p>
        }
    </div>
);

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    const loadStats = useCallback(async () => {
        if (!user) return;
        setLoadingStats(true);
        try {
            const data = await fetchAdminDashboardStats(user);
            setStats(data);
        } catch (error) {
            console.error("Failed to load dashboard stats", error);
            addNotification("Could not load dashboard statistics.", "error");
        } finally {
            setLoadingStats(false);
        }
    }, [user, addNotification]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);
    
    if (!user) {
        return null;
    }

    return (
        <MainLayout title={`Admin Dashboard: ${user.username}`}>
            {/* Stats Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Platform Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard label="Today's Bet Volume" value={formatCurrency(stats?.betsToday ?? 0)} isLoading={loadingStats} />
                    <StatCard label="Prizes Paid Out (Today)" value={formatCurrency(stats?.prizesToday ?? 0)} isLoading={loadingStats} />
                    <StatCard label="Commissions Paid (Today)" value={formatCurrency(stats?.commissionsToday ?? 0)} isLoading={loadingStats} />
                    <StatCard label="This Month's Bet Volume" value={formatCurrency(stats?.betsMonth ?? 0)} isLoading={loadingStats} />
                    <StatCard label="Prizes Paid Out (This Month)" value={formatCurrency(stats?.prizesMonth ?? 0)} isLoading={loadingStats} />
                    <StatCard label="Commissions Paid (This Month)" value={formatCurrency(stats?.commissionsMonth ?? 0)} isLoading={loadingStats} />
                </div>
            </div>

            {/* Links Section */}
            <h2 className="text-2xl font-semibold text-text-primary mb-4 pt-4 border-t border-border-color">Management Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <DashboardLink 
                    to="/admin/manage-draws" 
                    title="Declare Draw" 
                    description="Declare winning numbers and settle bets." 
                    icon={<IconFlag />} 
                />
                <DashboardLink 
                    to="/admin/approve-prizes" 
                    title="Approve Prizes" 
                    description="Review and approve prize payouts to users." 
                    icon={<IconTrophy />} 
                />
                <DashboardLink 
                    to="/admin/approve-commissions" 
                    title="Approve Commissions" 
                    description="Approve commission payouts for dealers." 
                    icon={<IconCommission />} 
                />
                 <DashboardLink 
                    to="/admin/approve-top-ups" 
                    title="Approve Top-Ups" 
                    description="Review and approve dealer wallet top-up requests." 
                    icon={<IconTopUp />} 
                />
                <DashboardLink 
                    to="/admin/manage-users" 
                    title="Manage Users" 
                    description="View, create, or manage user accounts." 
                    icon={<IconUsers />} 
                />
                <DashboardLink 
                    to="/admin/manage-dealers" 
                    title="Manage Dealers" 
                    description="View, create, or manage dealer accounts." 
                    icon={<IconDealers />} 
                />
            </div>
        </MainLayout>
    );
};

interface DashboardLinkProps {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const DashboardLink: React.FC<DashboardLinkProps> = ({ to, title, description, icon }) => (
    <Link to={to} className="group block bg-bg-primary/50 p-6 rounded-lg border border-border-color transition-all duration-300 hover:border-accent-violet/50 hover:shadow-glow-accent hover:shadow-glow-inset-accent hover:-translate-y-1.5">
        <div className="flex items-start gap-4">
            <div className="text-accent-violet transition-colors duration-300">{icon}</div>
            <div>
                <h3 className="text-xl font-semibold text-text-primary transition-colors duration-300 group-hover:text-accent-violet">{title}</h3>
                <p className="text-text-secondary mt-1">{description}</p>
            </div>
        </div>
  </Link>
);

const IconFlag = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12z" /></svg>;
const IconTrophy = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v16a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1zm10 0v16a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1z" /></svg>;
const IconCommission = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const IconUsers = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const IconDealers = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const IconTopUp = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m8-10h.01M6 12H5.99M18 12h-.01M12 18v.01" /></svg>;

export default AdminDashboard;