import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../lib/errors';
import { RegisterInput, LoginInput } from './auth.schema';
import { env } from '../../config';

const REFRESH_TOKEN_PREFIX = 'rt:blacklist:';

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 7 * 86400;
  }
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('EMAIL_EXISTS', 'An account with this email already exists');
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw new BadRequestError('INVALID_CATEGORY', 'The specified category does not exist');
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      role: 'PARTNER',
      partner: {
        create: {
          name: input.name,
          city: input.city,
          phone: input.phone,
          address: input.address,
          categoryId: input.categoryId,
        },
      },
    },
    include: { partner: true },
  });

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    user: { id: user.id, email: user.email, role: user.role, partner: user.partner },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { partner: true },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === 'BLOCKED') {
    throw new UnauthorizedError('Your account has been blocked');
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      partner: user.partner,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshToken: string) {
  const blacklistKey = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
  if (redis) {
    try {
      const isBlacklisted = await redis.get(blacklistKey);
      if (isBlacklisted) {
        throw new UnauthorizedError('Token has been revoked');
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      // Redis unavailable: skip blacklist check so sessions keep working in dev
    }
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.status === 'BLOCKED') {
    throw new UnauthorizedError('Account not found or blocked');
  }

  const ttl = parseExpiryToSeconds(env.JWT_REFRESH_EXPIRY);
  if (redis) {
    try {
      await redis.set(blacklistKey, '1', 'EX', ttl);
    } catch {
      // rotation still succeeds; old token not blacklisted until Redis is back
    }
  }

  const payload = { userId: user.id, role: user.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
  if (!redis) return;

  const ttl = parseExpiryToSeconds(env.JWT_REFRESH_EXPIRY);
  try {
    await redis.set(`${REFRESH_TOKEN_PREFIX}${refreshToken}`, '1', 'EX', ttl);
  } catch {
    // best-effort blacklist
  }
}
