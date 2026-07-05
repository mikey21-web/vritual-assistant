import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { ConfigService } from '@nestjs/config';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('emit', () => {
    it('should emit an event without error', () => {
      mockConfigService.get.mockReturnValue('false');

      expect(() => gateway.emit('lead:new', { id: 'lead-1' })).not.toThrow();
    });

    it('should not throw when REALTIME_ENABLED is true', () => {
      mockConfigService.get.mockReturnValue('true');

      expect(() => gateway.emit('lead:scored', { id: 'lead-1', score: 85 })).not.toThrow();
    });

    it('should accept various event names', () => {
      const events = ['lead:new', 'lead:scored', 'lead:updated', 'conversation:new', 'failure:new'];
      for (const event of events) {
        expect(() => gateway.emit(event, { test: true })).not.toThrow();
      }
    });

    it('should accept null data gracefully', () => {
      mockConfigService.get.mockReturnValue('false');
      expect(() => gateway.emit('lead:new', null)).not.toThrow();
    });

    it('should accept undefined data gracefully', () => {
      expect(() => gateway.emit('lead:new', undefined)).not.toThrow();
    });

    it('should check REALTIME_ENABLED config when emitting', () => {
      mockConfigService.get.mockReturnValue('false');
      gateway.emit('lead:new', { id: '1' });
      expect(mockConfigService.get).toHaveBeenCalledWith('REALTIME_ENABLED');
    });

    it('should emit multiple events in sequence', () => {
      gateway.emit('lead:new', { id: '1' });
      gateway.emit('lead:updated', { id: '1', name: 'Updated' });
      gateway.emit('conversation:new', { conversationId: 'conv-1' });
      expect(mockConfigService.get).toHaveBeenCalledTimes(3);
    });

    it('should handle numeric data payloads', () => {
      expect(() => gateway.emit('lead:scored', 42)).not.toThrow();
    });

    it('should handle array data payloads', () => {
      expect(() => gateway.emit('leads:batch', [{ id: '1' }, { id: '2' }])).not.toThrow();
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        lead: { id: 'lead-1', contact: { name: 'John', email: 'john@test.com' } },
        metadata: { source: 'form', timestamp: new Date().toISOString() },
        tags: ['premium', 'new'],
      };
      expect(() => gateway.emit('lead:new', complexData)).not.toThrow();
    });
  });

  describe('emitToRoom', () => {
    it('should emit an event to a specific room without error', () => {
      expect(() => gateway.emitToRoom('tenant-1', 'lead:new', { id: 'lead-1' })).not.toThrow();
    });

    it('should handle different room names', () => {
      const rooms = ['tenant-1', 'user-42', 'campaign-7', 'global'];
      for (const room of rooms) {
        expect(() => gateway.emitToRoom(room, 'lead:updated', { id: '1' })).not.toThrow();
      }
    });

    it('should accept a room name with special characters', () => {
      expect(() => gateway.emitToRoom('tenant:abc-123_def', 'lead:new', {})).not.toThrow();
    });

    it('should handle empty room name gracefully', () => {
      expect(() => gateway.emitToRoom('', 'lead:new', {})).not.toThrow();
    });

    it('should handle empty event name gracefully', () => {
      expect(() => gateway.emitToRoom('tenant-1', '', {})).not.toThrow();
    });

    it('should be callable multiple times in succession', () => {
      for (let i = 0; i < 5; i++) {
        gateway.emitToRoom(`tenant-${i}`, 'lead:new', { id: `lead-${i}` });
      }
      // No throw is the assertion
      expect(true).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should have a logger instance', () => {
      expect(gateway['logger']).toBeDefined();
    });

    it('should accept ConfigService in constructor', () => {
      expect(gateway['config']).toBeDefined();
      expect(gateway['config']).toBe(configService);
    });
  });
});
