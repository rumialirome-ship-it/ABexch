

import React, { useState, useEffect, useRef } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchAllDealers, addDealer, addCreditToDealer, debitFundsByAdmin, updateDealerByAdmin } from '../../services/api';
import { User } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const MoreOptionsMenu: React.FC<{
    dealer: User,
    onEdit: () => void,
    onAddCredit: () => void,
    onDebit: () => void
}> = ({ dealer, onEdit, onAddCredit, onDebit }) => {
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
                Actions
                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-bg-secondary ring-1 ring-black ring-opacity-5 z-10 animate-fade-in-down">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <button onClick={() => handleAction(onEdit)} className="w-full text-left block px-4 py-2 text-sm text-accent-cyan hover:bg-accent-cyan/10" role="menuitem">Edit Dealer</button>
                        <button onClick={() => handleAction(onAddCredit)} className="w-full text-left block px-4 py-2 text-sm text-accent-violet hover:bg-accent-violet/10" role="menuitem">Add Credit</button>
                        <button onClick={() => handleAction(onDebit)} className="w-full text-left block px-4 py-2 text-sm text-danger hover:bg-danger/10" role="menuitem">Debit Funds</button>
                    </div>
                </div>
            )}
        </div>
    );
};


const ManageDealersPage: React.FC = () => {
    const { user: admin } = useAuth();
    const [dealers, setDealers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDealerModal, setShowAddDealerModal] = useState(false);
    const [showEditDealerModal, setShowEditDealerModal] = useState(false);
    const [showAddCreditModal, setShowAddCreditModal] = useState(false);
    const [showDebitFundsModal, setShowDebitFundsModal] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState<User | null>(null);

    const loadDealers = async () => {
        if (!admin) return;
        setLoading(true);
        try {
            const data = await fetchAllDealers(admin);
            setDealers(data);
        } catch (error) {
            console.error("Failed to load dealers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDealers();
    }, [admin]);

    const handleOpenAddCredit = (dealer: User) => {
        setSelectedDealer(dealer);
        setShowAddCreditModal(true);
    };
    
    const handleOpenDebitFunds = (dealer: User) => {
        setSelectedDealer(dealer);
        setShowDebitFundsModal(true);
    };

    const handleOpenEdit = (dealer: User) => {
        setSelectedDealer(dealer);
        setShowEditDealerModal(true);
    };

    const handleCloseModals = () => {
        setSelectedDealer(null);
        setShowAddCreditModal(false);
        setShowDebitFundsModal(false);
        setShowEditDealerModal(false);
    };

    return (
        <MainLayout title="Manage Dealers" showBackButton titleClassName="bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">
            <div className="flex justify-end mb-4">
                <button 
                    onClick={() => setShowAddDealerModal(true)} 
                    className="bg-gradient-to-r from-accent-orange to-accent-yellow text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-primary"
                >
                    Add New Dealer
                </button>
            </div>
             {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Dealer ID</th>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Username</th>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Phone</th>
                                <th className="py-3 px-4 text-right text-accent-yellow font-semibold tracking-wider uppercase text-sm">Balance</th>
                                <th className="py-3 px-4 text-center text-accent-yellow font-semibold tracking-wider uppercase text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dealers.map((dealer) => (
                                <tr key={dealer.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-yellow/5 transition-colors duration-300">
                                    <td className="py-4 px-4 font-mono">{dealer.id}</td>
                                    <td className="py-4 px-4">{dealer.username}</td>
                                    <td className="py-4 px-4">{dealer.phone}</td>
                                    <td className="py-4 px-4 text-right font-mono">{formatCurrency(dealer.wallet_balance)}</td>
                                    <td className="py-4 px-4 text-center">
                                       <MoreOptionsMenu
                                            dealer={dealer}
                                            onEdit={() => handleOpenEdit(dealer)}
                                            onAddCredit={() => handleOpenAddCredit(dealer)}
                                            onDebit={() => handleOpenDebitFunds(dealer)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {showAddDealerModal && <AddDealerModal onClose={() => setShowAddDealerModal(false)} onDealerAdded={loadDealers} />}
            {showEditDealerModal && selectedDealer && (
                <EditDealerModal 
                    dealer={selectedDealer} 
                    onClose={handleCloseModals} 
                    onSuccess={loadDealers} 
                />
            )}
            {showAddCreditModal && selectedDealer && (
                <AddCreditModal 
                    dealer={selectedDealer} 
                    onClose={handleCloseModals} 
                    onSuccess={loadDealers} 
                />
            )}
             {showDebitFundsModal && selectedDealer && (
                <DebitFundsModal 
                    dealer={selectedDealer} 
                    onClose={handleCloseModals} 
                    onSuccess={loadDealers} 
                />
            )}
        </MainLayout>
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
        initial_deposit: '',
        commission_rate: '',
        prize_rate_2d: '85',
        prize_rate_1d: '9.5',
        bet_limit_2d: '',
        bet_limit_1d: '',
        bet_limit_per_draw: '',
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
        if (!formData.username || !formData.password || !formData.phone) {
            addNotification('⚠️ Username, Password, and Phone Number are required.', 'error');
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
                bet_limit_2d: formData.bet_limit_2d ? parseFloat(formData.bet_limit_2d) : undefined,
                bet_limit_1d: formData.bet_limit_1d ? parseFloat(formData.bet_limit_1d) : undefined,
                bet_limit_per_draw: formData.bet_limit_per_draw ? parseFloat(formData.bet_limit_per_draw) : undefined,
            });
            addNotification(`✅ Dealer added successfully!`, 'success');
            onDealerAdded();
            onClose();
        } catch (err) {
            addNotification(`⚠️ Failed to add dealer. Please check the form.`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-2xl border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-yellow font-bold mb-6">Add New Dealer</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-yellow px-2 font-semibold">Account Details</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <Input name="username" label="Username" value={formData.username} onChange={handleChange} required />
                            <Input name="phone" label="Phone Number" value={formData.phone} onChange={handleChange} required />
                            <Input name="password" label="Password" type="password" value={formData.password} onChange={handleChange} required />
                            <Input name="city" label="City / Area" value={formData.city} onChange={handleChange} />
                        </div>
                    </fieldset>

                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-yellow px-2 font-semibold">Financials &amp; Commissions</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <Input name="initial_deposit" label="Wallet Balance" type="number" value={formData.initial_deposit} onChange={handleChange} placeholder="0.00" />
                            <Input name="commission_rate" label="Commission Rate (%)" type="number" value={formData.commission_rate} onChange={handleChange} placeholder="e.g., 5.00" />
                        </div>
                    </fieldset>

                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-yellow px-2 font-semibold">Default Betting Rules for Users</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            <Input name="prize_rate_2d" label="Prize Rate (2D)" type="number" value={formData.prize_rate_2d} onChange={handleChange} placeholder="Default: 85.00" />
                            <Input name="prize_rate_1d" label="Prize Rate (1D)" type="number" value={formData.prize_rate_1d} onChange={handleChange} placeholder="Default: 9.50" />
                            <Input name="bet_limit_2d" label="Bet Limit (2D)" type="number" value={formData.bet_limit_2d} onChange={handleChange} placeholder="No limit" />
                            <Input name="bet_limit_1d" label="Bet Limit (1D)" type="number" value={formData.bet_limit_1d} onChange={handleChange} placeholder="No limit" />
                            <Input name="bet_limit_per_draw" label="Bet Limit per Draw" type="number" value={formData.bet_limit_per_draw} onChange={handleChange} placeholder="No limit" />
                        </div>
                    </fieldset>
                    
                    <div className="flex justify-end space-x-4 pt-6 border-t border-border-color/50">
                        <button type="button" onClick={onClose} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-accent-orange to-accent-yellow text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-0.5 hover:shadow-glow-accent active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">{isLoading ? 'Adding...' : 'Add Dealer'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditDealerModal: React.FC<{dealer: User, onClose: () => void, onSuccess: () => void}> = ({dealer, onClose, onSuccess}) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: dealer.username || '',
        phone: dealer.phone || '',
        password: '',
        city: dealer.city || '',
        commission_rate: dealer.commission_rate?.toString() || '',
        prize_rate_2d: dealer.prize_rate_2d?.toString() || '',
        prize_rate_1d: dealer.prize_rate_1d?.toString() || '',
        bet_limit_2d: dealer.bet_limit_2d?.toString() || '',
        bet_limit_1d: dealer.bet_limit_1d?.toString() || '',
        bet_limit_per_draw: dealer.bet_limit_per_draw?.toString() || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) return;
        
        // Backend service handles string-to-number conversion and empty strings becoming null.
        const updateData: Record<string, any> = {
            username: formData.username,
            phone: formData.phone,
            city: formData.city,
            commission_rate: formData.commission_rate,
            prize_rate_2d: formData.prize_rate_2d,
            prize_rate_1d: formData.prize_rate_1d,
            bet_limit_2d: formData.bet_limit_2d,
            bet_limit_1d: formData.bet_limit_1d,
            bet_limit_per_draw: formData.bet_limit_per_draw,
        };

        if (formData.password) {
            updateData.password = formData.password;
        }

        setIsLoading(true);
        try {
            await updateDealerByAdmin(admin, dealer.id, updateData as Partial<User>);
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-2xl border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-yellow font-bold mb-6">Edit Dealer: {dealer.username}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-yellow px-2 font-semibold">Account Details</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <Input name="username" label="Username" value={formData.username} onChange={handleChange} required />
                            <Input name="phone" label="Phone Number" value={formData.phone} onChange={handleChange} required />
                            <Input name="password" label="New Password" type="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep unchanged" />
                            <Input name="city" label="City / Area" value={formData.city} onChange={handleChange} />
                        </div>
                    </fieldset>
                    
                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-yellow px-2 font-semibold">Financials & Commissions</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                           <Input name="commission_rate" label="Commission Rate (%)" type="number" value={formData.commission_rate} onChange={handleChange} placeholder="e.g., 5" />
                        </div>
                    </fieldset>

                    <fieldset className="border border-border-color p-4 rounded-lg">
                        <legend className="text-lg text-accent-yellow px-2 font-semibold">Betting Rules</legend>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            <Input name="prize_rate_2d" label="Prize Rate (2D)" type="number" value={formData.prize_rate_2d} onChange={handleChange} placeholder="Default: 85" />
                            <Input name="prize_rate_1d" label="Prize Rate (1D)" type="number" value={formData.prize_rate_1d} onChange={handleChange} placeholder="Default: 9.5" />
                             <Input name="bet_limit_2d" label="Bet Limit (2D)" type="number" value={formData.bet_limit_2d} onChange={handleChange} placeholder="No limit" />
                            <Input name="bet_limit_1d" label="Bet Limit (1D)" type="number" value={formData.bet_limit_1d} onChange={handleChange} placeholder="No limit" />
                            <Input name="bet_limit_per_draw" label="Bet Limit / Draw" type="number" value={formData.bet_limit_per_draw} onChange={handleChange} placeholder="Leave blank for no limit" />
                        </div>
                    </fieldset>
                    
                    <div className="flex justify-end space-x-4 pt-6 border-t border-border-color/50 mt-6">
                        <button type="button" onClick={onClose} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-gradient-to-r from-accent-orange to-accent-yellow text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-0.5 hover:shadow-glow-accent active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">{isLoading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddCreditModal: React.FC<{dealer: User; onClose: () => void; onSuccess: () => void;}> = ({ dealer, onClose, onSuccess }) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const creditAmount = parseFloat(amount);

        if (!admin) {
            addNotification('Admin user not found. Please log in again.', 'error');
            return;
        }

        if (isNaN(creditAmount) || creditAmount <= 0) {
            addNotification('Please enter a valid, positive amount.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
            await addCreditToDealer(admin, dealer.id, creditAmount);
            addNotification(`Successfully added ${formatCurrency(creditAmount)} to ${dealer.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification('Failed to add credit. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-yellow font-bold mb-2">Add Credit</h2>
                <p className="text-text-secondary mb-4">Adding credit to <span className="font-bold text-text-primary">{dealer.username}</span> ({dealer.id})</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="credit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="credit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent" 
                            placeholder="e.g., 5000"
                            required 
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-violet text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                            {isLoading ? 'Adding...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DebitFundsModal: React.FC<{dealer: User; onClose: () => void; onSuccess: () => void;}> = ({ dealer, onClose, onSuccess }) => {
    const { user: admin } = useAuth();
    const { addNotification } = useNotification();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const debitAmount = parseFloat(amount);

        if (!admin) {
            addNotification('Admin not logged in.', 'error');
            return;
        }
        if (isNaN(debitAmount) || debitAmount <= 0) {
            addNotification('Please enter a valid, positive amount.', 'error');
            return;
        }
        if (debitAmount > dealer.wallet_balance) {
            addNotification('Debit amount cannot exceed dealer balance.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
            await debitFundsByAdmin(admin, dealer.id, debitAmount);
            addNotification(`Successfully debited ${formatCurrency(debitAmount)} from ${dealer.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to debit funds.';
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-danger/30 my-auto animate-fade-in-down">
                <h2 className="text-2xl text-danger font-bold mb-2">Debit Funds</h2>
                <p className="text-text-secondary mb-4">Transferring funds from <span className="font-bold text-text-primary">{dealer.username}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="debit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="debit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent" 
                            placeholder="e.g., 500"
                            required 
                            autoFocus
                        />
                         <p className="text-xs text-text-secondary mt-1">Dealer balance: {formatCurrency(dealer.wallet_balance)}</p>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-danger text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-glow-danger active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                            {isLoading ? 'Transferring...' : 'Confirm Debit'}
                        </button>
                    </div>
                </form>
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
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-accent-yellow transition-colors duration-300"
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