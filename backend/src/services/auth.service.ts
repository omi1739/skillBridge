import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, Profile } from '@skillbridge/types';
import { query, withTransaction } from '../db/client';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * JWT signing secret. Production MUST supply a strong value via JWT_SECRET;
 * boot fails fast if it is missing so tokens are not minted with a throwaway
 * key. In local/dev we fall back to an ephemeral random secret, which means
 * tokens only stay valid for the lifetime of a single server boot.
 */
const JWT_SECRET: string = ((): string => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set with a strong value in production.');
  }
  return crypto.randomBytes(48).toString('hex');
})();
const JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '7d';

export class AuthService {
  /** One-way hash a plaintext password with a random per-user salt (bcrypt). */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /** Compare a plaintext password against a stored bcrypt hash. */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /** Issue a signed JWT for a user. */
  public signToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /** Validate and decode a JWT. Returns null for any invalid/expired token. */
  public verifyToken(token: string): AuthPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      if (!decoded || typeof decoded.userId !== 'string') {
        return null;
      }
      return {
        userId: decoded.userId,
        email: typeof decoded.email === 'string' ? decoded.email : '',
        role: typeof decoded.role === 'string' ? decoded.role : 'USER'
      };
    } catch {
      return null;
    }
  }

  /** Create a new account: user + profile in a single transaction, returns token. */
  public async register(
    email: string,
    password: string,
    fullName: string,
    targetRoleId?: string,
    currentStatus?: string
  ): Promise<{ token: string; user: User; profile: Profile }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!this.isValidEmail(cleanEmail)) {
      throw new Error('Please provide a valid email address.');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!fullName || !fullName.trim()) {
      throw new Error('Full name is required.');
    }

    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [cleanEmail]
    );
    if (existing.length > 0) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const profileId = `profile_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(password);
    const status = currentStatus ? currentStatus.trim().toUpperCase() : undefined;

    const user: User = {
      id: userId,
      email: cleanEmail,
      role: 'USER',
      currentStatus: status as User['currentStatus'],
      provider: 'EMAIL',
      createdAt: now
    };
    const profile: Profile = {
      id: profileId,
      userId,
      fullName: fullName.trim(),
      targetRoleId,
      createdAt: now,
      updatedAt: now
    };

    await withTransaction(async client => {
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, current_status, provider, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)`,
        [userId, cleanEmail, passwordHash, 'USER', status || null, 'EMAIL', now, now]
      );
      await client.query(
        `INSERT INTO profiles (id, user_id, full_name, target_role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)`,
        [profileId, userId, profile.fullName, targetRoleId || null, now, now]
      );
    });

    const token = this.signToken({ userId, email: cleanEmail, role: 'USER' });
    return { token, user, profile };
  }

  /**
   * Google sign-in: given a verified Google profile, log in an existing account
   * (matched by email) or provision a new one. Passwords are never required.
   */
  public async registerOrLoginWithGoogle(
    profileInfo: {
      email: string;
      fullName: string;
      googleId: string;
    },
    currentStatus?: string
  ): Promise<{ token: string; user: User; profile: Profile; isNewUser: boolean }> {
    const cleanEmail = profileInfo.email.trim().toLowerCase();
    if (!this.isValidEmail(cleanEmail)) {
      throw new Error('Google account has no valid email address.');
    }

    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      const profile = await this.findProfile(existing.id);
      if (!profile) {
        throw new Error('User profile record not found.');
      }
      const token = this.signToken({ userId: existing.id, email: existing.email, role: existing.role });
      return { token, user: existing, profile, isNewUser: false };
    }

    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const profileId = `profile_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const status = currentStatus ? currentStatus.trim().toUpperCase() : undefined;

    const user: User = {
      id: userId,
      email: cleanEmail,
      role: 'USER',
      currentStatus: status as User['currentStatus'],
      googleId: profileInfo.googleId,
      provider: 'GOOGLE',
      createdAt: now
    };
    const profile: Profile = {
      id: profileId,
      userId,
      fullName: profileInfo.fullName.trim() || 'Google User',
      targetRoleId: undefined,
      createdAt: now,
      updatedAt: now
    };

    await withTransaction(async client => {
      await client.query(
        `INSERT INTO users (id, email, role, current_status, google_id, provider, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)`,
        [userId, cleanEmail, 'USER', status || null, profileInfo.googleId, 'GOOGLE', now, now]
      );
      await client.query(
        `INSERT INTO profiles (id, user_id, full_name, target_role_id, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, $5::timestamptz, $6::timestamptz)`,
        [profileId, userId, profile.fullName, now, now]
      );
    });

    const token = this.signToken({ userId, email: cleanEmail, role: 'USER' });
    return { token, user, profile, isNewUser: true };
  }

  /** Authenticate an existing user against stored bcrypt credentials. */
  public async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: User; profile: Profile }> {
    const cleanEmail = email.trim().toLowerCase();

    const rows = await query<any>('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (rows.length === 0) {
      throw new Error('Invalid email or password.');
    }

    const u = rows[0];
    const storedHash: string | null = u.password_hash;
    if (!storedHash || !(await this.verifyPassword(password, storedHash))) {
      throw new Error('Invalid email or password.');
    }

    const user = this.mapUserRow(u);
    const profile = await this.findProfile(user.id);
    if (!profile) {
      throw new Error('User profile record not found.');
    }

    const token = this.signToken({ userId: user.id, email: user.email, role: user.role });
    return { token, user, profile };
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    const rows = await query<any>('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (rows.length === 0) return undefined;
    return this.mapUserRow(rows[0]);
  }

  public async findProfile(userId: string): Promise<Profile | undefined> {
    const rows = await query<any>('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (rows.length === 0) return undefined;
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      fullName: rows[0].full_name,
      targetRoleId: rows[0].target_role_id || undefined,
      githubUrl: rows[0].github_url || undefined,
      portfolioUrl: rows[0].portfolio_url || undefined,
      bio: rows[0].bio || undefined,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at
    };
  }

  private mapUserRow(r: any): User {
    return {
      id: r.id,
      email: r.email,
      role: r.role,
      currentStatus: r.current_status || undefined,
      googleId: r.google_id || undefined,
      provider: r.provider || 'EMAIL',
      createdAt: r.created_at
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const authService = new AuthService();
