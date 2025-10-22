import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { 
    fetchDealerById, 
    fetchUsersForDealerByAdmin, 
    addCreditToDealer, 
    debitFundsByAdmin, 
    updateDealerByAdmin, 
    updateUserBlockStatus 
} from '../../services/api';
import { User } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const DealerDetailsPage: React.FC = () => {
    const { dealerId } = useParams<{ dealerId: string }>();
    const { user: admin } = useAuth();
    const [dealer, setDealer] = useState<User | null>(null);
    const [managedUsers, setManagedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

    const loadDealerDetails = useCallback(async () => {
        if (!dealerId || !admin) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [dealerData, usersData] = await Promise.all([
                fetchDealerById(admin, dealerId),
                fetchUsersForDealerByAdmin(admin, dealerId),
            ]);
            setDealer(dealerData);
            setManagedUsers(usersData);
        } catch (error) {
            console.error("Failed to load dealer details", error);
        } finally {
            setLoading(false);
        }
    }, [dealerId, admin]);

    useEffect(() => {
        loadDealerDetails();
    }, [loadDealerDetails]);

    if (loading) {
        return <MainLayout title="Loading Dealer Details..."><LoadingSpinner /></MainLayout>;
    }

    if (!dealer) {
        return <MainLayout title="Dealer Not Found" showBackButton><p className="text-center text-danger">Could not find details for the specified dealer.</p></MainLayout>;
    }

    return (
        <MainLayout title={`Details for ${dealer.username}`} showBackButton>
            <div className="bg-bg-primary/50 p-6 rounded-lg border border-border-color mb-8 shadow-glow-inset-accent">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-semibold text-accent-violet">Dealer Information</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setIsEditModalOpen(true)} className="border border-accent-violet/50 text-accent-violet font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-accent-violet hover:text-white hover:shadow-glow-accent text-sm active:scale-95">Edit Dealer</button>
                        <button onClick={() => setIsBlockModalOpen(true)} className={`border ${dealer.is_blocked ? 'border-success/50 text-success hover:bg-success' : 'border-danger/50 text-danger hover:bg-danger'} font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:text-white text-sm active:scale-95`}>{dealer.is_blocked ? 'Unblock Dealer' : 'Block Dealer'}</button>
                        <button onClick={() => setIsDebitModalOpen(true)} className="border border-danger/50 text-danger font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-danger hover:text-white text-sm active:scale-95">Debit Funds</button>
                        <button onClick={() => setIsCreditModalOpen(true)} className="bg-accent-violet text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-1 active:scale-95">Add Credit</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                    <InfoItem label="Dealer ID" value={dealer.id} isMono />
                    <InfoItem label="Name" value={dealer.username} />
                    <InfoItem label="Phone" value={dealer.phone || 'N/A'} />
                    <InfoItem label="Area" value={dealer.city || 'N/A'} />
                    <InfoItem label="Commission Rate" value={dealer.commission_rate != null ? `${dealer.commission_rate}%` : 'N/A'} />
                    <div className="lg:col-span-3 flex items-center gap-4">
                        <InfoItem label="Wallet Balance" value={formatCurrency(dealer.wallet_balance)} isMono highlight />
                         {dealer.is_blocked && <span className="inline-block bg-danger/20 text-danger border border-danger/30 px-3 py-1 text-sm font-semibold rounded-full">BLOCKED</span>}
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-semibold text-accent-violet mb-4">Managed Users ({managedUsers.length})</h3>
                <div className="overflow-x-auto rounded-lg border border-border-color">
                    <table className="min-w-full bg-transparent text-sm">
                        <thead className="border-b-2 border-border-color bg-bg-secondary/80">
                            <tr>
                                <th className="py-2 px-3 text-left text-accent-violet/80 font-semibold tracking-wider uppercase">User ID</th>
                                <th className="py-2 px-3 text-left text-accent-violet/80 font-semibold tracking-wider uppercase">Username</th>
                                <th className="py-2 px-3 text-right text-accent-violet/80 font-semibold tracking-wider uppercase">Balance</th>
                                <th className="py-2 px-3 text-center text-accent-violet/80 font-semibold tracking-wider uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color/30">
                            {managedUsers.map(user => (
                                <tr key={user.id} className="hover:bg-accent-violet/5">
                                    <td className="py-3 px-3 font-mono">{user.id}</td>
                                    <td className="py-3 px-3"><Link to={`/admin/users/${user.id}`} className="hover:underline">{user.username}</Link></td>
                                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(user.wallet_balance)}</td>
                                    <td className="py-3 px-3 text-center">{user.is_blocked ? <span className="text-danger font-semibold">Blocked</span> : <span className="text-success">Active</span>}</td>
                                </tr>
                            ))}
                            {managedUsers.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-text-secondary">This dealer has no users.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditModalOpen && <EditDealerModal dealer={dealer} onClose={() => setIsEditModalOpen(false)} onSuccess={loadDealerDetails} />}
            {isCreditModalOpen && <AddCreditModal dealer={dealer} onClose={() => setIsCreditModalOpen(false)} onSuccess={loadDealerDetails} />}
            {isDebitModalOpen && <DebitFundsModal dealer={dealer} onClose={() => setIsDebitModalOpen(false)} onSuccess={loadDealerDetails} />}
            {isBlockModalOpen && <BlockDealerModal dealer={dealer} onClose={() => setIsBlockModalOpen(false)} onSuccess={loadDealerDetails} />}
        </MainLayout>
    );
};

const InfoItem: React.FC<{label: string, value: string, isMono?: boolean, highlight?: boolean}> = ({ label, value, isMono, highlight }) => (
    <div>
        <span className="text-text-secondary">{label}:</span> 
        <span className={`${isMono ? 'font-mono' : ''} ${highlight ? 'text-2xl text-accent-violet font-bold' : 'text-text-primary text-lg'}`}> {value}</span>
    </div>
);

// --- MODALS ---

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

const AddCreditModal: React.FC<{dealer: User, onClose: () => void, onSuccess: () => void}> = ({ dealer, onClose, onSuccess }) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) return;
        const creditAmount = parseFloat(amount);
        if (isNaN(creditAmount) || creditAmount <= 0) {
            addNotification('Please enter a valid, positive amount.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await addCreditToDealer(admin, dealer.id, creditAmount);
            addNotification(`Successfully sent ${formatCurrency(creditAmount)} to ${dealer.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : 'Failed to add credit.', 'error');
        } finally { setIsLoading(false); }
    };

    return (
        <Modal title="Add Credit" subtitle={`Adding credit to ${dealer.username}`} onClose={onClose} isLoading={isLoading}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Amount" name="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus placeholder="e.g., 10000" />
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all hover:bg-border-color active:scale-95">Cancel</button>
                    <button type="submit" disabled={isLoading} className="bg-accent-violet text-white font-bold py-2 px-6 rounded-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">{isLoading ? 'Sending...' : 'Confirm'}</button>
                </div>
            </form>
        </Modal>
    );
};

const DebitFundsModal: React.FC<{dealer: User, onClose: () => void, onSuccess: () => void}> = ({ dealer, onClose, onSuccess }) => {
    const { user: admin } = useAuth();
    const { addNotification } = useNotification();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) return;
        const debitAmount = parseFloat(amount);
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
            addNotification(err instanceof Error ? err.message : 'Failed to debit funds.', 'error');
        } finally { setIsLoading(false); }
    };

    return (
        <Modal title="Debit Funds" subtitle={`Transferring funds from ${dealer.username}`} onClose={onClose} isLoading={isLoading} danger>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Amount" name="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus placeholder="e.g., 500" />
                <p className="text-xs text-text-secondary -mt-2">Current balance: {formatCurrency(dealer.wallet_balance)}</p>
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all hover:bg-border-color active:scale-95">Cancel</button>
                    <button type="submit" disabled={isLoading} className="bg-danger text-white font-bold py-2 px-6 rounded-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">{isLoading ? 'Transferring...' : 'Confirm Debit'}</button>
                </div>
            </form>
        </Modal>
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
            await updateUserBlockStatus(admin, dealer.id, isBlocking);
            addNotification(`Successfully ${isBlocking ? 'blocked' : 'unblocked'} ${dealer.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : `Failed to ${isBlocking ? 'block' : 'unblock'} dealer.`, 'error');
        } finally { setIsLoading(false); }
    };

    return (
        <Modal title={isBlocking ? 'Block Dealer' : 'Unblock Dealer'} onClose={onClose} isLoading={isLoading} danger={isBlocking}>
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
        </Modal>
    );
};


// --- Generic Modal & Input Components ---

const Modal: React.FC<{title: string, subtitle?: string, children: React.ReactNode, onClose: () => void, isLoading: boolean, danger?: boolean}> = ({ title, subtitle, children, onClose, isLoading, danger }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
        <div className={`bg-bg-secondary p-8 rounded-xl shadow-glow-hard w-full max-w-md border ${danger ? 'border-danger/30' : 'border-border-color'} my-auto animate-fade-in-down`}>
            <h2 className={`text-2xl font-bold mb-2 ${danger ? 'text-danger' : 'text-accent-violet'}`}>{title}</h2>
            {subtitle && <p className="text-text-secondary mb-4">{subtitle}</p>}
            {children}
        </div>
    </div>
);

const Input: React.FC<{name: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, required?: boolean, placeholder?: string, autoFocus?: boolean}> = 
({ name, label, value, onChange, type = 'text', required, placeholder, autoFocus }) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const inputClasses = "transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet text-sm";
    
    return (
        <div>
            <label htmlFor={name} className="block text-text-secondary mb-1 text-sm">{label}{required && <span className="text-danger">*</span>}</label>
            <div className="relative">
                <input id={name} name={name} type={inputType} value={value} onChange={onChange} required={required} placeholder={placeholder} className={inputClasses} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? '0' : undefined} autoFocus={autoFocus} />
                {type === 'password' && (
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-accent-violet" aria-label={showPassword ? 'Hide' : 'Show'}>
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                )}
            </div>
        </div>
    );
};

const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.415-3.165 2.584-4.416M9 12a3 3 0 11-6 0 3 3 0 016 0zm-1.148-.949a3.001 3.001 0 00-4.002 4.002l5.15-5.15a3.001 3.001 0 00-1.148-1.148zM12 5c.675 0 1.339.098 1.98.281m5.562 2.158a10.003 10.003 0 013.002 4.561C20.268 16.057 16.477 19 12 19c-1.11 0-2.193-.17-3.21-.498m2.148-13.455A10.002 10.002 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.004 10.004 0 01-2.458 4.416M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>;

export default DealerDetailsPage;