
import { User, UserRole, Bet, BetStatus, DrawResult, Transaction, TransactionType, Commission, Prize, TopUpRequest, GameType } from './types';

// In-memory data store
let MOCK_USERS: User[] = [
  { id: 'admin1', username: 'Guru', role: UserRole.ADMIN, walletBalance: 999999, phone: '5555555555', password: 'Pak@4545' },
];

let MOCK_BETS: Bet[] = [];
let MOCK_DRAWS: DrawResult[] = [];
let MOCK_TRANSACTIONS: Transaction[] = [];
let MOCK_COMMISSIONS: Commission[] = [];
let MOCK_PRIZES: Prize[] = [];
let MOCK_TOP_UPS: TopUpRequest[] = [];

// --- Data Access Functions ---

export const db = {
  // Read-only access for polling
  getAllUsers: () => MOCK_USERS,
  getAllBets: () => MOCK_BETS,
  getAllDraws: () => MOCK_DRAWS,
  
  findUserForLogin: (role: UserRole, username: string, pin: string): User | undefined => {
    const user = MOCK_USERS.find(u => u.role === role && u.username === username);
    if (!user) return undefined;

    const hasCustomPassword = user.password && user.password.length > 0;
    if (hasCustomPassword) {
      return pin === user.password ? user : undefined;
    } else {
      const isDefaultUserPin = role === UserRole.USER && pin === 'Pak@123';
      const isDefaultNonUserPin = role !== UserRole.USER && pin === 'Admin@123';
      return (isDefaultUserPin || isDefaultNonUserPin) ? user : undefined;
    }
  },

  getDrawResults: () => [...MOCK_DRAWS],
  
  getBetHistory: (userId: string) => MOCK_BETS.filter(b => b.userId === userId),
  
  getTransactionHistory: (userId: string) => MOCK_TRANSACTIONS.filter(t => t.userId === userId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  placeBets: (betsToPlace: Omit<Bet, 'id' | 'createdAt' | 'status'>[]): Bet[] => {
    const user = MOCK_USERS.find(u => u.id === betsToPlace[0].userId);
    if (!user) throw new Error("User not found");
    const totalStake = betsToPlace.reduce((acc, bet) => acc + bet.stake, 0);
    if (user.walletBalance < totalStake) throw new Error("Insufficient wallet balance.");

    const placedBets: Bet[] = [];
    betsToPlace.forEach(b => {
      const newBet: Bet = { ...b, id: `b${Date.now()}${Math.random()}`, createdAt: new Date().toISOString(), status: BetStatus.PENDING };
      MOCK_BETS.push(newBet);
      placedBets.push(newBet);
      const transaction: Transaction = { id: `t${Date.now()}${Math.random()}`, userId: b.userId, type: TransactionType.BET_PLACED, amount: b.stake, balanceChange: -b.stake, relatedEntityId: newBet.id, createdAt: new Date().toISOString() };
      MOCK_TRANSACTIONS.push(transaction);
    });
    user.walletBalance -= totalStake;
    return placedBets;
  },

  getUsersByRole: (role: UserRole) => MOCK_USERS.filter(u => u.role === role),
  
  getUsersByDealer: (dealerId: string) => MOCK_USERS.filter(u => u.role === UserRole.USER && u.dealerId === dealerId),

  getUserById: (userId: string) => MOCK_USERS.find(u => u.id === userId),

  addUser: (dealerId: string, userData: Partial<User> & { username: string, initialDeposit: number }): User => {
    const dealer = MOCK_USERS.find(u => u.id === dealerId && u.role === UserRole.DEALER);
    if (!dealer && dealerId !== 'admin1') throw new Error("Invalid dealer ID"); // Allow admin to create user under a dealer
    if (userData.phone && MOCK_USERS.some(u => u.phone === userData.phone)) throw new Error("Phone number already in use.");
    
    const newUser: User = { id: `user${Date.now()}`, username: userData.username, phone: userData.phone, role: UserRole.USER, walletBalance: userData.initialDeposit, dealerId: dealerId, password: userData.password, city: userData.city, commissionRate: userData.commissionRate, prizeRate2D: userData.prizeRate2D, prizeRate1D: userData.prizeRate1D, betLimit2D: userData.betLimit2D, betLimit1D: userData.betLimit1D };
    MOCK_USERS.push(newUser);

    if (dealer && userData.initialDeposit > 0) {
        if (dealer.walletBalance < userData.initialDeposit) throw new Error("Dealer has insufficient funds.");
        dealer.walletBalance -= userData.initialDeposit;
        MOCK_TRANSACTIONS.push({ id: `t${Date.now()}${Math.random()}`, userId: dealer.id, type: TransactionType.DEALER_DEBIT_TO_USER, amount: userData.initialDeposit, balanceChange: -userData.initialDeposit, relatedEntityId: newUser.id, createdAt: new Date().toISOString() });
        MOCK_TRANSACTIONS.push({ id: `t${Date.now()}${Math.random()}`, userId: newUser.id, type: TransactionType.DEALER_CREDIT, amount: userData.initialDeposit, balanceChange: userData.initialDeposit, relatedEntityId: dealer.id, createdAt: new Date().toISOString() });
    }
    return newUser;
  },
  
  addDealer: (dealerData: Partial<User> & { username: string, initialDeposit: number }): User => {
    if (dealerData.phone && MOCK_USERS.some(u => u.phone === dealerData.phone)) throw new Error("Phone number already in use.");
    const newDealer: User = { id: `dealer${Date.now()}`, username: dealerData.username, phone: dealerData.phone, role: UserRole.DEALER, walletBalance: dealerData.initialDeposit, password: dealerData.password, city: dealerData.city, commissionRate: dealerData.commissionRate };
    MOCK_USERS.push(newDealer);
    if (dealerData.initialDeposit > 0) {
        MOCK_TRANSACTIONS.push({ id: `t${Date.now()}`, userId: newDealer.id, type: TransactionType.ADMIN_CREDIT, amount: dealerData.initialDeposit, balanceChange: dealerData.initialDeposit, createdAt: new Date().toISOString() });
    }
    return newDealer;
  },

  addCreditToUser: (actorId: string, targetUserId: string, amount: number, actorRole: UserRole) => {
      const targetUser = MOCK_USERS.find(u => u.id === targetUserId);
      if (!targetUser) throw new Error("Target user not found.");

      if (actorRole === UserRole.ADMIN) {
          targetUser.walletBalance += amount;
          MOCK_TRANSACTIONS.push({ id: `t${Date.now()}`, userId: targetUserId, type: TransactionType.ADMIN_CREDIT, amount, balanceChange: amount, relatedEntityId: actorId, createdAt: new Date().toISOString() });
      } else if (actorRole === UserRole.DEALER) {
          const dealer = MOCK_USERS.find(u => u.id === actorId);
          if (!dealer) throw new Error("Dealer not found.");
          if (dealer.walletBalance < amount) throw new Error("Dealer has insufficient funds.");
          dealer.walletBalance -= amount;
          targetUser.walletBalance += amount;
          MOCK_TRANSACTIONS.push({ id: `t${Date.now()}${Math.random()}`, userId: actorId, type: TransactionType.DEALER_DEBIT_TO_USER, amount, balanceChange: -amount, relatedEntityId: targetUserId, createdAt: new Date().toISOString() });
          MOCK_TRANSACTIONS.push({ id: `t${Date.now()}${Math.random()}`, userId: targetUserId, type: TransactionType.DEALER_CREDIT, amount, balanceChange: amount, relatedEntityId: actorId, createdAt: new Date().toISOString() });
      }
  },

  addCreditToDealer: (dealerId: string, amount: number) => {
    const dealer = MOCK_USERS.find(u => u.id === dealerId && u.role === UserRole.DEALER);
    if (!dealer) throw new Error("Dealer not found");
    dealer.walletBalance += amount;
    MOCK_TRANSACTIONS.push({ id: `t${Date.now()}`, userId: dealerId, type: TransactionType.ADMIN_CREDIT, amount, balanceChange: amount, createdAt: new Date().toISOString() });
    return dealer;
  },

  declareDraw, // Implemented below

  getPendingCommissions: () => MOCK_COMMISSIONS.filter(c => c.status === 'pending'),
  
  getPendingCommissionsForDealer: (dealerId: string) => MOCK_COMMISSIONS.filter(c => c.status === 'pending' && c.recipientId === dealerId),

  approveCommission: (id: string) => {
    const commission = MOCK_COMMISSIONS.find(c => c.id === id);
    if(commission && commission.status === 'pending') {
        commission.status = 'approved';
        const recipient = MOCK_USERS.find(u => u.id === commission.recipientId);
        if (recipient) {
            recipient.walletBalance += commission.amount;
            MOCK_TRANSACTIONS.push({ id: `t${Date.now()}`, userId: recipient.id, type: TransactionType.COMMISSION_PAYOUT, amount: commission.amount, balanceChange: commission.amount, relatedEntityId: commission.id, createdAt: new Date().toISOString() });
        }
    }
  },

  getPendingPrizes: () => MOCK_PRIZES.filter(p => p.status === 'pending'),

  approvePrize: (id: string) => {
    const prize = MOCK_PRIZES.find(p => p.id === id);
    if(prize && prize.status === 'pending') {
      prize.status = 'approved';
      const user = MOCK_USERS.find(u => u.id === prize.userId);
      if (user) {
        user.walletBalance += prize.amount;
        MOCK_TRANSACTIONS.push({ id: `t${Date.now()}`, userId: user.id, type: TransactionType.PRIZE_WON, amount: prize.amount, balanceChange: prize.amount, relatedEntityId: prize.betId, createdAt: new Date().toISOString() });
      }
    }
  },

  getBetsByDealer: (dealerId: string) => {
    const dealerUsers = MOCK_USERS.filter(u => u.dealerId === dealerId).map(u => u.id);
    return MOCK_BETS.filter(b => dealerUsers.includes(b.userId));
  },

  requestTopUp: (dealerId: string, amount: number, reference: string) => {
    const dealer = MOCK_USERS.find(u => u.id === dealerId);
    if (!dealer) throw new Error("Dealer not found");
    const newRequest: TopUpRequest = { id: `tu${Date.now()}`, dealerId, dealerUsername: dealer.username, amount, reference, status: 'pending', createdAt: new Date().toISOString() };
    MOCK_TOP_UPS.push(newRequest);
    return newRequest;
  },

  getPendingTopUps: () => MOCK_TOP_UPS.filter(t => t.status === 'pending'),
  
  approveTopUp: (requestId: string) => {
    const request = MOCK_TOP_UPS.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') throw new Error("Request not found or already processed");
    const dealer = MOCK_USERS.find(u => u.id === request.dealerId);
    if (!dealer) throw new Error("Dealer not found");
    request.status = 'approved';
    request.approvedAt = new Date().toISOString();
    dealer.walletBalance += request.amount;
    MOCK_TRANSACTIONS.push({ id: `t${Date.now()}`, userId: dealer.id, type: TransactionType.TOP_UP_APPROVED, amount: request.amount, balanceChange: request.amount, relatedEntityId: request.id, createdAt: new Date().toISOString() });
  },

  debitFunds: (targetUserId: string, amount: number, adminId: string) => {
    const targetUser = MOCK_USERS.find(u => u.id === targetUserId);
    if (!targetUser) throw new Error("Target user or dealer not found.");
    const admin = MOCK_USERS.find(u => u.id === adminId && u.role === UserRole.ADMIN);
    if (!admin) throw new Error("Admin not found.");
    if (targetUser.walletBalance < amount) throw new Error("Insufficient funds.");

    targetUser.walletBalance -= amount;
    admin.walletBalance += amount;
    MOCK_TRANSACTIONS.push({ id: `t${Date.now()}${Math.random()}`, userId: targetUserId, type: TransactionType.ADMIN_DEBIT_FROM_USER, amount, balanceChange: -amount, relatedEntityId: adminId, createdAt: new Date().toISOString() });
    MOCK_TRANSACTIONS.push({ id: `t${Date.now()}${Math.random()}`, userId: adminId, type: TransactionType.ADMIN_CREDIT_FROM_USER, amount, balanceChange: amount, relatedEntityId: targetUserId, createdAt: new Date().toISOString() });
  }
};


// --- Complex Business Logic ---

function declareDraw(
    drawLabel: string, 
    winningNumbers: { twoD?: string; oneDOpen?: string; oneDClose?: string; }
): DrawResult {
    let draw = MOCK_DRAWS.find(d => d.drawLabel === drawLabel);
    const isNewDraw = !draw;
    if (!draw) {
        draw = { id: `d${Date.now()}`, drawLabel, declaredAt: new Date().toISOString() };
    }

    const betTypesToSettle = new Set<GameType>();
    
    // Logic to update draw and determine which bet types to settle
    if (winningNumbers.twoD) {
        draw.twoDigit = winningNumbers.twoD;
        draw.oneDigitOpen = winningNumbers.twoD.charAt(0);
        draw.oneDigitClose = winningNumbers.twoD.charAt(1);
        draw.declaredAt = new Date().toISOString();
        betTypesToSettle.add('2D');
        betTypesToSettle.add('1D-Open');
        betTypesToSettle.add('1D-Close');
    } else if (winningNumbers.oneDOpen) {
        draw.oneDigitOpen = winningNumbers.oneDOpen;
        draw.openDeclaredAt = new Date().toISOString();
        betTypesToSettle.add('1D-Open');
    } else if (winningNumbers.oneDClose) {
        draw.oneDigitClose = winningNumbers.oneDClose;
        betTypesToSettle.add('1D-Close');
    }
    
    // Auto-complete 2D if both 1Ds are present
    if (draw.oneDigitOpen && draw.oneDigitClose && !draw.twoDigit) {
        draw.twoDigit = `${draw.oneDigitOpen}${draw.oneDigitClose}`;
        draw.declaredAt = new Date().toISOString();
        betTypesToSettle.add('2D');
    }

    // Settle bets
    const pendingBets = MOCK_BETS.filter(b => 
        b.drawLabel === drawLabel && 
        b.status === BetStatus.PENDING &&
        betTypesToSettle.has(b.gameType)
    );

    pendingBets.forEach(bet => {
        const user = MOCK_USERS.find(u => u.id === bet.userId);
        if (!user) {
            bet.status = BetStatus.LOST;
            return;
        }

        let isWin = false;
        let prizeMultiplier = 0;
        if (bet.gameType === '2D' && draw!.twoDigit === bet.number) {
            isWin = true; prizeMultiplier = user.prizeRate2D ?? 85;
        } else if (bet.gameType === '1D-Open' && draw!.oneDigitOpen === bet.number) {
            isWin = true; prizeMultiplier = user.prizeRate1D ?? 9.5;
        } else if (bet.gameType === '1D-Close' && draw!.oneDigitClose === bet.number) {
            isWin = true; prizeMultiplier = user.prizeRate1D ?? 9.5;
        }

        if (isWin) {
            bet.status = BetStatus.WON;
            const prizeAmount = bet.stake * prizeMultiplier;
            MOCK_PRIZES.push({ id: `p${Date.now()}${Math.random()}`, userId: bet.userId, betId: bet.id, drawLabel: bet.drawLabel, amount: prizeAmount, status: 'pending', createdAt: new Date().toISOString() });
        } else {
            bet.status = BetStatus.LOST;
        }
    });

    if (isNewDraw) { MOCK_DRAWS.push(draw); }
    
    if (draw.twoDigit) { // Calculate commissions only on final draw settlement
        calculateRebatesAndDealerCommissions(drawLabel);
    }

    return draw;
};


function calculateRebatesAndDealerCommissions(drawLabel: string) {
    // Prevent recalculation
    if (MOCK_COMMISSIONS.some(c => c.drawLabel === drawLabel)) return;

    const betsInDraw = MOCK_BETS.filter(b => b.drawLabel === drawLabel);
    if (betsInDraw.length === 0) return;

    // Calculate user rebates
    const userIds = [...new Set(betsInDraw.map(b => b.userId))];
    userIds.forEach(uid => {
        const user = MOCK_USERS.find(u => u.id === uid);
        if (user?.commissionRate) {
            const totalStake = betsInDraw.filter(b => b.userId === uid).reduce((sum, bet) => sum + bet.stake, 0);
            if (totalStake > 0) {
                const rebateAmount = totalStake * (user.commissionRate / 100);
                user.walletBalance += rebateAmount;
                MOCK_TRANSACTIONS.push({ id: `t${Date.now()}${Math.random()}`, userId: user.id, type: TransactionType.COMMISSION_REBATE, amount: rebateAmount, balanceChange: rebateAmount, relatedEntityId: drawLabel, createdAt: new Date().toISOString() });
            }
        }
    });

    // Calculate dealer commissions
    const dealers = MOCK_USERS.filter(u => u.role === UserRole.DEALER);
    dealers.forEach(dealer => {
        if (dealer.commissionRate) {
            const userIdsUnderDealer = new Set(MOCK_USERS.filter(u => u.dealerId === dealer.id).map(u => u.id));
            const totalStakeUnderDealer = betsInDraw.filter(b => userIdsUnderDealer.has(b.userId)).reduce((sum, bet) => sum + bet.stake, 0);
            if (totalStakeUnderDealer > 0) {
                const commissionAmount = totalStakeUnderDealer * (dealer.commissionRate / 100);
                MOCK_COMMISSIONS.push({ id: `c${Date.now()}${Math.random()}`, recipientId: dealer.id, recipientType: 'dealer', drawLabel, amount: commissionAmount, status: 'pending', createdAt: new Date().toISOString() });
            }
        }
    });
}
