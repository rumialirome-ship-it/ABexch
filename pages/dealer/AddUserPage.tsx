import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { addUser } from '../../services/api';

const AddUserPage: React.FC = () => {
    const navigate = useNavigate();
    const { user: dealer } = useAuth();
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        password: '',
        name: '',
        contactNumber: '',
        cityArea: '',
        initialDeposit: '',
        commissionRate: '',
        prizeRate2D: '',
        prizeRate1D: '',
        betLimit2D: '',
        betLimit1D: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dealer) {
            addNotification('Dealer not logged in.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const newUser = await addUser(dealer, {
                username: formData.name,
                password: formData.password || undefined, // Send undefined if empty to allow default password
                phone: formData.contactNumber,
                city: formData.cityArea,
                initial_deposit: parseFloat(formData.initialDeposit) || 0,
                commission_rate: parseFloat(formData.commissionRate) || 0,
                prize_rate_2d: parseFloat(formData.prizeRate2D) || 85,
                prize_rate_1d: parseFloat(formData.prizeRate1D) || 9.5,
                bet_limit_2d: formData.betLimit2D ? parseFloat(formData.betLimit2D) : undefined,
                bet_limit_1d: formData.betLimit1D ? parseFloat(formData.betLimit1D) : undefined,
            });
            addNotification(`User ${newUser.username} created! ID: ${newUser.id}. Default PIN is 'Pak@123' if no password set.`, 'success');
            navigate('/dealer/manage-users');
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to create user.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MainLayout title="New Member Registration Form" showBackButton titleClassName="bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <InputGroup label="Password" name="password" value={formData.password} onChange={handleChange} type="password" />
                        <InputGroup label="Name" name="name" value={formData.name} onChange={handleChange} required />
                        <InputGroup label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
                        <InputGroup label="City / Area" name="cityArea" value={formData.cityArea} onChange={handleChange} />
                        <InputGroup label="Initial Deposit (Rs.)" name="initialDeposit" value={formData.initialDeposit} onChange={handleChange} type="number" required />
                    </div>
                    {/* Right Column */}
                    <div className="space-y-6">
                        <InputGroup label="Commission Rate (%)" name="commissionRate" value={formData.commissionRate} onChange={handleChange} type="number" placeholder="e.g., 5" />
                        <InputGroup label="Prize Rate on 2-Digits (Double)" name="prizeRate2D" value={formData.prizeRate2D} onChange={handleChange} type="number" placeholder="e.g., 85 (for 1 gets 85)" />
                        <InputGroup label="Prize Rate on 1-Digit (Open / Close)" name="prizeRate1D" value={formData.prizeRate1D} onChange={handleChange} type="number" placeholder="e.g., 9.5 (for 1 gets 9.5)" />
                        <InputGroup label="BET Limit on 2-Digits (Double) (Rs.)" name="betLimit2D" value={formData.betLimit2D} onChange={handleChange} type="number" placeholder="No limit if blank"/>
                        <InputGroup label="BET Limit on 1-Digit (Open / Close) (Rs.)" name="betLimit1D" value={formData.betLimit1D} onChange={handleChange} type="number" placeholder="No limit if blank"/>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border-color/50 text-center space-y-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full max-w-sm bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 disabled:bg-border-color disabled:opacity-50"
                    >
                        {isLoading ? 'Registering...' : 'Submit for Register & Generate ID'}
                    </button>
                    <Link to="/dealer/dashboard" className="block text-accent-cyan/80 hover:text-accent-cyan transition-colors">
                        &larr; Back to Dashboard
                    </Link>
                </div>
            </form>
        </MainLayout>
    );
};

const InputGroup: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, required?: boolean, placeholder?: string}> = 
({ label, name, value, onChange, type = 'text', required = false, placeholder }) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const inputClasses = "transition-all duration-300 w-full p-3 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent";

    return (
        <div>
            <label htmlFor={name} className="block text-text-secondary mb-2">{label}{required && <span className="text-danger">*</span>}</label>
            <div className="relative">
                <input
                    type={inputType}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={inputClasses}
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

const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.415-3.165 2.584-4.416M9 12a3 3 0 11-6 0 3 3 0 016 0zm-1.148-.949a3.001 3.001 0 00-4.002 4.002l5.15-5.15a3.001 3.001 0 00-1.148-1.148zM12 5c.675 0 1.339.098 1.98.281m5.562 2.158a10.003 10.003 0 013.002 4.561C20.268 16.057 16.477 19 12 19c-1.11 0-2.193-.17-3.21-.498m2.148-13.455A10.002 10.002 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.004 10.004 0 01-2.458 4.416M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>;

export default AddUserPage;