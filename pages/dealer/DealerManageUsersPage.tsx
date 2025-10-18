
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchUsersByDealer } from '../../services/api';
import { User, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const ITEMS_PER_PAGE = 10;

const DealerManageUsersPage: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const loadUsers = async () => {
        if (!user || user.role !== UserRole.DEALER) return;
        setLoading(true);
        // FIX: Pass the full user object instead of just the ID.
        const data = await fetchUsersByDealer(user);
        setUsers(data);
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, [user]);

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.phone && user.phone.includes(searchQuery))
        );
    }, [users, searchQuery]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <MainLayout title="Manage Your Users" showBackButton titleClassName="text-accent-secondary text-shadow-glow-secondary">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search by ID, Username, or Phone..."
                        value={searchQuery}
                        onChange={e => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                        className="transition-all duration-300 w-full p-2 pl-10 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-secondary focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
                <Link to="/dealer/add-user" className="w-full md:w-auto bg-accent-secondary text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-1 hover:shadow-glow-secondary active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-secondary focus:ring-offset-2 focus:ring-offset-background-secondary">
                    Add New User
                </Link>
            </div>
             {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-secondary font-semibold tracking-wider uppercase text-sm text-shadow-glow-secondary">User ID</th>
                                <th className="py-3 px-4 text-left text-accent-secondary font-semibold tracking-wider uppercase text-sm text-shadow-glow-secondary">Username</th>
                                <th className="py-3 px-4 text-left text-accent-secondary font-semibold tracking-wider uppercase text-sm text-shadow-glow-secondary">Phone</th>
                                <th className="py-3 px-4 text-right text-accent-secondary font-semibold tracking-wider uppercase text-sm text-shadow-glow-secondary">Balance</th>
                                <th className="py-3 px-4 text-center text-accent-secondary font-semibold tracking-wider uppercase text-sm text-shadow-glow-secondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user) => (
                                <tr key={user.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-secondary/5 transition-colors duration-300">
                                    <td className="py-4 px-4 font-mono">{user.id}</td>
                                    <td className="py-4 px-4">{user.username}</td>
                                    <td className="py-4 px-4">{user.phone}</td>
                                    <td className="py-4 px-4 text-right font-mono">{formatCurrency(user.walletBalance)}</td>
                                    <td className="py-4 px-4 text-center">
                                        <Link to={`/dealer/users/${user.id}`} className="text-accent-secondary hover:underline text-sm font-semibold">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {paginatedUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-text-secondary">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-center items-center mt-6 space-x-2">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded-lg bg-background-primary border border-border-color disabled:opacity-50 transition-colors hover:bg-border-color">&laquo;</button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button key={i} onClick={() => handlePageChange(i + 1)} className={`px-3 py-1 rounded-lg border transition-colors ${currentPage === i + 1 ? 'bg-accent-secondary text-white border-accent-secondary' : 'bg-background-primary border-border-color hover:bg-border-color'}`}>{i + 1}</button>
                        ))}
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg bg-background-primary border border-border-color disabled:opacity-50 transition-colors hover:bg-border-color">&raquo;</button>
                    </div>
                )}
                </>
            )}
        </MainLayout>
    );
};

export default DealerManageUsersPage;
