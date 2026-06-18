import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    name: 'Test User',
    role: 'SALES_AGENT',
    active: true,
  };

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Tenant',
    key: 'test-tenant',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue(mockTenant),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('test-jwt-token'),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        tenantId: 'tenant-1',
      });

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('SALES_AGENT');
    });

    it('should reject duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'password123', name: 'Test', tenantId: 'tenant-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const hashed = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, password: hashed });

      const result = await service.login({ email: 'test@example.com', password: 'password123' });
      expect(result.accessToken).toBe('test-jwt-token');
    });

    it('should reject wrong password', async () => {
      const hashed = await bcrypt.hash('password123', 1);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, password: hashed });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    }, 10000);

    it('should reject non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
