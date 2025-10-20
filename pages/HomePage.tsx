import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserRole, TIMING_GAMES, Game, DrawResult } from '../types';
import { fetchAllResults } from '../services/api';
import { formatDisplayTime } from '../utils/formatters';

// Custom hook for game countdown based on Pakistan Standard Time (UTC+5)
const useGameCountdown = (time: string) => {
    const [timeLeft, setTimeLeft] = useState('--:--:--');
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const nowUtc = new Date();
            
            const [hourPkt, minutePkt] = time.split(':').map(Number);
            
            const hourUtc = (hourPkt - 5 + 24) % 24;

            let targetTimeUtc = new Date(Date.UTC(
                nowUtc.getUTCFullYear(),
                nowUtc.getUTCMonth(),
                nowUtc.getUTCDate(),
                hourUtc,
                minutePkt,
                0, 0
            ));

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

const GameCard: React.FC<{ game: Game; result?: DrawResult }> = ({ game, result }) => {
    const { timeLeft, isClosed } = useGameCountdown(game.time);
    const displayTime = useMemo(() => formatDisplayTime(game.time), [game.time]);

    let winningNumberToShow: string | undefined;
    if (isClosed && result) {
        if (game.bet_type === 'open') winningNumberToShow = result.one_digit_open;
        else if (game.bet_type === 'close') winningNumberToShow = result.one_digit_close;
        else winningNumberToShow = result.two_digit;
    }

    const commonClasses = "bg-bg-secondary rounded-lg p-4 flex flex-col items-center justify-center text-center border border-border-color transition-all duration-300 transform-gpu shadow-lg aspect-square";
    const linkClasses = "hover:border-accent-violet/50 hover:shadow-glow-accent hover:scale-110";
    const disabledClasses = "opacity-60 cursor-not-allowed";

    const content = (
        <>
            <h3 className="text-lg font-bold text-text-primary tracking-wide">{game.name}</h3>
            <div className="my-3">
                {isClosed ? (
                     <span className={`font-mono text-4xl font-bold tracking-widest ${winningNumberToShow ? 'text-accent-yellow animate-pulse' : 'text-text-secondary'}`}>
                        {winningNumberToShow || 'CLOSED'}
                    </span>
                ) : (
                    <span className="font-mono text-4xl font-bold tracking-widest bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent animate-flicker">
                        {timeLeft}
                    </span>
                )}
            </div>
            <div className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Draw Time: {displayTime}
            </div>
        </>
    );


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
    <div className="w-full max-w-7xl mx-auto my-8 animate-fade-in" style={{animationDelay: '100ms'}}>
      <h2 className="text-3xl font-bold mb-8 tracking-widest text-center bg-gradient-to-r from-accent-yellow via-accent-violet to-accent-cyan bg-clip-text text-transparent">LIVE DRAW COUNTDOWN</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {TIMING_GAMES.map((game) => (
          <GameCard key={game.name} game={game} result={latestResults.get(game.name)} />
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
                setResults(data.sort((a, b) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime()));
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
            const gameIdentifier = game.base_draw_name || game.name.replace(/\s/g, '_');
            const latestResultForGame = results.find(r => r.draw_label.endsWith(gameIdentifier));

            if (latestResultForGame) {
                map.set(game.name, latestResultForGame);
            }
        }
        return map;
    }, [results]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center animate-fade-in-down">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-wider bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">
                A-BABA EXCHANGE
            </h1>
            <p className="text-text-secondary text-lg mt-2 animate-flicker" style={{ animationDelay: '1s' }}>Your premier online betting platform.</p>
        </div>
        
        <TimingChart latestResults={latestResultsMap} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl animate-fade-in my-8" style={{animationDelay: '200ms'}}>
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
        <Link to="/results" className="mt-8 text-accent-violet/80 hover:text-accent-violet hover:underline transition-colors duration-300 animate-fade-in" style={{animationDelay: '300ms'}}>View All Recent Results</Link>
    </div>
  );
};

const roleCardStyles = {
    iconColor: 'text-accent-violet',
    hoverBorder: 'hover:border-accent-violet/60',
    hoverShadow: 'hover:shadow-glow-accent',
};

interface RoleCardProps {
    role: UserRole;
    title: string;
    description: string;
    icon: ReactNode;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, title, description, icon }) => {
    const smallIcon = useMemo(() => {
        switch (role) {
            case UserRole.USER: return <SmallUserIcon />;
            case UserRole.DEALER: return <SmallDealerIcon />;
            case UserRole.ADMIN: return <SmallAdminIcon />;
            default: return null;
        }
    }, [role]);

    return (
        <div className={`bg-bg-secondary/80 backdrop-blur-lg rounded-xl p-6 flex flex-col items-center text-center border border-border-color transition-all duration-300 group ${roleCardStyles.hoverBorder} ${roleCardStyles.hoverShadow} hover:shadow-glow-inset-accent hover:-translate-y-2`}>
            <div className={`mb-4 transition-colors duration-300 ${roleCardStyles.iconColor}`}>{icon}</div>
            <h3 className="text-2xl font-semibold text-text-primary mb-3">{title}</h3>
            <p className="text-text-secondary mb-6 flex-grow">{description}</p>
            <Link 
                to={`/login/${role}`} 
                className={`w-full relative text-center bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform-gpu group-hover:saturate-150 group-hover:-translate-y-1 group-hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-primary`}
            >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-75">
                    {smallIcon}
                </span>
                <span>Login as {role.charAt(0).toUpperCase() + role.slice(1)}</span>
            </Link>
        </div>
    );
};


const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const DealerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const AdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12 12 0 0012 21.054a12 12 0 008.618-4.016z" /></svg>;

const SmallUserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const SmallDealerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const SmallAdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12 12 0 0012 21.054a12 12 0 008.618-4.016z" /></svg>;


export default HomePage;