import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Response } from 'express';

interface TokenPayload {
  userId: string;
  role: 'admin' | 'moderator';
}

/**
 * Generate JWT token
 */
export const generateToken = (payload: TokenPayload): string => {
  const secret: Secret = process.env.JWT_SECRET as string;
  const options: SignOptions = {
    expiresIn: '7d',
  };
  return jwt.sign(payload, secret, options);
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
  } catch {
    return null;
  }
};

/**
 * Set JWT cookie in response
 */
export const setTokenCookie = (res: Response, token: string): void => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const days = parseInt(expiresIn.replace('d', ''), 10) || 7;

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: days * 24 * 60 * 60 * 1000, // Convert days to milliseconds
  });
};

/**
 * Clear JWT cookie
 */
export const clearTokenCookie = (res: Response): void => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
  });
};
