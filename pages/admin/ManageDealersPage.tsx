import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchAllDealers, addDealer, updateDealerByAdmin, updateUserBlockStatus, deleteDealerByAdmin } from '../../services/api';
import { User } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const ITEMS_PER_PAGE = 10;

const ManageDealersPage: React.FC = () => {
    const { user: admin } = useAuth();
    const [dealers, setDealers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const [editingDealer, setEditingDealer] = useState<User | null>(null);
    const [blockingDealer, setBlockingDealer] = useState<User | null>(null);
    const [deletingDealer, setDeletingDealer] = useState<User | null>(null);


    const loadDealers = async () => {
        if (!admin) return;
        setLoading(true);
        try {
            const dealersData = await fetchAllDealers(admin);
            setDealers(dealersData);
        } catch(error) {
            console.error("Failed to load dealers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDealers();
    }, [admin]);

    const filteredDealers = useMemo(() => {
        return dealers.filter(dealer =>
            dealer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dealer.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (dealer.phone && dealer.phone.includes(searchQuery))
        );
    }, [dealers, searchQuery]);

    const totalPages = Math.ceil(filteredDealers.length / ITEMS_PER_PAGE);
    const paginatedDealers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredDealers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredDealers, currentPage]);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <MainLayout title="Manage Dealers" showBackButton>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search by ID, Name, or Phone..."
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
                <button onClick={() => setShowModal(true)} className="w-full md:w-auto bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-secondary">
                    Add New Dealer
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
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Dealer ID</th>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Name</th>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Phone</th>
                                <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Balance</th>
                                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Status</th>
                                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedDealers.map((dealer) => (
                                <tr key={dealer.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-violet/5 transition-colors duration-300">
                                    <td className="py-4 px-4 font-mono">{dealer.id}</td>
                                    <td className="py-4 px-4">{dealer.username}</td>
                                    <td className="py-4 px-4">{dealer.phone || 'N/A'}</td>
                                    <td className="py-4 px-4 text-right font-mono">{formatCurrency(dealer.wallet_balance)}</td>
                                    <td className="py-4 px-4 text-center">
                                         {dealer.is_blocked 
                                            ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-danger/20 text-danger border border-danger/30">Blocked</span> 
                                            : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success border border-success/30">Active</span>}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <MoreOptionsMenu dealer={dealer} onEdit={() => setEditingDealer(dealer)} onBlock={() => setBlockingDealer(dealer)} onDelete={() => setDeletingDealer(dealer)} />
                                    </td>
                                </tr>
                            ))}
                            {paginatedDealers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-text-secondary">
                                        No dealers found matching your criteria.
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
            {showModal && <AddDealerModal onClose={() => setShowModal(false)} onDealerAdded={loadDealers} />}
            {editingDealer && <EditDealerModal dealer={editingDealer} onClose={() => setEditingDealer(null)} onSuccess={loadDealers} />}
            {blockingDealer && <BlockDealerModal dealer={blockingDealer} onClose={() => setBlockingDealer(null)} onSuccess={loadDealers} />}
            {deletingDealer && <DeleteDealerModal dealer={deletingDealer} onClose={() => setDeletingDealer(null)} onSuccess={loadDealers} />}
        </MainLayout>
    );
};

const MoreOptionsMenu: React.FC<{ dealer: User, onEdit: () => void, onBlock: () => void, onDelete: () => void }> = ({ dealer, onEdit, onBlock, onDelete }) => {
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
                Options
                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-bg-secondary ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <Link to={`/admin/dealers/${dealer.id}`} className="block px-4 py-2 text-sm text-text-primary hover:bg-border-color" role="menuitem">View Details</Link>
                        <button onClick={() => handleAction(onEdit)} className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-border-color" role="menuitem">Edit Dealer</button>
                        <button onClick={() => handleAction(onBlock)} className={`w-full text-left block px-4 py-2 text-sm ${dealer.is_blocked ? 'text-success hover:bg-success/20' : 'text-danger hover:bg-danger/20'}`} role="menuitem">
                            {dealer.is_blocked ? 'Unblock Dealer' : 'Block Dealer'}
                        </button>
                         <button onClick={() => handleAction(onDelete)} className="w-full text-left block px-4 py-2 text-sm text-danger hover:bg-danger/20" role="menuitem">
                            Delete Dealer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const AddDealerModal: React.FC<{onClose: () => void, onDealerAdded: () => void}> = ({onClose, onDealerAdded}) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        username: '',
        phone: '',
        password: '',
        city: '',
        initial_deposit: '0',
        commission_rate: '',
        prize_rate_2d: '85',
        prize_rate_1d: '9.5',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) {
            addNotification('Admin user not found. Please log in again.', 'error');
            return;
        }
        if (!formData.username) {
            addNotification('Dealer Name is a required field.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await addDealer(admin, {
                username: formData.username,
                phone: formData.phone,
                password: formData.password || undefined,
                city: formData.city,
                initial_deposit: formData.initial_deposit ? parseFloat(formData.initial_deposit) : 0,
                commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : undefined,
                prize_rate_2d: formData.prize_rate_2d ? parseFloat(formData.prize_rate_2d) : undefined,
                prize_rate_1d: formData.prize_rate_1d ? parseFloat(formData.prize_rate_1d) : undefined,
            });
            addNotification(`Dealer ${formData.username} created successfully.`, 'success');
            onDealerAdded();
            onClose();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : 'Failed to create dealer.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-2xl border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-violet font-bold mb-6">Add New Dealer</h2>
                 <p className="text-sm text-text-secondary -mt-4 mb-6">A unique Dealer ID will be auto-generated.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-violet px-2 font-semibold">Account Details</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <Input name="username" label="Name" value={formData.username} onChange={handleChange} required />
                            <Input name="phone" label="Phone Number" value={formData.phone} onChange={handleChange} />
                            <Input name="password" label="Password" type="password" value={formData.password} onChange={handleChange} placeholder="Default: Admin@123" />
                            <Input name="city" label="Area" value={formData.city} onChange={handleChange} />
                        </div>
                    </fieldset>
                    
                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-violet px-2 font-semibold">Financials &amp; Rates</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            <Input name="initial_deposit" label="Initial Wallet Balance" type="number" value={formData.initial_deposit} onChange={handleChange} placeholder="0.00" />
                            <Input name="commission_rate" label="Commission Rate (%)" type="number" value={formData.commission_rate} onChange={handleChange} placeholder="e.g., 5" />
                            <Input name="prize_rate_2d" label="Prize Rate (2D)" type="number" value={formData.prize_rate_2d} onChange={handleChange} placeholder="Default: 85" />
                            <Input name="prize_rate_1d" label="Prize Rate (1D)" type="number" value={formData.prize_rate_1d} onChange={handleChange} placeholder="Default: 9.5" />
                        </div>
                    </fieldset>
                    
                    <div className="flex justify-end space-x-4 pt-6 border-t border-border-color/50 mt-6">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-0.5 hover:shadow-glow-accent active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">{isLoading ? 'Creating...' : 'Create Dealer'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditDealerModal: React.FC<{dealer: User, onClose: () => void, onSuccess: () => void}> = ({ dealer, onClose, onSuccess }) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: dealer.username || '',
        password: '',
        phone: dealer.phone || '',
        city: dealer.city || '',
        commission_rate: dealer.commission_rate?.toString() || '',
        prize_rate_2d: dealer.prize_rate_2d?.toString() || '85',
        prize_rate_1d: dealer.prize_rate_1d?.toString() || '9.5',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) return;

        setIsLoading(true);
        try {
            await updateDealerByAdmin(admin, dealer.id, {
                username: formData.username,
                password: formData.password || undefined,
                phone: formData.phone,
                city: formData.city,
                commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : undefined,
                prize_rate_2d: formData.prize_rate_2d ? parseFloat(formData.prize_rate_2d) : undefined,
                prize_rate_1d: formData.prize_rate_1d ? parseFloat(formData.prize_rate_1d) : undefined,
            });
            addNotification(`Dealer ${formData.username} updated successfully.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : 'Failed to update dealer.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard w-full max-w-2xl border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-violet font-bold mb-6">Edit Dealer: {dealer.username}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input name="username" label="Name" value={formData.username} onChange={handleChange} required />
                        <Input name="password" label="New Password" type="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep unchanged" />
                        <Input name="phone" label="Phone" value={formData.phone} onChange={handleChange} />
                        <Input name="city" label="Area" value={formData.city} onChange={handleChange} />
                        <Input name="commission_rate" label="Commission Rate (%)" type="number" value={formData.commission_rate} onChange={handleChange} placeholder="e.g., 5" />
                        <Input name="prize_rate_2d" label="Prize Rate (2D)" type="number" value={formData.prize_rate_2d} onChange={handleChange} placeholder="e.g., 85" />
                        <Input name="prize_rate_1d" label="Prize Rate (1D)" type="number" value={formData.prize_rate_1d} onChange={handleChange} placeholder="e.g., 9.5" />
                    </div>
                    <div className="flex justify-end space-x-4 pt-6 border-t border-border-color/50">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-violet text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-50">{isLoading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BlockDealerModal: React.FC<{ dealer: User; onClose: () => void; onSuccess: () => void }> = ({ dealer, onClose, onSuccess }) => {
    const { user: admin } = useAuth();
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const isBlocking = !dealer.is_blocked;

    const handleSubmit = async () => {
        if (!admin) return;
        setIsLoading(true);
        try {
            // Note: Using updateUserBlockStatus which targets the generic `users` table
            await updateUserBlockStatus(admin, dealer.id, isBlocking);
            addNotification(`Successfully ${isBlocking ? 'blocked' : 'unblocked'} ${dealer.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : `Failed to ${isBlocking ? 'block' : 'unblock'} dealer.`, 'error');
        } finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className={`bg-bg-secondary p-8 rounded-xl shadow-glow-hard w-full max-w-md border ${isBlocking ? 'border-danger/30' : 'border-success/30'} my-auto animate-fade-in-down`}>
                <h2 className={`text-2xl font-bold mb-4 ${isBlocking ? 'text-danger' : 'text-success'}`}>{isBlocking ? 'Block Dealer' : 'Unblock Dealer'}</h2>
                <p className="text-text-secondary mb-6">
                    Are you sure you want to {isBlocking ? 'block' : 'unblock'} the dealer <strong className="text-text-primary">{dealer.username}</strong>?
                    {isBlocking ? " They will not be able to log in." : " They will regain full access."}
                </p>
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all hover:bg-border-color active:scale-95">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading} className={`${isBlocking ? 'bg-danger' : 'bg-success'} text-white font-bold py-2 px-6 rounded-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50`}>
                        {isLoading ? (isBlocking ? 'Blocking...' : 'Unblocking...') : `Confirm ${isBlocking ? 'Block' : 'Unblock'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeleteDealerModal: React.FC<{ dealer: User, onClose: () => void, onSuccess: () => void }> = ({ dealer, onClose, onSuccess }) => {
    const { user: admin } = useAuth();
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        if (!admin) return;
        setIsLoading(true);
        try {
            await deleteDealerByAdmin(admin, dealer.id);
            addNotification('✅ Dealer deleted successfully!', 'success');
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
                <h2 className="text-2xl text-danger font-bold mb-4">Delete Dealer</h2>
                <p className="text-text-secondary mb-6">Are you sure you want to permanently delete the dealer <strong className="text-text-primary">{dealer.username}</strong>? This action cannot be undone. You can only delete dealers who do not have any users assigned to them.</p>
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                    <button onClick={handleDelete} disabled={isLoading} className="bg-danger text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-glow-danger active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                        {isLoading ? 'Deleting...' : 'Delete Dealer'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const Input: React.FC<{name: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, required?: boolean, placeholder?: string}> = 
({ name, label, value, onChange, type = 'text', required, placeholder }) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const inputClasses = "transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent text-sm";
    
    return (
        <div>
            <label htmlFor={name} className="block text-text-secondary mb-1 text-sm">{label}{required && <span className="text-danger">*</span>}</label>
            <div className="relative">
                <input
                    id={name}
                    name={name}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    className={inputClasses}
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

const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.415-3.165 2.584-4.416M9 12a3 3 0 11-6 0 3 3 0 016 0zm-1.148-.949a3.001 3.001 0 00-4.002 4.002l5.15-5.15a3.001 3.001 0 00-1.148-1.148zM12 5c.675 0 1.339.098 1.98.281m5.562 2.158a10.003 10.003 0 013.002 4.561C20.268 16.057 16.477 19 12 19c-1.11 0-2.193-.17-3.21-.498m2.148-13.455A10.002 10.002 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.004 10.004 0 01-2.458 4.416M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>;

export default ManageDealersPage;