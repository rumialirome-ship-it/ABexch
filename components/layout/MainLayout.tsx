import React, { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const HamburgerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;


const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false); // Close menu on action
    };

    // A reusable component for navigation links to avoid duplication
    const NavLinks: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
        const linkBaseClass = "text-text-secondary font-semibold hover:text-accent-cyan transition-colors duration-300";
        const mobileLinkClass = "py-3 text-center text-lg w-full rounded-md hover:bg-bg-primary";
        const buttonBaseClass = "border border-danger/50 text-danger font-bold rounded-lg transition-all duration-300 text-sm active:scale-95";
        const desktopButtonClass = "py-2 px-4 hover:bg-danger hover:text-white hover:shadow-glow-danger hover:-translate-y-px";
        const mobileButtonClass = "w-full py-3 mt-2 text-lg";

        return (
            <>
                <Link to="/results" onClick={() => setIsMenuOpen(false)} className={`${linkBaseClass} ${isMobile ? mobileLinkClass : ''}`}>
                    Results
                </Link>
                {user && (
                    <>
                        <Link to={`/${user.role}/dashboard`} onClick={() => setIsMenuOpen(false)} className={`${linkBaseClass} ${isMobile ? mobileLinkClass : ''}`}>
                            Dashboard
                        </Link>
                        <button onClick={handleLogout} className={`${buttonBaseClass} ${isMobile ? mobileButtonClass : desktopButtonClass}`}>
                            Logout
                        </button>
                    </>
                )}
            </>
        );
    };

    return (
        <header className="bg-bg-secondary/80 backdrop-blur-lg sticky top-0 z-20 border-b border-border-color">
            <div className="container mx-auto flex justify-between items-center p-4">
                <Link to="/" className="text-lg md:text-xl font-bold tracking-wider whitespace-nowrap">
                    <span className="bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">A-BABA EXCHANGE</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-6">
                    <NavLinks />
                </nav>

                {/* Mobile Menu Toggle */}
                <div className="md:hidden">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-text-primary p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-violet"
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMenuOpen && (
                 <div className="md:hidden border-t border-border-color/50 animate-fade-in-down">
                    <nav className="flex flex-col items-center px-4 pt-2 pb-4 space-y-1">
                        <NavLinks isMobile />
                    </nav>
                </div>
            )}
        </header>
    );
};

const Footer: React.FC = () => (
    <footer className="bg-bg-secondary/80 backdrop-blur-lg text-center p-4 mt-auto border-t border-border-color">
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
             <div className="bg-bg-secondary/80 backdrop-blur-lg p-4 sm:p-6 md:p-8 rounded-xl border border-border-color shadow-glow-accent shadow-glow-inset-accent">
                <div className="flex items-center gap-4 mb-6 md:mb-8 border-b border-border-color pb-4">
                    {showBackButton && (
                        <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2 rounded-full text-text-secondary hover:bg-border-color hover:text-accent-violet transition-colors duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <h1 className={`text-3xl md:text-4xl font-bold tracking-wide ${titleClassName || 'bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent'}`}>{title}</h1>
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
