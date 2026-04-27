import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../types/index.js';

const require = createRequire(import.meta.url);
const pino = require('pino');

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'principal' | 'teacher';
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

export const authService = {
  async register(data: RegisterData): Promise<Omit<User, 'passwordHash'>> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      logger.info({ email: data.email }, 'Failed login attempt: user not found');
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      logger.info({ email: data.email }, 'Failed login attempt: invalid password');
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword,
    };
  },
};