// Password hashing. bcryptjs works in Workers but is slow (~200ms at cost 12
// on Workers CPU). We accept that for now; profile later and consider Web
// Crypto scrypt once we have real load.

import bcrypt from 'bcryptjs';

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
export const hashPasswordSync = (plain: string) => bcrypt.hashSync(plain, 10);   // used only for backup codes
export const verifyPasswordSync = (plain: string, hash: string) => bcrypt.compareSync(plain, hash);
