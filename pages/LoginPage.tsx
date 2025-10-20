import React, { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useNotification } from '../contexts/NotificationContext';

const styles = {
    title: 'bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent',
    shadow: 'shadow-glow-accent',
    focusRing: 'focus:ring-accent-violet',
};

const LoginPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const { addNotification } = useNotification();
  
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const userRole = role as UserRole;
  const title = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  
  const from = location.state?.from?.pathname;
  const search = location.state?.from?.search;
  const redirectTo = (from && from !== '/') ? `${from}${search || ''}` : `/${userRole}/dashboard`;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !pin) {
        addNotification('Username and PIN are required.', 'error');
        return;
    }
    try {
      await login(userRole, username, pin);
      addNotification(`Welcome back, ${username}!`, 'success');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      addNotification('Login failed. Please check your credentials.', 'error');
    }
  };

  const getInputClass = (hasContent: boolean) => 
    `peer transition-all duration-300 shadow-inner appearance-none border rounded-lg w-full py-5 px-4 bg-bg-primary border-border-color text-text-primary text-xl leading-tight focus:outline-none focus:ring-2 ${styles.focusRing} focus:border-transparent placeholder-transparent`;
  
  const getLabelClass = () =>
    `absolute left-4 top-2 text-text-secondary text-xs transition-all duration-300 
     peer-placeholder-shown:text-xl peer-placeholder-shown:text-text-secondary peer-placeholder-shown:top-5 
     peer-focus:text-xs peer-focus:top-2 peer-focus:text-accent-violet
     pointer-events-none`;


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-md animate-fade-in-down">
        <Link to="/" className="block text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">
                A-BABA EXCHANGE
            </h1>
        </Link>
        <form onSubmit={handleSubmit} className={`bg-bg-secondary/80 backdrop-blur-lg ${styles.shadow} shadow-glow-inset-accent rounded-xl px-8 pt-6 pb-8 border border-border-color`}>
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold ${styles.title}`}>{title} Login</h1>
          </div>
          
          <div className="relative mb-6">
            <input
              className={getInputClass(!!username)}
              id="username"
              type="text"
              placeholder={`${title} Username`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
            <label className={getLabelClass()} htmlFor="username">
              {title} Username
            </label>
          </div>
          <div className="relative mb-8">
            <input
              className={`${getInputClass(!!pin)} pr-12`}
              id="pin"
              type={showPin ? 'text' : 'password'}
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
             <label className={getLabelClass()} htmlFor="pin">
              PIN
            </label>
             <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary hover:text-accent-violet transition-colors duration-300 focus:outline-none"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              className={`w-full bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:${styles.shadow} active:scale-95 focus:outline-none focus:ring-2 ${styles.focusRing} focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
          <div className="text-center mt-6">
            <Link to="/" className="inline-block align-baseline font-bold text-sm text-accent-violet/80 hover:text-accent-violet transition-colors duration-300">
              &larr; Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.415-3.165 2.584-4.416M9 12a3 3 0 11-6 0 3 3 0 016 0zm-1.148-.949a3.001 3.001 0 00-4.002 4.002l5.15-5.15a3.001 3.001 0 00-1.148-1.148zM12 5c.675 0 1.339.098 1.98.281m5.562 2.158a10.003 10.003 0 013.002 4.561C20.268 16.057 16.477 19 12 19c-1.11 0-2.193-.17-3.21-.498m2.148-13.455A10.002 10.002 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.004 10.004 0 01-2.458 4.416M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>;

export default LoginPage;