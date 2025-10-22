import React, { ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { 
    DashboardIcon, BetIcon, HistoryIcon, TransactionsIcon, ManageUsersIcon, AddUserIcon, BetOverviewIcon,
    ManageDrawsIcon, ApprovePrizesIcon, ApproveCommissionsIcon, ApproveTopUpsIcon, ManageDealersIcon, ResultsIcon, LogoutIcon
} from '../common/Icons';

interface SidebarLinkData {
    to: string;
    label: string;
    icon: ReactNode;
}

const UserLinks: SidebarLinkData[] = [
    { to: '/user/dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-5 w-5" /> },
    { to: '/user/betting', label: 'Place Bet', icon: <BetIcon className="h-5 w-5" /> },
    { to: '/user/my-bets', label: 'My Bet History', icon: <HistoryIcon className="h-5 w-5" /> },
    { to: '/user/transactions', label: 'Transactions', icon: <TransactionsIcon className="h-5 w-5" /> },
];

const DealerLinks: SidebarLinkData[] = [
    { to: '/dealer/dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-5 w-5" /> },
    { to: '/dealer/manage-users', label: 'Manage Users', icon: <ManageUsersIcon className="h-5 w-5" /> },
    { to: '/dealer/add-user', label: 'Add New User', icon: <AddUserIcon className="h-5 w-5" /> },
    { to: '/dealer/bet-overview', label: 'Bet Overview', icon: <BetOverviewIcon className="h-5 w-5" /> },
];

const AdminLinks: SidebarLinkData[] = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-5 w-5" /> },
    { to: '/admin/manage-draws', label: 'Manage Draws', icon: <ManageDrawsIcon className="h-5 w-5" /> },
    { to: '/admin/approve-prizes', label: 'Approve Prizes', icon: <ApprovePrizesIcon className="h-5 w-5" /> },
    { to: '/admin/approve-commissions', label: 'Approve Commissions', icon: <ApproveCommissionsIcon className="h-5 w-5" /> },
    { to: '/admin/approve-top-ups', label: 'Approve Top-Ups', icon: <ApproveTopUpsIcon className="h-5 w-5" /> },
    { to: '/admin/manage-users', label: 'Manage Users', icon: <ManageUsersIcon className="h-5 w-5" /> },
    { to: '/admin/manage-dealers', label: 'Manage Dealers', icon: <ManageDealersIcon className="h-5 w-5" /> },
];

const CommonLinks: SidebarLinkData[] = [
    { to: '/results', label: 'View Results', icon: <ResultsIcon className="h-5 w-5" /> },
];

const SidebarNavLink: React.FC<{ to: string, icon: ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => {
    const activeClass = 'bg-accent-violet/10 text-accent-violet border-accent-violet';
    const inactiveClass = 'text-text-secondary hover:bg-border-color hover:text-text-primary border-transparent';
    
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 transition-colors duration-200 ${isActive ? activeClass : inactiveClass}`}
        >
            {icon}
            <span className="font-semibold">{label}</span>
        </NavLink>
    );
};

const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (isOpen: boolean) => void }> = ({ isOpen, setIsOpen }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return null;
    }

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsOpen(false);
    };

    const handleLinkClick = () => {
        if (window.innerWidth < 768) { // Close sidebar on mobile after navigation
            setIsOpen(false);
        }
    };

    const roleLinks = {
        [UserRole.ADMIN]: AdminLinks,
        [UserRole.DEALER]: DealerLinks,
        [UserRole.USER]: UserLinks,
    }[user.role];

    return (
        <>
            <aside className={`fixed top-0 left-0 h-full bg-bg-secondary/95 backdrop-blur-lg border-r border-border-color z-40 w-64 transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="flex items-center justify-center p-4 h-[65px] border-b border-border-color flex-shrink-0">
                    <Link to="/" onClick={handleLinkClick} className="text-xl font-bold tracking-wider whitespace-nowrap">
                        <span className="bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">A-BABA EXCHANGE</span>
                    </Link>
                </div>

                <nav className="flex-grow p-4 space-y-4 overflow-y-auto">
                    <div>
                        <h3 className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">{user.role} Menu</h3>
                        <ul className="space-y-1">
                            {roleLinks.map(link => (
                                <li key={link.to}>
                                    <SidebarNavLink to={link.to} icon={link.icon} label={link.label} onClick={handleLinkClick} />
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">General</h3>
                        <ul className="space-y-1">
                            {CommonLinks.map(link => (
                                <li key={link.to}>
                                    <SidebarNavLink to={link.to} icon={link.icon} label={link.label} onClick={handleLinkClick} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                <div className="p-4 border-t border-border-color flex-shrink-0">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-danger hover:bg-danger/10 transition-colors duration-200">
                        <LogoutIcon className="h-5 w-5" />
                        <span className="font-semibold">Logout</span>
                    </button>
                </div>
            </aside>
            {/* Backdrop for mobile */}
            {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fade-in" aria-hidden="true"></div>}
        </>
    );
};

export default Sidebar;
