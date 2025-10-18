import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserRole, TIMING_GAMES, Game, DrawResult } from '../types';
import { LOGO_FULL_BASE64 } from '../assets/logo';
import { fetchAllResults } from '../services/api';
import { formatDisplayTime } from '../utils/formatters';

// Custom hook for game countdown based on Pakistan Standard Time (UTC+5)
const useGameCountdown = (time: string) => {
    const [timeLeft, setTimeLeft] = useState('--:--:--');
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const nowUtc = new Date();
            
            // Parse HH:mm 24-hour format
            const [hourPkt, minutePkt] = time.split(':').map(Number);
            
            // Convert Pakistan time to UTC (PKT is UTC+5)
            const hourUtc = (hourPkt - 5 + 24) % 24;

            // Set the target time in UTC for today
            let targetTimeUtc = new Date(Date.UTC(
                nowUtc.getUTCFullYear(),
                nowUtc.getUTCMonth(),
                nowUtc.getUTCDate(),
                hourUtc,
                minutePkt,
                0, 0
            ));

            // If the target time for today (in UTC) has already passed, set it for tomorrow
            if (nowUtc.getTime() > targetTimeUtc.getTime()) {
                targetTimeUtc.setUTCDate(targetTimeUtc.getUTCDate() + 1);
            }

            const difference = targetTimeUtc.getTime() - nowUtc.getTime();
            
            if (difference > 0) {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                
                setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
                setIsClosed(false);
            } else {
                // The time is up. The draw is closed for betting until it resets for the next day.
                setTimeLeft('Draw Closed');
                setIsClosed(true);
            }
        };
        
        calculateTimeLeft();
        const timerId = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timerId);
    }, [time]);

    return { timeLeft, isClosed };
};

const GameRow: React.FC<{ game: Game; result?: DrawResult }> = ({ game, result }) => {
    const { timeLeft, isClosed } = useGameCountdown(game.time);
    const displayTime = useMemo(() => formatDisplayTime(game.time), [game.time]);

    // Only determine the winning number if the draw is closed and a result is available
    let winningNumberToShow: string | undefined;
    if (isClosed && result) {
        if (game.betType === 'open') {
            winningNumberToShow = result.oneDigitOpen;
        } else if (game.betType === 'close') {
            winningNumberToShow = result.oneDigitClose;
        } else {
            // For full games, show the 2D number
            winningNumberToShow = result.twoDigit;
        }
    }

    const commonClasses = "grid grid-cols-3 gap-2 text-lg font-semibold rounded-md transition-all duration-300";
    const linkClasses = "hover:bg-accent-primary/10 hover:shadow-glow-accent hover:-translate-y-1 group focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-secondary";
    const disabledClasses = "opacity-60 cursor-not-allowed";

    const content = (
        <>
            <div className={`bg-blue-900/70 text-white p-3 rounded-l-md border border-r-0 border-blue-500/50 flex items-center justify-center gap-2 transition-colors duration-300 ${!isClosed ? 'group-hover:bg-accent-primary/20' : ''}`}>
                <span>{game.icon}</span>
                <span>{game.name}</span>
            </div>
            <div className={`bg-gray-800/70 text-white p-3 border-y border-gray-700/50 flex items-center justify-center font-mono text-2xl tracking-widest ${winningNumberToShow ? 'text-accent-tertiary text-shadow-glow-tertiary animate-pulse' : 'text-text-secondary'}`}>
                {winningNumberToShow || '--'}
            </div>
            <div className={`text-white p-3 rounded-r-md border border-l-0 font-mono transition-colors duration-300 flex items-center justify-center ${isClosed ? 'bg-gray-600/70 border-gray-500/50' : `bg-danger/70 border-danger/50 group-hover:bg-danger/90`}`}>
                {isClosed ? (
                    <span className="text-lg">{displayTime}</span>
                ) : (
                    <div className="flex flex-col items-center leading-tight">
                        <span className="text-2xl">{timeLeft}</span>
                        <span className="text-xs text-red-200">{displayTime}</span>
                    </div>
                )}
            </div>
        </>
    );

    // If the market is open, it's a link to the betting page.
    // If closed, it's just a div showing the result.
    if (isClosed) {
        return <div className={`${commonClasses} ${!winningNumberToShow ? disabledClasses : ''}`}>{content}</div>;
    }

    return (
        <Link 
            to={`/user/betting?game=${encodeURIComponent(game.name)}`}
            className={`${commonClasses} ${linkClasses}`}
        >
            {content}
        </Link>
    );
};

const TimingChart: React.FC<{ latestResults: Map<string, DrawResult> }> = ({ latestResults }) => {
  return (
    <div className="bg-background-secondary/80 backdrop-blur-lg rounded-xl shadow-glow-accent shadow-glow-inset-accent border border-border-color p-6 md:p-8 w-full max-w-2xl text-center mt-4 mb-8 animate-fade-in" style={{animationDelay: '100ms'}}>
      <h2 className="text-3xl font-bold text-accent-tertiary mb-6 text-shadow-glow-tertiary tracking-widest">LIVE TIMING & RESULTS</h2>
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-3 gap-2 text-sm font-bold text-text-secondary pb-2 border-b border-border-color">
            <div className="text-center">GAME</div>
            <div className="text-center">RESULT</div>
            <div className="text-center">TIME LEFT</div>
        </div>
        {TIMING_GAMES.map((game) => (
          <GameRow key={game.name} game={game} result={latestResults.get(game.name)} />
        ))}
      </div>
    </div>
  );
};


const HomePage: React.FC = () => {
    const [results, setResults] = useState<DrawResult[]>([]);

    useEffect(() => {
        const loadResults = async () => {
            try {
                const data = await fetchAllResults();
                setResults(data.sort((a, b) => new Date(b.declaredAt).getTime() - new Date(a.declaredAt).getTime()));
            } catch (error) {
                console.error("Failed to fetch results for homepage", error);
            }
        };
        loadResults();
    }, []);

    const latestResultsMap = useMemo(() => {
        const map = new Map<string, DrawResult>();
        if (results.length === 0) return map;
        
        for (const game of TIMING_GAMES) {
            const gameIdentifier = game.baseDrawName || game.name.replace(/\s/g, '_');
            const latestResultForGame = results.find(r => r.drawLabel.endsWith(gameIdentifier));

            if (latestResultForGame) {
                map.set(game.name, latestResultForGame);
            }
        }
        return map;
    }, [results]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center animate-fade-in-down animate-pulse-glow">
            <img src={LOGO_FULL_BASE64} alt="A-BABA Exchange Logo" className="w-64 md:w-80 mx-auto" />
            <p className="text-text-secondary text-lg -mt-4 animate-flicker" style={{ animationDelay: '1s' }}>Your premier online betting platform.</p>
        </div>
        
        <TimingChart latestResults={latestResultsMap} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl animate-fade-in" style={{animationDelay: '200ms'}}>
            <RoleCard 
                role={UserRole.USER} 
                title="User Login" 
                description="Access your account to place bets and view history." 
                icon={<UserIcon />}
            />
            <RoleCard 
                role={UserRole.DEALER} 
                title="Dealer Login" 
                description="Manage your users and track commissions." 
                icon={<DealerIcon />}
            />
            <RoleCard 
                role={UserRole.ADMIN} 
                title="Admin Login" 
                description="Oversee the entire platform operation." 
                icon={<AdminIcon />}
            />
        </div>
        <Link to="/results" className="mt-8 text-accent-primary/80 hover:text-accent-primary hover:underline transition-colors duration-300 animate-fade-in" style={{animationDelay: '300ms'}}>View All Recent Results</Link>
    </div>
  );
};

const roleStyles: Record<UserRole, { iconColor: string; hoverBorder: string; hoverShadow: string; buttonBg: string; buttonHoverShadow: string; }> = {
    [UserRole.USER]: {
        iconColor: 'text-accent-primary',
        hoverBorder: 'hover:border-accent-primary/60',
        hoverShadow: 'hover:shadow-glow-accent',
        buttonBg: 'bg-accent-primary',
        buttonHoverShadow: 'group-hover:shadow-glow-accent',
    },
    [UserRole.DEALER]: {
        iconColor: 'text-accent-secondary',
        hoverBorder: 'hover:border-accent-secondary/60',
        hoverShadow: 'hover:shadow-glow-secondary',
        buttonBg: 'bg-accent-secondary',
        buttonHoverShadow: 'group-hover:shadow-glow-secondary',
    },
    [UserRole.ADMIN]: {
        iconColor: 'text-accent-tertiary',
        hoverBorder: 'hover:border-accent-tertiary/60',
        hoverShadow: 'hover:shadow-glow-tertiary',
        buttonBg: 'bg-accent-tertiary',
        buttonHoverShadow: 'group-hover:shadow-glow-tertiary',
    },
};

interface RoleCardProps {
    role: UserRole;
    title: string;
    description: string;
    icon: ReactNode;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, title, description, icon }) => {
    const styles = roleStyles[role];

    return (
        <div className={`bg-background-secondary/80 backdrop-blur-lg rounded-xl p-6 flex flex-col items-center text-center border border-border-color transition-all duration-300 group ${styles.hoverBorder} ${styles.hoverShadow} hover:shadow-glow-inset-accent hover:-translate-y-2`}>
            <div className={`mb-4 transition-colors duration-300 ${styles.iconColor}`}>{icon}</div>
            <h3 className="text-2xl font-semibold text-text-primary mb-3">{title}</h3>
            <p className="text-text-secondary mb-6 flex-grow">{description}</p>
            <Link 
                to={`/login/${role}`} 
                className={`w-full ${styles.buttonBg} text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 transform-gpu group-hover:opacity-90 group-hover:-translate-y-1 ${styles.buttonHoverShadow} active:scale-95 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 focus:ring-offset-background-primary`}
            >
                Login as {role.charAt(0).toUpperCase() + role.slice(1)}
            </Link>
        </div>
    );
};


const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const DealerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const AdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12 12 0 0012 21.054a12 12 0 008.618-4.016z" /></svg>;


export default HomePage;