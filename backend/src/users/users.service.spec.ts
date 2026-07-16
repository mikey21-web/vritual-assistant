import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    phone: '+1234567890',
    role: 'SALES_AGENT',
    active: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockUsers = [
    mockUser,
    {
      id: 'user-2',
      name: 'Bob Jones',
      email: 'bob@example.com',
      phone: null,
      role: 'ADMIN',
      active: true,
      createdAt: new Date('2025-02-01T00:00:00Z'),
      updatedAt: new Date('2025-02-01T00:00:00Z'),
    },
  ];

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(mockUsers),
        findUnique: jest.fn().mockResolvedValue(mockUser),
        create: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockUser, ...data }),
        ),
        delete: jest.fn().mockResolvedValue(mockUser),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users with safe select (no passwords)', async () => {
      const users = await service.findAll();
      expect(users).toHaveLength(2);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          department: true,
          salaryType: true,
          monthlySalary: true,
          joinedDate: true,
          skills: true,
          annualLeaveQuota: true,
          teamStatus: true,
        },
      });
    });

    it('should never include password field', async () => {
      const users = await service.findAll();
      for (const user of users) {
        expect(user).not.toHaveProperty('password');
      }
    });

    it('should return empty array when no users exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      const users = await service.findAll();
      expect(users).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user with safe select', async () => {
      const user = await service.findOne('user-1');
      expect(user.name).toBe('Alice Smith');
      expect(user.role).toBe('SALES_AGENT');
      expect(user).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a user with hashed password and default role', async () => {
      const user = await service.create({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securePass123',
      });
      expect(user.name).toBe('Alice Smith');
      expect(bcrypt.hash).toHaveBeenCalledWith('securePass123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Alice Smith',
            email: 'alice@example.com',
            password: '$2a$12$hashedpassword',
            role: 'SALES_AGENT',
            active: true,
            tenant: { connect: { id: 'default-tenant' } },
          }),
          select: expect.objectContaining({ id: true, name: true }),
        }),
      );
    });

    it('should create a user with specified role when the caller is an OWNER', async () => {
      await service.create(
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'adminPass123',
          role: 'ADMIN',
        },
        { user: { role: 'OWNER' } },
      );
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('should refuse to create an ADMIN or OWNER account when the caller is not an OWNER', async () => {
      await expect(
        service.create(
          { name: 'Admin User', email: 'admin@example.com', password: 'adminPass123', role: 'ADMIN' },
          { user: { role: 'MANAGER' } },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set active to false when specified', async () => {
      await service.create({
        name: 'Inactive User',
        email: 'inactive@example.com',
        password: 'pass123',
        active: false,
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ active: false }),
        }),
      );
    });

    it('should throw BadRequestException when password is missing', async () => {
      await expect(
        service.create({
          name: 'No Password',
          email: 'nopass@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with empty password', async () => {
      await expect(
        service.create({
          name: 'Empty Password',
          email: 'empty@example.com',
          password: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, name: 'Alice Updated' });
      const user = await service.update('user-1', { name: 'Alice Updated' });
      expect(user.name).toBe('Alice Updated');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { name: 'Alice Updated' },
          select: expect.objectContaining({ id: true, name: true }),
        }),
      );
    });

    it('should re-hash password when updating it', async () => {
      await service.update('user-1', { password: 'newPassword456' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: '$2a$12$hashedpassword',
          }),
        }),
      );
    });

    it('should NOT re-hash password when not changing it', async () => {
      bcrypt.hash.mockClear();
      await service.update('user-1', { name: 'Just Name' });
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify user exists before updating', async () => {
      await service.update('user-1', { email: 'new@example.com' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });
  });

  describe('remove', () => {
    it('should delete an existing user', async () => {
      const user = await service.remove('user-1');
      expect(user.id).toBe('user-1');
      expect(prisma.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          select: expect.objectContaining({ id: true, name: true }),
        }),
      );
    });

    it('should select safe fields on delete', async () => {
      await service.remove('user-1');
      expect(prisma.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
            department: true,
            salaryType: true,
            monthlySalary: true,
            joinedDate: true,
            skills: true,
            annualLeaveQuota: true,
            teamStatus: true,
          },
        }),
      );
    });

    it('should throw NotFoundException when deleting non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should verify user exists before deleting', async () => {
      await service.remove('user-1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });
  });
});
