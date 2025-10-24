import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchUsersByDealer, updateUserByDealer, deleteUserByDealer, updateUserBlockStatusByDealer } from '../../services/api';
import { User, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const ITEMS_PER_PAGE = 10;

const DealerManageUsersPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [blockingUser, setBlockingUser] = useState<User | null>(null);


    const loadUsers = async () => {
        if (!user || user.role !== UserRole.DEALER) return;
        setLoading(true);
        try {
            const data = await fetchUsersByDealer(user);
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users:", error);
            addNotification("Failed to load users.", "error");
        } finally {
            setLoading(false);
        }
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
        <MainLayout title="Manage Your Users" showBackButton>
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
                <Link to="/dealer/add-user" className="w-full md:w-auto bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-primary">
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
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">User ID</th>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Username</th>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Phone</th>
                                <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Balance</th>
                                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Status</th>
                                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((u) => (
                                <tr key={u.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-violet/5 transition-colors duration-300">
                                    <td className="py-4 px-4 font-mono">{u.id}</td>
                                    <td className="py-4 px-4">{u.username}</td>
                                    <td className="py-4 px-4">{u.phone}</td>
                                    <td className="py-4 px-4 text-right font-mono">{formatCurrency(u.wallet_balance)}</td>
                                    <td className="py-4 px-4 text-center">
                                        {u.is_blocked 
                                            ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-danger/20 text-danger border border-danger/30">Blocked</span> 
                                            : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success border border-success/30">Active</span>}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                       <MoreOptionsMenu user={u} onEdit={() => setEditingUser(u)} onDelete={() => setDeletingUser(u)} onBlock={() => setBlockingUser(u)} />
                                    </td>
                                </tr>
                            ))}
                            {paginatedUsers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-text-secondary">
                                        No users found.
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
                            <button key={i} onClick={() => handlePageChange(i + 1)} className={`px-3 py-1 rounded-lg border transition-colors ${currentPage === i + 1 ? 'bg-accent-violet text-white border-accent-violet' : 'bg-bg-primary border-border-color hover:bg-border-color'}`}>{i + 1}</button>
                        ))}
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg bg-bg-primary border border-border-color disabled:opacity-50 transition-colors hover:bg-border-color">&raquo;</button>
                    </div>
                )}
                </>
            )}

            {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSuccess={loadUsers} />}
            {deletingUser && <DeleteUserModal user={deletingUser} onClose={() => setDeletingUser(null)} onSuccess={loadUsers} />}
            {blockingUser && <BlockUserModal user={blockingUser} onClose={() => setBlockingUser(null)} onSuccess={loadUsers} />}
        </MainLayout>
    );
};

const MoreOptionsMenu: React.FC<{ user: User, onEdit: () => void, onDelete: () => void, onBlock: () => void }> = ({ user, onEdit, onDelete, onBlock }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex justify-center w-full rounded-md border border-border-color shadow-sm px-4 py-2 bg-bg-primary text-sm font-medium text-text-secondary hover:bg-border-color focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary focus:ring-accent-violet"
            >
                More Options
                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-bg-secondary ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <Link to={`/dealer/users/${user.id}`} className="block px-4 py-2 text-sm text-text-primary hover:bg-border-color" role="menuitem">View Details</Link>
                        <button onClick={() => handleAction(onEdit)} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-border-color" role="menuitem">Edit User</button>
                        <button onClick={() => handleAction(onBlock)} className={`w-full text-left block px-4 py-2 text-sm ${user.is_blocked ? 'text-success hover:bg-success/20' : 'text-danger hover:bg-danger/20'}`} role="menuitem">
                            {user.is_blocked ? 'Unblock User' : 'Block User'}
                        </button>
                        <button onClick={() => handleAction(onDelete)} className="w-full text-left block px-4 py-2 text-sm text-danger hover:bg-danger/20" role="menuitem">Delete User</button>
                    </div>
                </div>
            )}
        </div>
    );
};


const EditUserModal: React.FC<{ user: User, onClose: () => void, onSuccess: () => void }> = ({ user, onClose, onSuccess }) => {
    const { user: dealer } = useAuth();
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: user.username || '',
        password: '',
        phone: user.phone || '',
        city: user.city || '',
        prizeRate2D: user.prize_rate_2d?.toString() || '',
        prizeRate1D: user.prize_rate_1d?.toString() || '',
        betLimit2D: user.bet_limit_2d?.toString() || '',
        betLimit1D: user.bet_limit_1d?.toString() || '',
        betLimitPerDraw: user.bet_limit_per_draw?.toString() || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dealer) return;

        setIsLoading(true);
        try {
            await updateUserByDealer(dealer, user.id, {
                username: formData.username,
                password: formData.password || undefined, // Send only if not empty
                phone: formData.phone,
                city: formData.city,
                prize_rate_2d: formData.prizeRate2D ? parseFloat(formData.prizeRate2D) : undefined,
                prize_rate_1d: formData.prizeRate1D ? parseFloat(formData.prizeRate1D) : undefined,
                bet_limit_2d: formData.betLimit2D ? parseFloat(formData.betLimit2D) : undefined,
                bet_limit_1d: formData.betLimit1D ? parseFloat(formData.betLimit1D) : undefined,
                bet_limit_per_draw: formData.betLimitPerDraw ? parseFloat(formData.betLimitPerDraw) : undefined,
            });
            addNotification('✅ User updated successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            addNotification(`⚠️ ${(error as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-3xl border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-violet font-bold mb-4">Edit User: {user.username}</h2>
                <p className="text-sm text-text-secondary -mt-2 mb-6 font-mono">ID: {user.id} | Balance: {formatCurrency(user.wallet_balance)}</p>

                <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-violet px-2 font-semibold">User Information</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                           <InputGroup label="Username" name="username" value={formData.username} onChange={handleChange} required />
                           <InputGroup label="New Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep unchanged" />
                           <InputGroup label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} type="tel" icon={<PhoneIcon/>} required />
                           <InputGroup label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Optional"/>
                        </div>
                    </fieldset>
                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-violet px-2 font-semibold">Rates &amp; Limits</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-2">
                            <InputGroup label="Prize Rate (2D)" name="prizeRate2D" value={formData.prizeRate2D} onChange={handleChange} type="number" placeholder="Default: 85" />
                            <InputGroup label="Prize Rate (1D)" name="prizeRate1D" value={formData.prizeRate1D} onChange={handleChange} type="number" placeholder="Default: 9.5" />
                            <InputGroup label="Bet Limit (2D)" name="betLimit2D" value={formData.betLimit2D} onChange={handleChange} type="number" placeholder="Optional" />
                            <InputGroup label="Bet Limit (1D)" name="betLimit1D" value={formData.betLimit1D} onChange={handleChange} type="number" placeholder="Optional" />
                            <InputGroup label="Bet Limit per Draw" name="betLimitPerDraw" value={formData.betLimitPerDraw} onChange={handleChange} type="number" placeholder="Optional"/>
                        </div>
                    </fieldset>
                </form>

                 <div className="mt-6 pt-6 border-t border-border-color/50 flex flex-col sm:flex-row-reverse items-center justify-center sm:justify-start gap-4">
                    <button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 disabled:bg-border-color disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={onClose} className="w-full sm:w-auto text-center border border-border-color text-text-secondary font-bold py-3 px-8 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};


const DeleteUserModal: React.FC<{ user: User, onClose: () => void, onSuccess: () => void }> = ({ user, onClose, onSuccess }) => {
    const { user: dealer } = useAuth();
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        if (!dealer) return;
        setIsLoading(true);
        try {
            await deleteUserByDealer(dealer, user.id);
            addNotification('✅ User deleted successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            addNotification(`⚠️ ${(error as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-danger shadow-glow-inset-accent w-full max-w-md border border-danger/50 my-auto animate-fade-in-down">
                <h2 className="text-2xl text-danger font-bold mb-4">Delete User</h2>
                <p className="text-text-secondary mb-6">Are you sure you want to permanently delete the user <strong className="text-text-primary">{user.username}</strong>? This action cannot be undone.</p>
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                    <button onClick={handleDelete} disabled={isLoading} className="bg-danger text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-glow-danger active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                        {isLoading ? 'Deleting...' : 'Delete User'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BlockUserModal: React.FC<{ user: User; onClose: () => void; onSuccess: () => void }> = ({ user, onClose, onSuccess }) => {
    const { user: dealer } = useAuth();
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const isBlocking = !user.is_blocked;

    const handleSubmit = async () => {
        if (!dealer) {
            addNotification('Dealer not logged in.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await updateUserBlockStatusByDealer(dealer, user.id, isBlocking);
            addNotification(`Successfully ${isBlocking ? 'blocked' : 'unblocked'} ${user.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to ${isBlocking ? 'block' : 'unblock'} user.`;
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className={`bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border ${isBlocking ? 'border-danger/30' : 'border-success/30'} my-auto animate-fade-in-down`}>
                <h2 className={`text-2xl font-bold mb-4 ${isBlocking ? 'text-danger text-shadow-glow-danger' : 'text-success'}`}>{isBlocking ? 'Block User' : 'Unblock User'}</h2>
                <p className="text-text-secondary mb-6">
                    Are you sure you want to {isBlocking ? 'block' : 'unblock'} the user <strong className="text-text-primary">{user.username}</strong>?
                    {isBlocking 
                        ? " They will not be able to log in or place bets." 
                        : " They will regain full access to their account."}
                </p>
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading} className={`${isBlocking ? 'bg-danger hover:shadow-glow-danger' : 'bg-success hover:shadow-glow-success'} text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50`}>
                        {isLoading ? (isBlocking ? 'Blocking...' : 'Unblocking...') : `Confirm ${isBlocking ? 'Block' : 'Unblock'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};


const InputGroup: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, required?: boolean, placeholder?: string, icon?: React.ReactNode}> = 
({ label, name, value, onChange, type = 'text', required = false, placeholder, icon }) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const inputClasses = "transition-all duration-300 w-full p-3 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent";

    return (
        <div>
            <label htmlFor={name} className="block text-text-secondary mb-2">{label}{required && <span className="text-danger">*</span>}</label>
            <div className="relative">
                 {icon && <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary pointer-events-none">{icon}</span>}
                <input
                    type={inputType}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={`${inputClasses} ${icon ? 'pl-10' : ''}`}
                    placeholder={placeholder}
                    step={type === 'number' ? 'any' : undefined}
                    min={type === 'number' ? '0' : undefined}
                />
                {type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-accent-violet transition-colors duration-300"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                )}
            </div>
        </div>
    );
};

const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.415-3.165 2.584-4.416M9 12a3 3 0 11-6 0 3 3 0 016 0zm-1.148-.949a3.001 3.001 0 00-4.002 4.002l5.15-5.15a3.001 3.001 0 00-1.148-1.148zM12 5c.675 0 1.339.098 1.98.281m5.562 2.158a10.003 10.003 0 013.002 4.561C20.268 16.057 16.477 19 12 19c-1.11 0-2.193-.17-3.21-.498m2.148-13.455A10.002 10.002 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.004 10.004 0 01-2.458 4.416M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>;

export default DealerManageUsersPage;