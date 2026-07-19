import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PartnerAuthService } from './partner-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('PartnerAuthService', () => {
  let service: PartnerAuthService;
  let prisma: any;

  const passwordHash = bcrypt.hashSync('correct-horse', 10);
  const partnerUser = { id: 'pu-1', tenantId: 't1', channelPartnerId: 'cp-1', email: 'partner@example.com', passwordHash, active: true };

  beforeEach(async () => {
    prisma = {
      channelPartner: { findFirst: jest.fn().mockResolvedValue({ id: 'cp-1', tenantId: 't1' }) },
      partnerPortalUser: {
        findUnique: jest.fn().mockResolvedValue(partnerUser),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pu-1', ...data })),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-token') } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(PartnerAuthService);
  });

  it('logs in with correct credentials and issues a partner-scoped token', async () => {
    const result = await service.login('partner@example.com', 'correct-horse');
    expect(result.accessToken).toBe('signed-token');
    expect(result.partner.channelPartnerId).toBe('cp-1');
  });

  it('rejects an incorrect password', async () => {
    await expect(service.login('partner@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a login for a deactivated partner account', async () => {
    prisma.partnerPortalUser.findUnique.mockResolvedValue({ ...partnerUser, active: false });
    await expect(service.login('partner@example.com', 'correct-horse')).rejects.toThrow(UnauthorizedException);
  });

  it('refuses to create a duplicate portal account for the same email', async () => {
    await expect(
      service.createPortalUser('t1', { channelPartnerId: 'cp-1', email: 'partner@example.com', password: 'newpass123' }),
    ).rejects.toThrow(ConflictException);
  });
});
