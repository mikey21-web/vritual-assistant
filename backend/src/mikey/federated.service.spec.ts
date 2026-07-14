import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FederatedService } from './federated.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FederatedService — DP noise math (unit)', () => {
  let service: FederatedService;

  const mockPrisma = () => ({
    federatedOptIn: {
      findUnique: jest.fn().mockResolvedValue({ optedIn: true }),
      upsert: jest.fn().mockResolvedValue({}),
    },
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FederatedService,
        { provide: PrismaService, useValue: mockPrisma() },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();
    service = module.get<FederatedService>(FederatedService);
  });

  describe('Privacy boundary asserts', () => {
    it('has DP epsilon and cohort threshold constants', () => {
      expect((service as any).EPSILON).toBe(0.5);
      expect((service as any).MIN_COHORT_SIZE).toBe(5);
    });

    it('push to aggregator returns false when no URL configured', async () => {
      const result = await service.pushToAggregator('test-tenant');
      expect(result).toBe(false);
    });

    it('laplace noise is non-zero and symmetric', () => {
      const samples: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const noise = (service as any).sampleLaplace(0, 2);
        samples.push(noise);
      }
      const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
      // Mean of Laplace(0, 2) should be near 0
      expect(Math.abs(mean)).toBeLessThan(0.5);
      // Some samples should be positive, some negative
      expect(samples.some(s => s > 0)).toBe(true);
      expect(samples.some(s => s < 0)).toBe(true);
    });

    it('suppression sets value to 0 and noise to -1', () => {
      const low = (service as any).addLaplaceNoise({ metric: 'test', value: 50, count: 2, noise: 0 });
      expect(low.value).toBe(0);
      expect(low.noise).toBe(-1);

      const sufficient = (service as any).addLaplaceNoise({ metric: 'test', value: 50, count: 10, noise: 0 });
      expect(sufficient.noise).not.toBe(-1);
      expect(sufficient.value).toBeGreaterThanOrEqual(0);
    });
  });
});
