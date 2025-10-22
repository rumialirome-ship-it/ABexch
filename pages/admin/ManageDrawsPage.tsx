import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { declareDraw } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { TIMING_GAMES, Game } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const ManageDrawsPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [drawLabel, setDrawLabel] = useState('');
    const [twoD, setTwoD] = useState('');
    const [singleD, setSingleD] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [selectedGameName, setSelectedGameName] = useState(TIMING_GAMES[0].name);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    const selectedGame = useMemo(() => TIMING_GAMES.find(g => g.name === selectedGameName)!, [selectedGameName]);


    useEffect(() => {
        if (selectedDate && selectedGameName) {
            const gameNameForLabel = selectedGame.base_draw_name || selectedGame.name.replace(/\s/g, '_');
            setDrawLabel(`${selectedDate}-${gameNameForLabel}`);
        }
    }, [selectedDate, selectedGameName, selectedGame]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!admin) {
            addNotification('Admin user not logged in.', 'error');
            return;
        }

        const isSplitGame = selectedGame.bet_type === 'open' || selectedGame.bet_type === 'close';

        if (isSplitGame) {
             if (singleD.length !== 1 || !/^\d+$/.test(singleD)) {
                addNotification('Winning number must be exactly 1 digit for this game.', 'error');
                return;
            }
        } else {
            if (twoD.length !== 2 || !/^\d+$/.test(twoD)) {
                addNotification('2D number must be exactly 2 digits.', 'error');
                return;
            }
        }
        
        if (!drawLabel) {
            addNotification('Please select a game and date to generate the draw label.', 'error');
            return;
        }

        setIsLoading(true);
        const winningNumbers = isSplitGame
            ? (selectedGame.bet_type === 'open' ? { one_digit_open: singleD } : { one_digit_close: singleD })
            : {
                two_digit: twoD,
                one_digit_open: twoD.charAt(0),
                one_digit_close: twoD.charAt(1)
            };

        try {
            await declareDraw(admin, drawLabel, winningNumbers);
            addNotification(`Declared result for ${drawLabel}. Bets are being settled.`, 'success');
            setTwoD('');
            setSingleD('');
        } catch (err) {
            addNotification('Failed to declare draw.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputClasses = "transition-all duration-300 w-full p-3 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent";
    const readOnlyInputClasses = "w-full p-3 bg-bg-secondary border border-border-color/50 rounded-lg text-text-secondary";

    return (
        <MainLayout title="Declare Draw Results" showBackButton>
            <div className="max-w-lg mx-auto">
                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-text-secondary mb-2">Game</label>
                            <select 
                                value={selectedGameName} 
                                onChange={e => setSelectedGameName(e.target.value)} 
                                className={inputClasses}
                            >
                                {TIMING_GAMES.map(game => <option key={game.name} value={game.name}>{game.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-text-secondary mb-2">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className={inputClasses}
                                required
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-text-secondary mb-2">Generated Draw Label</label>
                        <input
                            type="text"
                            value={drawLabel}
                            readOnly
                            className={readOnlyInputClasses}
                        />
                    </div>
                    {selectedGame.bet_type === 'open' || selectedGame.bet_type === 'close' ? (
                        <div>
                            <label className="block text-text-secondary mb-2">Winning 1-Digit Number ({selectedGame.bet_type})</label>
                            <input
                                type="text"
                                value={singleD}
                                onChange={e => setSingleD(e.target.value.replace(/\D/g, ''))}
                                maxLength={1}
                                className={`${inputClasses} font-mono text-center text-3xl tracking-widest`}
                                required
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-text-secondary mb-2">Winning 2-Digit Number</label>
                                <input
                                    type="text"
                                    value={twoD}
                                    onChange={e => setTwoD(e.target.value.replace(/\D/g, ''))}
                                    maxLength={2}
                                    className={`${inputClasses} font-mono text-center text-3xl tracking-widest`}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-secondary mb-1">1D Open</label>
                                    <input type="text" value={twoD.charAt(0) || ''} readOnly className={`${readOnlyInputClasses} font-mono text-center text-3xl`} />
                                </div>
                                <div>
                                    <label className="block text-text-secondary mb-1">1D Close</label>
                                    <input type="text" value={twoD.charAt(1) || ''} readOnly className={`${readOnlyInputClasses} font-mono text-center text-3xl`} />
                                </div>
                            </div>
                        </>
                    )}
                    <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-primary disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                        {isLoading ? 'Declaring...' : 'Declare and Settle Bets'}
                    </button>
                </form>
            </div>
        </MainLayout>
    );
};

export default ManageDrawsPage;