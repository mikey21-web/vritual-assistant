import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();
    service = module.get<EmbeddingService>(EmbeddingService);
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const a = [1, 2, 3];
      const sim = service.cosineSimilarity(a, a);
      expect(sim).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const sim = service.cosineSimilarity([1, 0, 0], [0, 1, 0]);
      expect(Math.abs(sim)).toBeCloseTo(0, 5);
    });

    it('returns 0 for empty vectors', () => {
      expect(service.cosineSimilarity([], [1, 2, 3])).toBe(0);
      expect(service.cosineSimilarity([1, 2, 3], [])).toBe(0);
    });

    it('returns 0 for mismatched length', () => {
      expect(service.cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it('finds similar items above 0.3 threshold', async () => {
      const target = [1, 0, 0];
      const candidates = [
        { id: 'a', embedding: [0.99, 0.02, 0.01] },
        { id: 'b', embedding: [0.5, 0.5, 0.5] },
        { id: 'c', embedding: [0, 1, 0] },
      ];
      const result = await service.findSimilar(target, candidates, 2);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('a');
      expect(result[0].score).toBeGreaterThan(0.3);
      expect(result[1].score).toBeGreaterThan(0.3);
    });
  });
});
