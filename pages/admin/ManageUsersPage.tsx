import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchAllUsers, addUser, fetchAllDealers } from '../../services/api';
import { User } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const ITEMS_PER_PAGE = 10;

const ManageUsersPage: React.FC = () => {
    const { user: admin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dealers, setDealers] = useState<User[]>([]);

    const loadData = async () => {
        if (!admin) return;
        setLoading(true);
        try {
            const [usersData, dealersData] = await Promise.all([
                fetchAllUsers(admin),
                fetchAllDealers(admin)
            ]);
            setUsers(usersData);
            setDealers(dealersData);
        } catch(error) {
            console.error("Failed to load users and dealers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [admin]);

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
        <MainLayout title="Manage Users" showBackButton titleClassName="bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">
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
                        className="transition-all duration-300 w-full p-2 pl-10 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
                <button onClick={() => setShowModal(true)} className="w-full md:w-auto bg-gradient-to-r from-accent-orange to-accent-yellow text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-secondary">
                    Add New User
                </button>
            </div>
             {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">User ID</th>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Username</th>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Phone</th>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Dealer ID</th>
                                <th className="py-3 px-4 text-right text-accent-yellow font-semibold tracking-wider uppercase text-sm">Balance</th>
                                <th className="py-3 px-4 text-center text-accent-yellow font-semibold tracking-wider uppercase text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user) => (
                                <tr key={user.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-yellow/5 transition-colors duration-300">
                                    <td className="py-4 px-4 font-mono">{user.id}</td>
                                    <td className="py-4 px-4">{user.username}</td>
                                    <td className="py-4 px-4">{user.phone}</td>
                                    <td className="py-4 px-4 font-mono">{user.dealer_id || 'N/A'}</td>
                                    <td className="py-4 px-4 text-right font-mono">{formatCurrency(user.wallet_balance)}</td>
                                    <td className="py-4 px-4 text-center">
                                        <Link to={`/admin/users/${user.id}`} className="text-accent-yellow hover:underline text-sm font-semibold">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {paginatedUsers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-text-secondary">
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-center items-center mt-6 space-x-2">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded-lg bg-bg-primary border border-border-color disabled:opacity-50 transition-colors hover:bg-border-color">&laquo;</button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button key={i} onClick={() => handlePageChange(i + 1)} className={`px-3 py-1 rounded-lg border transition-colors ${currentPage === i + 1 ? 'bg-accent-yellow text-black border-accent-yellow' : 'bg-bg-primary border-border-color hover:bg-border-color'}`}>{i + 1}</button>
                        ))}
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg bg-bg-primary border border-border-color disabled:opacity-50 transition-colors hover:bg-border-color">&raquo;</button>
                    </div>
                )}
                </>
            )}
            {showModal && <AddUserModal dealers={dealers} onClose={() => setShowModal(false)} onUserAdded={loadData} />}
        </MainLayout>
    );
};

const AddUserModal: React.FC<{dealers: User[], onClose: () => void, onUserAdded: () => void}> = ({dealers, onClose, onUserAdded}) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [dealerId, setDealerId] = useState(dealers[0]?.id || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) {
            addNotification('Admin user not found. Please log in again.', 'error');
            return;
        }
        if (!dealerId) {
            addNotification('Please select a dealer.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await addUser(admin, { username, phone, dealer_id: dealerId, initial_deposit: 0 });
            addNotification(`User ${username} created successfully.`, 'success');
            onUserAdded();
            onClose();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : 'Failed to create user.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputClasses = "transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-yellow font-bold mb-4">Add New User</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-text-secondary mb-1">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={inputClasses} required />
                    </div>
                     <div>
                        <label className="block text-text-secondary mb-1">Phone</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClasses} required />
                    </div>
                     <div>
                        <label className="block text-text-secondary mb-1">Assign to Dealer</label>
                        <select value={dealerId} onChange={e => setDealerId(e.target.value)} className={inputClasses} required>
                            <option value="" disabled>Select a dealer</option>
                            {dealers.map(d => <option key={d.id} value={d.id}>{d.username} ({d.id})</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading || dealers.length === 0} className="bg-gradient-to-r from-accent-orange to-accent-yellow text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-0.5 hover:shadow-glow-accent active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">{isLoading ? 'Adding...' : 'Add User'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManageUsersPage;