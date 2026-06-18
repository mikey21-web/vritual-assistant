import { Test, TestingModule } from '@nestjs/testing';
import { ScoringRulesService } from './scoring-rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateCondition } from '../shared/scoring.util';

describe('ScoringRulesService', () => {
  let service: ScoringRulesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      scoringRule: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(d => Promise.resolve({ id: 'rule-1', ...d.data })),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [ScoringRulesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ScoringRulesService>(ScoringRulesService);
  });

  it('should evaluate contains operator', () => {
    const results = evaluateCondition('hello world', 'contains', 'hello');
    expect(results).toBe(true);
  });

  it('should evaluate exists operator', () => {
    expect(evaluateCondition('something', 'exists', 'true')).toBe(true);
    expect(evaluateCondition('', 'exists', 'true')).toBe(false);
  });

  it('should evaluate gt operator', () => {
    expect(evaluateCondition('50', 'gt', '40')).toBe(true);
    expect(evaluateCondition('30', 'gt', '40')).toBe(false);
  });

  it('should test rules with sample values', async () => {
    const result = await service.test({
      field: 'message',
      operator: 'contains',
      value: 'urgent',
      points: 20,
      testValues: [{ message: 'urgent help needed' }, { message: 'just browsing' }],
    });
    expect(result.results[0].matched).toBe(true);
    expect(result.results[1].matched).toBe(false);
  });
});
