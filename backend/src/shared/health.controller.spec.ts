import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('HealthController', () => {
  let controller: HealthController;

  const healthService = {
    shallow: jest.fn().mockResolvedValue({ status: 'ok', timestamp: '2025-01-01T00:00:00.000Z' }),
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      timestamp: '2025-01-01T00:00:00.000Z',
      checks: {
        database: 'connected',
        uptime: 123.4,
        memory: 45,
      },
    }),
    deep: jest.fn().mockResolvedValue({
      status: 'ok',
      timestamp: '2025-01-01T00:00:00.000Z',
      version: '1.0.0',
      uptime: 12345,
      dependencies: {
        database: { status: 'ok', latencyMs: 5 },
        redis: { status: 'ok', latencyMs: 2 },
      },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: healthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('should return shallow health status', async () => {
      const result = await controller.check();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(healthService.shallow).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health/live', () => {
    it('should return live status with timestamp', async () => {
      const result = controller.live();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('should have an ISO-8601 timestamp format', async () => {
      const result = controller.live();
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });
  });

  describe('GET /health/ready', () => {
    it('should return detailed readiness check', async () => {
      const result = await controller.ready();
      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe('connected');
      expect(result.checks.uptime).toBe(123.4);
      expect(healthService.check).toHaveBeenCalledTimes(1);
    });

    it('should report degraded when database is down', async () => {
      healthService.check.mockResolvedValue({
        status: 'degraded',
        timestamp: '2025-01-01T00:00:00.000Z',
        checks: {
          database: 'disconnected',
          uptime: 123.4,
          memory: 45,
        },
      });
      const result = await controller.ready();
      expect(result.status).toBe('degraded');
      expect(result.checks.database).toBe('disconnected');
    });
  });

  describe('GET /health/deep', () => {
    it('should return deep health report with dependencies', async () => {
      const result = await controller.deepCheck();
      expect(result.status).toBe('ok');
      expect(result.dependencies.database.status).toBe('ok');
      expect(result.dependencies.database.latencyMs).toBe(5);
      expect(result.dependencies.redis.status).toBe('ok');
      expect(healthService.deep).toHaveBeenCalledTimes(1);
    });

    it('should include version and uptime in deep report', async () => {
      const result = await controller.deepCheck();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });
});
