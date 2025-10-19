import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LOGO_BASE64 } from '../../assets/logo';

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="bg-background-secondary/80 backdrop-blur-lg p-4 sticky top-0 z-20 border-b border-border-color">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-wider text-text-primary transition-all duration-300 hover:text-accent-primary">
                    <img src={LOGO_BASE64} alt="A-BABA Logo" className="h-8 w-auto" />
                    <span className="hidden sm:inline">A-BABA EXCHANGE</span>
                </Link>
                <nav className="flex items-center space-x-4 md:space-x-6">
                    <Link to="/results" className="text-text-secondary font-semibold hover:text-accent-primary transition-colors duration-300">Results</Link>
                    {user && (
                        <>
                            <Link to={`/${user.role}/dashboard`} className="text-text-secondary font-semibold hover:text-accent-primary transition-colors duration-300">Dashboard</Link>
                            <button onClick={handleLogout} className="border border-danger/50 text-danger font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-danger hover:text-white hover:shadow-glow-danger text-sm hover:-translate-y-px active:scale-95">
                                Logout
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

const Footer: React.FC = () => (
    <footer className="bg-background-secondary/80 backdrop-blur-lg text-center p-4 mt-auto border-t border-border-color">
        <div className="container mx-auto">
            <p className="text-text-secondary text-sm">&copy; {new Date().getFullYear()} A-BABA EXCHANGE. All rights reserved.</p>
        </div>
    </footer>
);


const MainLayout: React.FC<{ children: ReactNode; title: string; showBackButton?: boolean; titleClassName?: string; }> = ({ children, title, showBackButton = false, titleClassName }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
        <Header />
        <main className="flex-grow container mx-auto p-4 md:p-8 animate-fade-in">
             <div className="bg-background-secondary/80 backdrop-blur-lg p-4 sm:p-6 md:p-8 rounded-xl border border-border-color shadow-glow-accent shadow-glow-inset-accent">
                <div className="flex items-center gap-4 mb-6 md:mb-8 border-b border-border-color pb-4">
                    {showBackButton && (
                        <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2 rounded-full text-text-secondary hover:bg-border-color hover:text-accent-primary transition-colors duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <h1 className={`text-3xl md:text-4xl font-bold tracking-wide ${titleClassName || 'text-accent-primary text-shadow-glow-primary'}`}>{title}</h1>
                </div>
                {children}
            </div>
        </main>
        <Footer />
    </div>
  );
};

export const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center py-12">
        <div className="loader"></div>
    </div>
);


export default MainLayout;
