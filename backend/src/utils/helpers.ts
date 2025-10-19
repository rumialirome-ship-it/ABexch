import { User } from '../types';

/**
 * Generates a unique, prefixed ID.
 * e.g., 'bet_k29x1y3z9a'
 */
export const generateId = (prefix: string): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}${randomPart}`;
};

/**
 * Removes the 'password' property from a user object.
 */
export const stripPassword = <T extends User | undefined>(user: T): Omit<T, 'password'> => {
    if (!user) return user as Omit<T, 'password'>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<T, 'password'>;
};

/**
 * Removes the 'password' property from an array of user objects.
 */
export const stripPasswords = (users: User[]): Omit<User, 'password'>[] => {
    return users.map(user => stripPassword(user));
};
