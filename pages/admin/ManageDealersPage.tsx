
import React, { useState, useEffect } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchAllDealers, addDealer, addCreditToDealer, debitFundsByAdmin } from '../../services/api';
import { User } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const ManageDealersPage: React.FC = () => {
    const { user: admin } = useAuth();
    const [dealers, setDealers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDealerModal, setShowAddDealerModal] = useState(false);
    const [showAddCreditModal, setShowAddCreditModal] = useState(false);
    const [showDebitFundsModal, setShowDebitFundsModal] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState<User | null>(null);

    const loadDealers = async () => {
        if (!admin) return;
        setLoading(true);
        try {
            // FIX: Pass the admin user object to the API call.
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

    const handleCloseModals = () => {
        setSelectedDealer(null);
        setShowAddCreditModal(false);
        setShowDebitFundsModal(false);
    };

    return (
        <MainLayout title="Manage Dealers" showBackButton titleClassName="text-accent-tertiary text-shadow-glow-tertiary">
            <div className="flex justify-end mb-4">
                <button 
                    onClick={() => setShowAddDealerModal(true)} 
                    className="bg-accent-tertiary text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-1 hover:shadow-glow-tertiary active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-tertiary focus:ring-offset-2 focus:ring-offset-background-primary"
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
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Dealer ID</th>
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Username</th>
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Phone</th>
                                <th className="py-3 px-4 text-right text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Balance</th>
                                <th className="py-3 px-4 text-center text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dealers.map((dealer) => (
                                <tr key={dealer.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-tertiary/5 transition-colors duration-300">
                                    <td className="py-4 px-4 font-mono">{dealer.id}</td>
                                    <td className="py-4 px-4">{dealer.username}</td>
                                    <td className="py-4 px-4">{dealer.phone}</td>
                                    <td className="py-4 px-4 text-right font-mono">{formatCurrency(dealer.walletBalance)}</td>
                                    <td className="py-4 px-4 text-center space-x-2">
                                        <button 
                                            onClick={() => handleOpenDebitFunds(dealer)}
                                            className="border border-danger/50 text-danger font-bold py-1 px-3 rounded-lg text-sm transition-all duration-300 hover:bg-danger hover:text-white hover:shadow-glow-danger active:scale-95"
                                        >
                                            Debit Funds
                                        </button>
                                        <button 
                                            onClick={() => handleOpenAddCredit(dealer)}
                                            className="bg-accent-primary/80 text-black font-bold py-1 px-3 rounded-lg text-sm transition-all duration-300 hover:bg-accent-primary hover:shadow-glow-accent hover:-translate-y-0.5 active:scale-95"
                                        >
                                            Add Credit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {showAddDealerModal && <AddDealerModal onClose={() => setShowAddDealerModal(false)} onDealerAdded={loadDealers} />}
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
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [city, setCity] = useState('');
    const [initialDeposit, setInitialDeposit] = useState('');
    const [commissionRate, setCommissionRate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) {
            addNotification('Admin user not found. Please log in again.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            // FIX: Pass the admin user object to the API call.
            await addDealer(admin, {
                username,
                phone,
                password,
                city,
                initialDeposit: parseFloat(initialDeposit) || 0,
                commissionRate: parseFloat(commissionRate) || 0,
            });
            addNotification(`Dealer ${username} added successfully. Default PIN is 'Admin@123' if no password is set.`, 'success');
            onDealerAdded();
            onClose();
        } catch (err) {
            addNotification('Failed to create dealer. Phone may already exist.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputClasses = "transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-tertiary focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color animate-fade-in-down">
                <h2 className="text-2xl text-accent-tertiary font-bold mb-4 text-shadow-glow-tertiary">Add New Dealer</h2>
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
                        <label className="block text-text-secondary mb-1">Password</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClasses} pr-10`} placeholder="Optional"/>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-accent-tertiary transition-colors duration-300"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-text-secondary mb-1">City / Area</label>
                        <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-1">Initial Deposit</label>
                        <input type="number" value={initialDeposit} onChange={e => setInitialDeposit(e.target.value)} className={inputClasses} placeholder="0"/>
                    </div>
                     <div>
                        <label className="block text-text-secondary mb-1">Commission Rate (%)</label>
                        <input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className={inputClasses} placeholder="e.g., 2"/>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-tertiary text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-glow-tertiary active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">{isLoading ? 'Adding...' : 'Add Dealer'}</button>
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
            // FIX: Pass the admin user object to the API call.
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color animate-fade-in-down">
                <h2 className="text-2xl text-accent-tertiary font-bold mb-2 text-shadow-glow-tertiary">Add Credit</h2>
                <p className="text-text-secondary mb-4">Adding credit to <span className="font-bold text-text-primary">{dealer.username}</span> ({dealer.id})</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="credit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="credit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-tertiary focus:border-transparent" 
                            placeholder="e.g., 5000"
                            required 
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-primary text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
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
        if (debitAmount > dealer.walletBalance) {
            addNotification('Debit amount cannot exceed dealer balance.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
            // FIX: Pass the admin object and correct the argument order.
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-danger/30 animate-fade-in-down">
                <h2 className="text-2xl text-danger font-bold mb-2 text-shadow-glow-danger">Debit Funds</h2>
                <p className="text-text-secondary mb-4">Transferring funds from <span className="font-bold text-text-primary">{dealer.username}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="debit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="debit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent" 
                            placeholder="e.g., 500"
                            required 
                            autoFocus
                        />
                         <p className="text-xs text-text-secondary mt-1">Dealer balance: {formatCurrency(dealer.walletBalance)}</p>
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


const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.415-3.165 2.584-4.416M9 12a3 3 0 11-6 0 3 3 0 016 0zm-1.148-.949a3.001 3.001 0 00-4.002 4.002l5.15-5.15a3.001 3.001 0 00-1.148-1.148zM12 5c.675 0 1.339.098 1.98.281m5.562 2.158a10.003 10.003 0 013.002 4.561C20.268 16.057 16.477 19 12 19c-1.11 0-2.193-.17-3.21-.498m2.148-13.455A10.002 10.002 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.004 10.004 0 01-2.458 4.416M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>;

export default ManageDealersPage;
