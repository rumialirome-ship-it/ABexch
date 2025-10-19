import React, { useState, useMemo, ReactNode, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { formatCurrency, formatDisplayTime } from '../../utils/formatters';
import { placeBets } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Bet, TIMING_GAMES, Game } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import BetSlipSummary from '../../components/common/BetSlipSummary';
import BetInfoPanel from '../../components/common/BetInfoPanel';

type BetType = '2D Quick' | '2D Bulk' | '2D Combo' | '1D Open Quick' | '1D Close Quick';

const getNextDrawForGame = (game: Game): { drawLabel: string } => {
    const nowUtc = new Date();
    
    // Parse HH:mm 24-hour format
    const [hourPkt, minutePkt] = game.time.split(':').map(Number);

    // Convert Pakistan time to UTC (PKT is UTC+5)
    const hourUtc = (hourPkt - 5 + 24) % 24;

    // Set the target draw time in UTC for today
    let targetTimeUtc = new Date(Date.UTC(
        nowUtc.getUTCFullYear(),
        nowUtc.getUTCMonth(),
        nowUtc.getUTCDate(),
        hourUtc,
        minutePkt,
        0, 0
    ));

    // If the target time for today (in UTC) has already passed, set it for tomorrow (in UTC)
    if (nowUtc.getTime() > targetTimeUtc.getTime()) {
        targetTimeUtc.setUTCDate(targetTimeUtc.getUTCDate() + 1);
    }

    // Convert the next draw's UTC timestamp back to a PKT date string for the label.
    // Add 5 hours to UTC to get PKT, then use UTC methods to extract date parts.
    const drawTimePkt = new Date(targetTimeUtc.getTime() + (5 * 60 * 60 * 1000));
    
    const year = drawTimePkt.getUTCFullYear();
    const month = (drawTimePkt.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = drawTimePkt.getUTCDate().toString().padStart(2, '0');
    
    const gameNameForLabel = game.base_draw_name || game.name.replace(/\s/g, '_');
    
    return { drawLabel: `${year}-${month}-${day}-${gameNameForLabel}` };
};


const ConfirmationDialog: React.FC<{
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    isLoading: boolean;
    children: ReactNode;
}> = ({ isOpen, onConfirm, onCancel, title, isLoading, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-lg border border-border-color animate-fade-in-down">
                <h2 className="text-2xl text-accent-primary font-bold mb-4 text-shadow-glow-primary">{title}</h2>
                <div className="text-text-primary mb-6">
                    {children}
                </div>
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button type="button" onClick={onCancel} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={isLoading} className="bg-accent-primary text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                        {isLoading ? 'Confirming...' : 'Confirm Bet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BettingPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const gameNameFromUrl = searchParams.get('game');

    const findInitialGame = () => {
        if (gameNameFromUrl) {
            const game = TIMING_GAMES.find(g => g.name === gameNameFromUrl);
            if (game) return game;
        }
        return TIMING_GAMES[0];
    };

    const [activeTab, setActiveTab] = useState<BetType>('2D Bulk');
    const [selectedGame, setSelectedGame] = useState<Game>(findInitialGame());

    const { drawLabel } = getNextDrawForGame(selectedGame);

    const availableTabs = useMemo((): BetType[] => {
        if (selectedGame.bet_type === 'open') {
            return ['1D Open Quick'];
        }
        if (selectedGame.bet_type === 'close') {
            return ['1D Close Quick'];
        }
        return ['2D Bulk', '2D Quick', '2D Combo', '1D Open Quick', '1D Close Quick'];
    }, [selectedGame]);

    useEffect(() => {
        if (!availableTabs.includes(activeTab)) {
            setActiveTab(availableTabs[0]);
        }
    }, [availableTabs, activeTab]);

    const renderBettingForm = () => {
        switch(activeTab) {
            case '2D Quick': return <QuickBetForm gameType="2D" drawLabel={drawLabel} />;
            case '2D Bulk': return <BulkBetForm drawLabel={drawLabel} />;
            case '2D Combo': return <ComboBetForm drawLabel={drawLabel} />;
            case '1D Open Quick': return <QuickBetForm gameType="1D-Open" drawLabel={drawLabel} />;
            case '1D Close Quick': return <QuickBetForm gameType="1D-Close" drawLabel={drawLabel} />;
            default: return <p className="text-center text-text-secondary">This feature is coming soon.</p>;
        }
    };
    
    return (
        <MainLayout title="Place Your Bet" showBackButton titleClassName="text-accent-primary text-shadow-glow-primary">
            <div className="relative">
                <BetInfoPanel />
                 <div className="mb-6 max-w-sm">
                    <label htmlFor="game-select" className="block text-text-secondary mb-2 font-semibold">Select Game</label>
                    <select 
                        id="game-select" 
                        value={selectedGame.name} 
                        onChange={(e) => setSelectedGame(TIMING_GAMES.find(g => g.name === e.target.value)!)}
                        className="transition-all duration-300 w-full p-3 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-text-primary text-lg"
                    >
                        {TIMING_GAMES.map(game => (
                            <option key={game.name} value={game.name}>
                                {game.name} ({formatDisplayTime(game.time)})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex border-b border-border-color mb-6 overflow-x-auto">
                    {availableTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-4 font-semibold transition-colors duration-300 whitespace-nowrap relative ${activeTab === tab ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-full"></div>}
                        </button>
                    ))}
                </div>
                <div className="mt-6">
                    {renderBettingForm()}
                </div>
            </div>
        </MainLayout>
    );
};

const getInputClass = (hasError: boolean) => 
    `transition-all duration-300 shadow-inner appearance-none border rounded-lg w-full py-3 px-4 bg-background-primary border-border-color text-text-primary leading-tight focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent ${hasError ? 'border-danger/50 ring-2 ring-danger/30' : ''}`;


const QuickBetForm: React.FC<{gameType: '2D' | '1D-Open' | '1D-Close'; drawLabel: string}> = ({gameType, drawLabel}) => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [numbers, setNumbers] = useState('');
    const [stake, setStake] = useState('');
    const [errors, setErrors] = useState<{ numbers?: string; stake?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [betsToConfirm, setBetsToConfirm] = useState<Omit<Bet, 'id' | 'created_at' | 'status'>[]>([]);

    const numberLength = gameType === '2D' ? 2 : 1;
    
    const numberEntries = useMemo(() => numbers.trim().split(/[,\s]+/).filter(Boolean), [numbers]);
    const stakeValue = useMemo(() => parseFloat(stake), [stake]);

    const betCount = numberEntries.length;
    const totalStake = betCount * (stakeValue > 0 ? stakeValue : 0);

    const validate = () => {
        const newErrors: { numbers?: string; stake?: string } = {};
        
        const numberEntries = numbers.trim().split(/[,\s]+/).filter(Boolean);
        if (numbers.trim() && numberEntries.length > 0) {
            const invalidNumber = numberEntries.some(num => !/^\d+$/.test(num) || num.length !== numberLength);
            if (invalidNumber) {
                newErrors.numbers = `All entries must be valid ${numberLength}-digit numbers.`;
            }
        }

        const stakeValue = parseFloat(stake);
        if (stake.trim() && (isNaN(stakeValue) || stakeValue <= 0)) {
            newErrors.stake = 'Stake must be a positive number.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const digitsOnly = inputValue.replace(/\D/g, '');
        let formattedValue = '';

        if (gameType === '2D') {
            formattedValue = digitsOnly.match(/.{1,2}/g)?.join(',') ?? '';
        } else { // For 1D-Open and 1D-Close
            formattedValue = digitsOnly.split('').join(',');
        }
        
        setNumbers(formattedValue);

        if (errors.numbers) validate();
    };
    
    const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStake(e.target.value);
        if (errors.stake) validate();
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!validate()) return;
        
        if (!user) {
            addNotification('You must be logged in to place a bet.', 'error');
            return;
        }

        const numberEntries = numbers.trim().split(/[,\s]+/).filter(Boolean);
        const stakeValue = parseFloat(stake);

        if (numberEntries.length === 0 || !stakeValue || stakeValue <= 0) {
            addNotification('Please enter valid numbers and a stake.', 'error');
            return;
        }

        const betsToPlace: Omit<Bet, 'id' | 'created_at' | 'status'>[] = numberEntries.map(num => ({
            user_id: user.id,
            draw_label: drawLabel,
            game_type: gameType,
            number: num,
            stake: stakeValue,
        }));
        
        setBetsToConfirm(betsToPlace);
        setIsConfirming(true);
    };

    const handleConfirmBet = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const placedBets = await placeBets(user.id, betsToConfirm);
            addNotification(`Successfully placed ${placedBets.length} bet(s).`, 'success');
            setNumbers('');
            setStake('');
            setErrors({});
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to place bets. Please try again.';
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
            setIsConfirming(false);
            setBetsToConfirm([]);
        }
    };

    const handleCancelBet = () => {
        setIsConfirming(false);
        setBetsToConfirm([]);
    };
    
    const handleClear = () => {
        setNumbers('');
        setStake('');
        setErrors({});
    };

    const isConfirmDisabled = isLoading || betCount === 0 || !(stakeValue > 0) || !!errors.numbers || !!errors.stake;

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto pb-32">
                <div>
                    <label className="block text-text-secondary mb-2" htmlFor="quick-numbers">Numbers (separated by space or comma)</label>
                    <input
                        id="quick-numbers"
                        type="text"
                        value={numbers}
                        onChange={handleNumberChange}
                        onBlur={validate}
                        className={getInputClass(!!errors.numbers)}
                        placeholder={`e.g., ${numberLength === 2 ? '12,34,56' : '1,2,3'}`}
                        aria-invalid={!!errors.numbers}
                        aria-describedby="numbers-error"
                    />
                    {errors.numbers && <p id="numbers-error" className="text-danger mt-1 text-sm">{errors.numbers}</p>}
                </div>
                <div>
                    <label className="block text-text-secondary mb-2" htmlFor="quick-stake">Stake per Number</label>
                    <input
                        id="quick-stake"
                        type="number"
                        value={stake}
                        onChange={handleStakeChange}
                        onBlur={validate}
                        className={getInputClass(!!errors.stake)}
                        placeholder="e.g., 10"
                        aria-invalid={!!errors.stake}
                        aria-describedby="stake-error"
                    />
                    {errors.stake && <p id="stake-error" className="text-danger mt-1 text-sm">{errors.stake}</p>}
                </div>
            </form>
            <BetSlipSummary
                betCount={betCount}
                totalStake={totalStake}
                onConfirm={() => handleSubmit()}
                onClear={handleClear}
                isConfirmDisabled={isConfirmDisabled}
            />
            <ConfirmationDialog
                isOpen={isConfirming}
                onConfirm={handleConfirmBet}
                onCancel={handleCancelBet}
                title="Confirm Your Bet"
                isLoading={isLoading}
            >
                <p className="mb-4 text-text-secondary">Please review your bet details for <strong className="text-accent-primary">{drawLabel}</strong> before confirming:</p>
                <div className="space-y-2 bg-background-primary p-4 rounded-lg border border-border-color max-h-60 overflow-y-auto">
                    {betsToConfirm.map((bet, index) => (
                        <div key={index} className="flex justify-between items-center">
                            <span><strong>{bet.game_type}</strong> on number <strong className="text-accent-primary font-mono">{bet.number}</strong></span>
                            <span>Stake: <strong className="text-text-primary font-mono">{formatCurrency(bet.stake)}</strong></span>
                        </div>
                    ))}
                </div>
                <div className="text-right mt-4 font-bold">
                    Total Stake: <span className="text-accent-primary">{formatCurrency(betsToConfirm.reduce((acc, bet) => acc + bet.stake, 0))}</span>
                </div>
            </ConfirmationDialog>
        </>
    );
}

const BulkBetForm: React.FC<{drawLabel: string}> = ({drawLabel}) => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [numberBlock, setNumberBlock] = useState('');
    const [errors, setErrors] = useState<{ numberBlock?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [betsToConfirm, setBetsToConfirm] = useState<Omit<Bet, 'id' | 'created_at' | 'status'>[]>([]);

    const parsedResult = useMemo(() => {
        const lines = numberBlock.trim().split(/[\r\n]+/);
        const validBets: { number: string; stake: number }[] = [];
        let invalidEntries: string[] = [];
    
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return; 
    
            const tokens = trimmedLine.split(/[,\s]+/).filter(Boolean);
            
            // Handle ambiguous lines like "12 34 67 89" by flagging them as invalid.
            // A line with just two 2-digit numbers (e.g., "12 30") is allowed as a shorthand for number and stake.
            const allTokensArePureTwoDigitNumbers = tokens.every(t => /^\d{2}$/.test(t));
            if (allTokensArePureTwoDigitNumbers && tokens.length > 2) {
                invalidEntries.push(trimmedLine);
                return; // Mark as invalid and skip to next line
            }
    
            if (tokens.length < 2) {
                invalidEntries.push(trimmedLine);
                return;
            }
    
            const potentialStakeToken = tokens.pop()!;
            const stakeMatch = potentialStakeToken.match(/^(?:r(\d+)|(\d+)(?:rs?)?)$/i);
    
            if (!stakeMatch) {
                invalidEntries.push(trimmedLine);
                return;
            }
            
            const stakeAmountStr = stakeMatch[1] || stakeMatch[2];
            const stakeAmount = parseInt(stakeAmountStr, 10);
    
            if (isNaN(stakeAmount) || stakeAmount <= 0) {
                invalidEntries.push(trimmedLine);
                return;
            }
    
            const numberTokens = tokens;
            let currentLineNumbers: string[] = [];
            let hasInvalidToken = false;
    
            if (numberTokens.length === 0) {
                hasInvalidToken = true;
            } else {
                numberTokens.forEach(token => {
                    if (!/^\d+$/.test(token) || token.length % 2 !== 0) {
                        hasInvalidToken = true;
                    } else {
                        for (let i = 0; i < token.length; i += 2) {
                            currentLineNumbers.push(token.substring(i, i + 2));
                        }
                    }
                });
            }
    
            if (hasInvalidToken) {
                invalidEntries.push(trimmedLine);
                return;
            }
    
            currentLineNumbers.forEach(num => {
                validBets.push({ number: num, stake: stakeAmount });
            });
        });
    
        return { validBets, invalidEntries };
    }, [numberBlock]);

    const totalStake = useMemo(() => parsedResult.validBets.reduce((acc, b) => acc + b.stake, 0), [parsedResult.validBets]);
    const betCount = parsedResult.validBets.length;

    const validate = () => {
        const newErrors: { numberBlock?: string } = {};

        if (parsedResult.invalidEntries.length > 0) {
             newErrors.numberBlock = `Invalid format. For multiple numbers on one line, use a clear stake like 'r10' or '10rs'.`;
        } else if (numberBlock.trim() && parsedResult.validBets.length === 0) {
            newErrors.numberBlock = 'No valid bets could be parsed.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNumberBlockChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNumberBlock(e.target.value);
    };
    
    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!validate() || parsedResult.validBets.length === 0) {
            return;
        }

        if (!user) {
            addNotification('You must be logged in to place a bet.', 'error');
            return;
        }

        const betsToPlace: Omit<Bet, 'id' | 'created_at' | 'status'>[] = parsedResult.validBets.map(bet => ({
            user_id: user.id,
            draw_label: drawLabel,
            game_type: '2D',
            number: bet.number,
            stake: bet.stake,
        }));
        
        setBetsToConfirm(betsToPlace);
        setIsConfirming(true);
    };

    const handleConfirmBet = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const placedBets = await placeBets(user.id, betsToConfirm);
            addNotification(`Successfully placed ${placedBets.length} bet(s).`, 'success');
            setNumberBlock('');
            setErrors({});
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to place bets. Please try again.';
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
            setIsConfirming(false);
            setBetsToConfirm([]);
        }
    };

    const handleCancelBet = () => {
        setIsConfirming(false);
        setBetsToConfirm([]);
    };
    
    const handleClear = () => {
        setNumberBlock('');
        setErrors({});
    };

    const isConfirmDisabled = isLoading || betCount === 0 || parsedResult.invalidEntries.length > 0;
    
    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto pb-32">
                <div>
                    <label className="block text-text-secondary mb-2" htmlFor="bulk-numbers">
                        Number Block (one entry per line)
                    </label>
                    <textarea
                        id="bulk-numbers"
                        value={numberBlock}
                        onChange={handleNumberBlockChange}
                        onBlur={validate}
                        className={`${getInputClass(!!errors.numberBlock)} font-mono`}
                        rows={8}
                        placeholder={"e.g.,\n12 30\n12 34 67 r30\n14 25 r80\n11,22,33 5rs"}
                        aria-invalid={!!errors.numberBlock}
                        aria-describedby="number-block-error number-block-preview"
                    />
                     {errors.numberBlock && <p id="number-block-error" className="text-danger mt-1 text-sm">{errors.numberBlock}</p>}
                </div>

                <div id="number-block-preview" className="space-y-2">
                    <div className="flex justify-between text-text-secondary text-sm">
                        <span>Total Valid Bets: <span className="font-bold text-accent-primary text-base">{parsedResult.validBets.length}</span></span>
                        <span>Total Stake: <span className="font-bold text-accent-primary text-base">{formatCurrency(parsedResult.validBets.reduce((acc, b) => acc + b.stake, 0))}</span></span>
                    </div>

                    <div className="p-3 bg-background-primary border border-border-color rounded-lg max-h-48 overflow-y-auto text-sm">
                        <h4 className="text-text-secondary font-semibold mb-2 sr-only">Live Preview</h4>
                        {parsedResult.validBets.length > 0 && (
                             <ul className="space-y-1">
                                {parsedResult.validBets.map((bet, index) => (
                                    <li key={index} className="flex justify-between items-center bg-background-secondary/50 p-2 rounded">
                                        <span>Number: <span className="font-mono text-accent-primary font-bold">{bet.number}</span></span>
                                        <span>Stake: <span className="font-mono text-text-primary font-bold">{formatCurrency(bet.stake)}</span></span>
                                    </li>
                                ))}
                            </ul>
                        )}
                         {parsedResult.invalidEntries.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-danger/30">
                                <p className="text-danger font-semibold">Invalid entries found:</p>
                                <p className="font-mono text-danger/80 break-all">{parsedResult.invalidEntries.join(', ')}</p>
                            </div>
                        )}
                        {parsedResult.validBets.length === 0 && parsedResult.invalidEntries.length === 0 && (
                             <p className="text-text-secondary text-center py-4">Live preview of valid bets will appear here.</p>
                        )}
                    </div>
                </div>
            </form>
            <BetSlipSummary
                betCount={betCount}
                totalStake={totalStake}
                onConfirm={() => handleSubmit()}
                onClear={handleClear}
                isConfirmDisabled={isConfirmDisabled}
            />
            <ConfirmationDialog
                isOpen={isConfirming}
                onConfirm={handleConfirmBet}
                onCancel={handleCancelBet}
                title="Confirm Your Bulk Bet"
                isLoading={isLoading}
            >
                <p className="mb-4 text-text-secondary">Please review your bulk bet details for <strong className="text-accent-primary">{drawLabel}</strong>. You are placing <strong className="text-accent-primary">{betsToConfirm.length}</strong> bet(s).</p>
                <div className="space-y-2 bg-background-primary p-4 rounded-lg border border-border-color max-h-60 overflow-y-auto">
                    {betsToConfirm.map((bet, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                            <span><strong>2D</strong> on number <strong className="text-accent-primary font-mono">{bet.number}</strong></span>
                            <span>Stake: <strong className="text-text-primary font-mono">{formatCurrency(bet.stake)}</strong></span>
                        </div>
                    ))}
                </div>
                <div className="text-right mt-4 font-bold">
                    Total Bets: <span className="text-accent-primary">{betsToConfirm.length}</span>
                    <br />
                    Total Stake: <span className="text-accent-primary">{formatCurrency(betsToConfirm.reduce((acc, bet) => acc + bet.stake, 0))}</span>
                </div>
            </ConfirmationDialog>
        </>
    );
};

const ComboBetForm: React.FC<{drawLabel: string}> = ({drawLabel}) => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [inputDigits, setInputDigits] = useState('');
    const [stake, setStake] = useState('');
    const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<{ inputDigits?: string; stake?: string; selection?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [betsToConfirm, setBetsToConfirm] = useState<Omit<Bet, 'id' | 'created_at' | 'status'>[]>([]);

    const uniqueDigits = useMemo(() => [...new Set(inputDigits.replace(/\D/g, '').split(''))], [inputDigits]);

    const generatedCombos = useMemo(() => {
        if (uniqueDigits.length < 2) return [];
        const combos: string[] = [];
        for (let i = 0; i < uniqueDigits.length; i++) {
            for (let j = 0; j < uniqueDigits.length; j++) {
                if (i !== j) {
                    combos.push(uniqueDigits[i] + uniqueDigits[j]);
                }
            }
        }
        return combos.sort((a, b) => a.localeCompare(b));
    }, [uniqueDigits]);
    
    const stakeValue = useMemo(() => parseFloat(stake) || 0, [stake]);
    const betCount = selectedCombos.size;
    const totalStake = betCount * stakeValue;

    // Effect to prune selections if input changes
    useEffect(() => {
        const newSelected = new Set<string>();
        selectedCombos.forEach(combo => {
            if (generatedCombos.includes(combo)) {
                newSelected.add(combo);
            }
        });
        if (newSelected.size !== selectedCombos.size) {
            setSelectedCombos(newSelected);
        }
    }, [generatedCombos, selectedCombos]);

    const validate = () => {
        const newErrors: { inputDigits?: string; stake?: string; selection?: string } = {};
        
        if (inputDigits.trim()) {
            if (!/^\d+$/.test(inputDigits)) {
                newErrors.inputDigits = 'Only digits are allowed.';
            } else if (uniqueDigits.length < 2 || uniqueDigits.length > 6) {
                newErrors.inputDigits = 'Please enter 2 to 6 unique digits.';
            }
        }

        const stakeValue = parseFloat(stake);
        if (stake.trim() && (isNaN(stakeValue) || stakeValue <= 0)) {
            newErrors.stake = 'Stake must be a positive number.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSelectCombo = (combo: string) => {
        const newSelection = new Set(selectedCombos);
        if (newSelection.has(combo)) {
            newSelection.delete(combo);
        } else {
            newSelection.add(combo);
        }
        setSelectedCombos(newSelection);
        setErrors(prev => ({...prev, selection: undefined}));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCombos(new Set(generatedCombos));
        } else {
            setSelectedCombos(new Set());
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!validate()) return;
        
        if (!user) {
            addNotification('You must be logged in to place a bet.', 'error');
            return;
        }

        const stakeValue = parseFloat(stake);

        if (uniqueDigits.length < 2 || !stakeValue || stakeValue <= 0) {
            addNotification('Please enter unique digits and a valid stake.', 'error');
            return;
        }
        
        if (selectedCombos.size === 0) {
            setErrors(prev => ({...prev, selection: 'Please select at least one combination to bet on.'}));
            return;
        }

        const betsToPlace: Omit<Bet, 'id' | 'created_at' | 'status'>[] = Array.from(selectedCombos).map(combo => ({
            user_id: user.id,
            draw_label: drawLabel,
            game_type: '2D',
            number: combo,
            stake: stakeValue,
        }));
        
        setBetsToConfirm(betsToPlace);
        setIsConfirming(true);
    };

    const handleConfirmBet = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await placeBets(user.id, betsToConfirm);
            addNotification(`Successfully placed ${betsToConfirm.length} combo bet(s).`, 'success');
            setInputDigits('');
            setStake('');
            setSelectedCombos(new Set());
            setErrors({});
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to place combo bets. Please try again.';
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
            setIsConfirming(false);
            setBetsToConfirm([]);
        }
    };

    const handleCancelBet = () => {
        setIsConfirming(false);
        setBetsToConfirm([]);
    };
    
    const handleClear = () => {
        setInputDigits('');
        setStake('');
        setSelectedCombos(new Set());
        setErrors({});
    };
    
    const isAllSelected = generatedCombos.length > 0 && selectedCombos.size === generatedCombos.length;
    const isConfirmDisabled = isLoading || betCount === 0 || !(stakeValue > 0) || uniqueDigits.length < 2 || !!errors.inputDigits || !!errors.stake;

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto pb-32">
                <div>
                    <label className="block text-text-secondary mb-2" htmlFor="combo-digits">Enter 2 to 6 unique digits</label>
                    <input id="combo-digits" type="text" value={inputDigits} onChange={e => setInputDigits(e.target.value)} onBlur={validate} className={getInputClass(!!errors.inputDigits)} placeholder="e.g., 14528" maxLength={6} />
                    {errors.inputDigits && <p className="text-danger mt-1 text-sm">{errors.inputDigits}</p>}
                    {uniqueDigits.length > 0 && <p className="text-text-secondary mt-1 text-sm">Using unique digits: {uniqueDigits.join(', ')}</p>}
                </div>
                
                {generatedCombos.length > 0 && (
                    <div className="space-y-4 p-4 bg-background-primary border border-border-color rounded-lg">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-text-primary">Generated Combinations ({generatedCombos.length})</h3>
                            <div className="flex items-center">
                                <input type="checkbox" id="select-all" checked={isAllSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-accent-primary focus:ring-accent-primary bg-background-secondary"/>
                                <label htmlFor="select-all" className="ml-2 block text-sm text-text-secondary">Select All</label>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                            {generatedCombos.map(combo => (
                                <div key={combo} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`combo-${combo}`}
                                        checked={selectedCombos.has(combo)}
                                        onChange={() => handleSelectCombo(combo)}
                                        className="h-4 w-4 rounded border-gray-300 text-accent-primary focus:ring-accent-primary bg-background-secondary"
                                    />
                                    <label htmlFor={`combo-${combo}`} className="ml-2 font-mono text-text-primary">{combo}</label>
                                </div>
                            ))}
                        </div>
                         {errors.selection && <p className="text-danger mt-1 text-sm">{errors.selection}</p>}
                    </div>
                )}
                
                <div>
                    <label className="block text-text-secondary mb-2" htmlFor="combo-stake">Stake per Combination</label>
                    <input id="combo-stake" type="number" value={stake} onChange={e => setStake(e.target.value)} onBlur={validate} className={getInputClass(!!errors.stake)} placeholder="e.g., 10" />
                    {errors.stake && <p className="text-danger mt-1 text-sm">{errors.stake}</p>}
                </div>

                <div className="text-right font-bold text-text-secondary">
                    Total Bets: <span className="text-accent-primary">{selectedCombos.size}</span>
                    <br />
                    Total Stake: <span className="text-accent-primary">{formatCurrency(selectedCombos.size * (parseFloat(stake) || 0))}</span>
                </div>
            </form>
            <BetSlipSummary
                betCount={betCount}
                totalStake={totalStake}
                onConfirm={() => handleSubmit()}
                onClear={handleClear}
                isConfirmDisabled={isConfirmDisabled}
            />
            <ConfirmationDialog
                isOpen={isConfirming}
                onConfirm={handleConfirmBet}
                onCancel={handleCancelBet}
                title="Confirm Your Combo Bet"
                isLoading={isLoading}
            >
                <p className="mb-4 text-text-secondary">You are placing <strong className="text-accent-primary">{betsToConfirm.length}</strong> bet(s) for <strong className="text-accent-primary">{drawLabel}</strong>. Please review:</p>
                <div className="space-y-2 bg-background-primary p-4 rounded-lg border border-border-color max-h-60 overflow-y-auto">
                    {betsToConfirm.map((bet, index) => (
                        <div key={index} className="flex justify-between items-center">
                            <span><strong>2D</strong> on number <strong className="text-accent-primary font-mono">{bet.number}</strong></span>
                            <span>Stake: <strong className="text-text-primary font-mono">{formatCurrency(bet.stake)}</strong></span>
                        </div>
                    ))}
                </div>
                <div className="text-right mt-4 font-bold">
                    Total Stake: <span className="text-accent-primary">{formatCurrency(betsToConfirm.reduce((acc, bet) => acc + bet.stake, 0))}</span>
                </div>
            </ConfirmationDialog>
        </>
    );
};

export default BettingPage;