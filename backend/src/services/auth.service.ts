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
 * A business-rule failure in the auth flow (bad credentials, conflicting
 * account, validation). The Nest layer maps this to `err.status` instead of
 * letting it fall through to the default exception filter as a 500 — a wrong
 * password must read 401, a duplicate signup 409, never "Internal Server
 * Error".
 */
export class AuthDomainError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AuthDomainError';
  }
}

/**
 * JWT signing secret. Production MUST supply a strong value via JWT_SECRET;
 * boot fails fast if it is missing so tokens are not minted with a throwaway
 * key. In local/dev we fall back to an ephemeral random secret, which means
 * tokens only stay valid for the lifetime of a single server boot.
 */
const JWT_SECRET: string = ((): string => {
  if (process.env.JWT_SECRET) {
    // Weak secrets are forgeable. Enforce a minimum length so tokens are never
    // minted with a guessable key (e.g. "secret", "changeme", "jwt_secret").
    const configured = process.env.JWT_SECRET;
    if (configured.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters.');
    }
    return configured;
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
      throw new AuthDomainError('Please provide a valid email address.', 400);
    }
    if (password.length < 8) {
      throw new AuthDomainError('Password must be at least 8 characters long.', 400);
    }
    if (!fullName || !fullName.trim()) {
      throw new AuthDomainError('Full name is required.', 400);
    }

    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [cleanEmail]
    );
    if (existing.length > 0) {
      throw new AuthDomainError('An account with this email address already exists.', 409);
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

    try {
      await withTransaction(async client => {
        await client.query(
          `INSERT INTO users (id, email, password_hash, role, current_status, provider, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::varchar, $6, $7::timestamptz, $8::timestamptz)`,
          [userId, cleanEmail, passwordHash, 'USER', status || null, 'EMAIL', now, now]
        );
        await client.query(
          `INSERT INTO profiles (id, user_id, full_name, target_role_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4::varchar, $5::timestamptz, $6::timestamptz)`,
          [profileId, userId, profile.fullName, targetRoleId || null, now, now]
        );
      });
    } catch (err: any) {
      // Two registrations racing on the same email: the pre-check above is not
      // atomic, so the DB unique constraint is the source of truth.
      if (err && err.code === '23505') {
        throw new AuthDomainError('An account with this email address already exists.', 409);
      }
      throw err;
    }

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
      picture?: string;
      emailVerified?: boolean;
    },
    currentStatus?: string
  ): Promise<{ token: string; user: User; profile: Profile; isNewUser: boolean }> {
    const cleanEmail = profileInfo.email.trim().toLowerCase();
    if (!this.isValidEmail(cleanEmail)) {
      throw new AuthDomainError('Google account has no valid email address.', 401);
    }

    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      // An email/password account may be linked to Google only when Google has
      // verified the address — that proves the caller owns the mailbox, so
      // granting access via the Google credential is safe (the password keeps
      // working too). An unverified Google email proves no ownership and must
      // never be able to take the account over.
      if (existing.provider === 'EMAIL') {
        if (!profileInfo.emailVerified) {
          throw new AuthDomainError('An account with this email already uses email/password. Sign in with your password.', 409);
        }
        if (existing.googleId && existing.googleId !== profileInfo.googleId) {
          throw new AuthDomainError('This email is already linked to a different Google account.', 409);
        }
        const linked = await this.linkGoogleIdentity(existing, profileInfo);
        return { token: linked.token, user: linked.user, profile: linked.profile, isNewUser: false };
      }
      if (existing.googleId && existing.googleId !== profileInfo.googleId) {
        throw new AuthDomainError('This email is already linked to a different Google account.', 409);
      }
      const profile = await this.findProfile(existing.id);
      if (!profile) {
        throw new Error('User profile record not found.');
      }
      if (profileInfo.picture && existing.avatarUrl !== profileInfo.picture) {
        await query(
          `UPDATE users SET avatar_url = $1, updated_at = $2::timestamptz WHERE id = $3`,
          [profileInfo.picture, new Date().toISOString(), existing.id]
        );
        existing.avatarUrl = profileInfo.picture;
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
      avatarUrl: profileInfo.picture,
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

    try {
      await withTransaction(async client => {
        // Cast nullable params explicitly so Postgres can infer their type even
        // when the value is NULL (e.g. no currentStatus / no avatar picture).
        // Without this, an untyped NULL in a multi-column VALUES insert raises
        // "42P18: could not determine data type of parameter" and aborts sign-in.
        await client.query(
          `INSERT INTO users (id, email, role, current_status, google_id, provider, avatar_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4::varchar, $5, $6, $7::varchar, $8::timestamptz, $9::timestamptz)`,
          [userId, cleanEmail, 'USER', status || null, profileInfo.googleId, 'GOOGLE', user.avatarUrl || null, now, now]
        );
        // Placeholders must run $1..$5 contiguously: PostgreSQL sizes the bind
        // to the HIGHEST $n in the statement, so a skipped index ($4) makes it
        // demand 6 parameters while 5 are supplied ("bind message supplies 5
        // parameters, but prepared statement requires 6") and the whole
        // Google sign-up transaction aborts. target_role_id stays a literal
        // NULL — untyped NULLs are fine, only parameters need the cast.
        await client.query(
          `INSERT INTO profiles (id, user_id, full_name, target_role_id, created_at, updated_at)
           VALUES ($1, $2, $3, NULL, $4::timestamptz, $5::timestamptz)`,
          [profileId, userId, profile.fullName, now, now]
        );
      });
    } catch (err: any) {
      // The email / google_id uniqueness race; surface a clean message.
      if (err && err.code === '23505') {
        throw new AuthDomainError('An account with this identity already exists. Sign in instead.', 409);
      }
      throw err;
    }

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
      throw new AuthDomainError('Invalid email or password.', 401);
    }

    const u = rows[0];
    const storedHash: string | null = u.password_hash;
    if (!storedHash || !(await this.verifyPassword(password, storedHash))) {
      throw new AuthDomainError('Invalid email or password.', 401);
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

  /** SHA-256 a reset token; only the hash is ever persisted. */
  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Begin a self-service password reset. Returns the plaintext token and user
   * when the email belongs to an account, or `undefined` when it does not — the
   * caller MUST respond identically either way to avoid account enumeration.
   * Any previously-issued, unused token for the user is invalidated first so
   * only the most recent link works.
   */
  public async createPasswordReset(
    email: string,
    ttlMs: number = 60 * 60 * 1000
  ): Promise<{ token: string; user: User } | undefined> {
    const user = await this.findUserByEmail(email);
    if (!user) return undefined;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    await withTransaction(async client => {
      await client.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3::timestamptz)`,
        [user.id, tokenHash, expiresAt]
      );
    });

    return { token, user };
  }

  /**
   * Complete a password reset. The token is consumed atomically (single-use,
   * unexpired) and every reset token for the user is cleared afterwards so no
   * other link can be replayed.
   */
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AuthDomainError('Password must be at least 8 characters long.', 400);
    }
    if (!token || token.length < 16) {
      throw new AuthDomainError('This password reset link is invalid or has expired.', 400);
    }

    const tokenHash = this.hashResetToken(token);
    const consumed = await query<{ user_id: string }>(
      `UPDATE password_reset_tokens
          SET used_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
        RETURNING user_id`,
      [tokenHash]
    );
    if (consumed.length === 0) {
      throw new AuthDomainError('This password reset link is invalid or has expired.', 400);
    }

    const userId = consumed[0].user_id;
    const newHash = await this.hashPassword(newPassword);
    await withTransaction(async client => {
      await client.query(
        `UPDATE users
            SET password_hash = $1, provider = COALESCE(provider, 'EMAIL'), updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [newHash, userId]
      );
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    });
  }

  /**
   * Link a verified Google identity onto an existing email/password account,
   * then issue a token. The provider stays EMAIL so the password keeps working;
   * only the `google_id`/avatar are recorded.
   */
  private async linkGoogleIdentity(
    existing: User,
    profileInfo: { googleId: string; picture?: string }
  ): Promise<{ token: string; user: User; profile: Profile }> {
    const profile = await this.findProfile(existing.id);
    if (!profile) {
      throw new Error('User profile record not found.');
    }
    const now = new Date().toISOString();
    await query(
      `UPDATE users
          SET google_id = $1, avatar_url = COALESCE($2, avatar_url), updated_at = $3::timestamptz
        WHERE id = $4`,
      [profileInfo.googleId, profileInfo.picture || null, now, existing.id]
    );
    existing.googleId = profileInfo.googleId;
    if (profileInfo.picture) existing.avatarUrl = profileInfo.picture;
    const token = this.signToken({ userId: existing.id, email: existing.email, role: existing.role });
    return { token, user: existing, profile };
  }

  /**
   * Change the signed-in user's password. A user who already has a password must
   * prove it; a Google-only user (no stored hash) may set one without a current
   * password so they gain email/password sign-in too.
   */
  public async changePassword(userId: string, currentPassword: string | undefined, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AuthDomainError('Password must be at least 8 characters long.', 400);
    }
    const rows = await query<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) {
      throw new AuthDomainError('User not found.', 404);
    }
    const storedHash = rows[0].password_hash;
    if (storedHash) {
      if (!currentPassword || !(await this.verifyPassword(currentPassword, storedHash))) {
        throw new AuthDomainError('Current password is incorrect.', 401);
      }
    }
    const newHash = await this.hashPassword(newPassword);
    await query(
      `UPDATE users
          SET password_hash = $1, provider = COALESCE(provider, 'EMAIL'), updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [newHash, userId]
    );
  }

  /**
   * Administrative password reset. Used to recover an account whose owner can no
   * longer sign in (there is no self-service email reset flow).
   */
  public async setPassword(userId: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AuthDomainError('Password must be at least 8 characters long.', 400);
    }
    const rows = await query<{ id: string }>(
      `UPDATE users
          SET password_hash = $1, provider = COALESCE(provider, 'EMAIL'), updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id`,
      [await this.hashPassword(newPassword), userId]
    );
    if (rows.length === 0) {
      throw new AuthDomainError('User not found.', 404);
    }
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
      avatarUrl: r.avatar_url || undefined,
      createdAt: r.created_at
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const authService = new AuthService();
