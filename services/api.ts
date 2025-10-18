
import { User, UserRole, Bet, DrawResult, Transaction, Commission, Prize, TopUpRequest } from '../types';

const API_BASE_URL = '/api';

// --- Helper for API requests ---
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        // Handle cases with no response body (e.g., 204 No Content)
        if (response.status === 204) {
            return null as T;
        }
        return await response.json() as T;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// --- Auth ---
export const apiLogin = async (role: UserRole, username: string, pin: string): Promise<User> => {
    return apiRequest<User>('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, pin })
    });
};

// --- Public Data ---
export const fetchAllResults = (): Promise<DrawResult[]> => apiRequest('/results');

// --- User-Specific Data ---
export const fetchBetHistory = (userId: string): Promise<Bet[]> => apiRequest(`/users/${userId}/bets`);
export const fetchTransactionHistory = (userId: string): Promise<Transaction[]> => apiRequest(`/users/${userId}/transactions`);
export const placeBets = (betsToPlace: Omit<Bet, 'id' | 'createdAt' | 'status'>[]): Promise<Bet[]> => {
    return apiRequest('/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betsToPlace)
    });
};

// --- Admin-Specific Actions ---
export const fetchAllUsers = (admin: User): Promise<User[]> => {
    return apiRequest('/admin/users', { headers: { 'x-user-role': admin.role }});
};
export const fetchAllDealers = (admin: User): Promise<User[]> => {
    return apiRequest('/admin/dealers', { headers: { 'x-user-role': admin.role }});
};
export const addDealer = (admin: User, dealerData: Partial<User> & { username: string, initialDeposit: number }): Promise<User> => {
    return apiRequest('/admin/dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': admin.role },
        body: JSON.stringify(dealerData)
    });
};
export const addCreditToDealer = (admin: User, dealerId: string, amount: number): Promise<User> => {
    return apiRequest(`/admin/dealers/${dealerId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': admin.role },
        body: JSON.stringify({ amount })
    });
};
export const addCreditToUserByAdmin = (admin: User, userId: string, amount: number): Promise<void> => {
    return apiRequest(`/admin/users/${userId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': admin.id, 'x-user-role': admin.role },
        body: JSON.stringify({ amount })
    });
};
export const declareDraw = (admin: User, drawLabel: string, winningNumbers: { twoD?: string; oneDOpen?: string; oneDClose?: string; }): Promise<DrawResult> => {
    return apiRequest('/admin/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': admin.role },
        body: JSON.stringify({ drawLabel, winningNumbers })
    });
};
export const fetchPendingCommissions = (admin: User): Promise<Commission[]> => apiRequest('/admin/commissions/pending', { headers: { 'x-user-role': admin.role }});
export const approveCommission = (admin: User, id: string): Promise<void> => apiRequest(`/admin/commissions/${id}/approve`, { method: 'POST', headers: { 'x-user-role': admin.role }});
export const fetchPendingPrizes = (admin: User): Promise<Prize[]> => apiRequest('/admin/prizes/pending', { headers: { 'x-user-role': admin.role }});
export const approvePrize = (admin: User, id: string): Promise<void> => apiRequest(`/admin/prizes/${id}/approve`, { method: 'POST', headers: { 'x-user-role': admin.role }});
export const fetchPendingTopUps = (admin: User): Promise<TopUpRequest[]> => apiRequest('/admin/top-ups/pending', { headers: { 'x-user-role': admin.role }});
export const approveTopUp = (admin: User, requestId: string): Promise<void> => apiRequest(`/admin/top-ups/${requestId}/approve`, { method: 'POST', headers: { 'x-user-role': admin.role }});
export const debitFundsByAdmin = (admin: User, targetUserId: string, amount: number): Promise<void> => {
    return apiRequest('/admin/debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': admin.id, 'x-user-role': admin.role },
        body: JSON.stringify({ targetUserId, amount })
    });
};

// --- Dealer-Specific Actions ---
export const fetchUsersByDealer = (dealer: User): Promise<User[]> => {
    return apiRequest('/dealer/users', { headers: { 'x-user-id': dealer.id, 'x-user-role': dealer.role }});
};
export const fetchUserById = (actor: User, userId: string): Promise<User> => {
    // This can be called by dealer or admin
    return apiRequest(`/users/${userId}`, { headers: { 'x-user-role': actor.role } });
};
// FIX: Modified function to be callable by both Admins (who specify a dealerId) and Dealers (who don't).
export const addUser = (actor: User, userData: Partial<User> & { username: string, initialDeposit: number, dealerId?: string }): Promise<User> => {
    // Admin must provide dealerId in the userData. For dealers, the API infers it from the auth header.
    const body = { ...userData };
    if (actor.role === UserRole.ADMIN && userData.dealerId) {
        body.dealerId = userData.dealerId;
    }

    // Admins will post to a different endpoint, while dealers use their own.
    const endpoint = actor.role === UserRole.ADMIN ? '/admin/users' : '/dealer/users';

    return apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': actor.id, 'x-user-role': actor.role },
        body: JSON.stringify(body)
    });
};
export const addCreditToUser = (dealer: User, userId: string, amount: number): Promise<void> => {
    return apiRequest(`/dealer/users/${userId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': dealer.id, 'x-user-role': dealer.role },
        body: JSON.stringify({ amount })
    });
};
export const fetchBetsByDealer = (dealer: User): Promise<Bet[]> => {
    return apiRequest('/dealer/bets', { headers: { 'x-user-id': dealer.id, 'x-user-role': dealer.role }});
};
export const apiRequestTopUp = (dealer: User, amount: number, reference: string): Promise<TopUpRequest> => {
    return apiRequest('/dealer/top-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': dealer.id, 'x-user-role': dealer.role },
        body: JSON.stringify({ amount, reference })
    });
};
export const fetchPendingCommissionsForDealer = (dealer: User): Promise<Commission[]> => {
    return apiRequest('/dealer/commissions/pending', { headers: { 'x-user-id': dealer.id, 'x-user-role': dealer.role }});
};

// FIX: Uncommented updateUserBetLimit as it is now used in the UI.
export const updateUserBetLimit = (dealer: User, userId: string, limit: number | null): Promise<User> => {
    return apiRequest(`/dealer/users/${userId}/bet-limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': dealer.id, 'x-user-role': dealer.role },
        body: JSON.stringify({ limit })
    });
};


// --- Functions for Realtime Polling ---
export const fetchAllUsersState = (): Promise<User[]> => apiRequest('/internal/state/users');
export const fetchAllBetsState = (): Promise<Bet[]> => apiRequest('/internal/state/bets');
export const fetchAllDrawsState = (): Promise<DrawResult[]> => apiRequest('/internal/state/draws');
