import React, { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';

const HamburgerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>;

const TopHeader: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
    return (
        <header className="bg-bg-secondary/80 backdrop-blur-lg sticky top-0 z-20 border-b border-border-color h-[65px] flex items-center px-4 md:hidden">
            <button
                onClick={toggleSidebar}
                className="text-text-primary p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-violet"
                aria-label="Toggle sidebar"
            >
                <HamburgerIcon />
            </button>
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
    const { user } = useAuth();
    // For mobile, sidebar starts closed. For desktop, it starts open.
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    // Don't render layout if there's no user, to avoid showing it on login/home pages.
    if (!user) {
        return <>{children}</>;
    }
    
    return (
        <div className="min-h-screen flex bg-transparent">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
                <TopHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
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
        </div>
    );
};

export const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center py-12">
        <div className="loader"></div>
    </div>
);

export default MainLayout;
