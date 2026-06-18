import { Test, TestingModule } from '@nestjs/testing';
import { RulesService } from './rules.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RulesService.testConditions', () => {
  let rulesService: RulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        { provide: PrismaService, useValue: { automationRule: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) }, ruleExecution: { create: jest.fn().mockResolvedValue({}) } } },
      ],
    }).compile();
    rulesService = module.get(RulesService);
  });

  it('equals — matches when values match', async () => {
    const r = await rulesService.testConditions([{ field: 'score', operator: 'equals', value: '50' }], { score: 50 });
    expect(r.results[0].passed).toBe(true);
    expect(r.matched).toBe(true);
  });

  it('equals — no match when values differ', async () => {
    const r = await rulesService.testConditions([{ field: 'score', operator: 'equals', value: '50' }], { score: 30 });
    expect(r.results[0].passed).toBe(false);
    expect(r.matched).toBe(false);
  });

  it('greater_than — matches when lead score exceeds threshold', async () => {
    const r = await rulesService.testConditions([{ field: 'score', operator: 'greater_than', value: '50' }], { score: 80 });
    expect(r.results[0].passed).toBe(true);
  });

  it('less_than — no match when value is above threshold', async () => {
    const r = await rulesService.testConditions([{ field: 'score', operator: 'less_than', value: '50' }], { score: 80 });
    expect(r.results[0].passed).toBe(false);
  });

  it('contains — matches substring', async () => {
    const r = await rulesService.testConditions([{ field: 'message', operator: 'contains', value: 'urgent' }], { message: 'This is urgent' });
    expect(r.results[0].passed).toBe(true);
  });

  it('in_list — matches when value is in the list', async () => {
    const r = await rulesService.testConditions([{ field: 'segment', operator: 'in_list', value: ['HOT', 'WARM'] }], { segment: 'HOT' });
    expect(r.results[0].passed).toBe(true);
  });

  it('not_in_list — matches when value is not in the list', async () => {
    const r = await rulesService.testConditions([{ field: 'segment', operator: 'not_in_list', value: ['HOT', 'WARM'] }], { segment: 'COLD' });
    expect(r.results[0].passed).toBe(true);
  });

  it('exists — matches when field has a value', async () => {
    const r = await rulesService.testConditions([{ field: 'email', operator: 'exists', value: true }], { email: 'test@example.com' });
    expect(r.results[0].passed).toBe(true);
  });

  it('not_exists — matches when field is null/undefined', async () => {
    const r = await rulesService.testConditions([{ field: 'email', operator: 'not_exists', value: true }], { email: null });
    expect(r.results[0].passed).toBe(true);
  });

  it('date_before — matches correctly', async () => {
    const r = await rulesService.testConditions([{ field: 'createdAt', operator: 'date_before', value: '2026-06-19' }], { createdAt: '2026-06-18' });
    expect(r.results[0].passed).toBe(true);
  });

  it('date_after — matches correctly', async () => {
    const r = await rulesService.testConditions([{ field: 'createdAt', operator: 'date_after', value: '2026-06-17' }], { createdAt: '2026-06-18' });
    expect(r.results[0].passed).toBe(true);
  });

  it('between — matches when value in range', async () => {
    const r = await rulesService.testConditions([{ field: 'score', operator: 'between', value: [10, 100] }], { score: 50 });
    expect(r.results[0].passed).toBe(true);
  });

  it('between — no match when value outside range', async () => {
    const r = await rulesService.testConditions([{ field: 'score', operator: 'between', value: [10, 100] }], { score: 200 });
    expect(r.results[0].passed).toBe(false);
  });

  it('unknown operator returns false', async () => {
    const r = await rulesService.testConditions([{ field: 'score', operator: 'unknown_op', value: '50' }], { score: 50 });
    expect(r.results[0].passed).toBe(false);
  });

  it('all conditions must pass for matched=true', async () => {
    const r = await rulesService.testConditions([
      { field: 'score', operator: 'greater_than', value: '50' },
      { field: 'segment', operator: 'equals', value: 'HOT' },
    ], { score: 80, segment: 'HOT' });
    expect(r.matched).toBe(true);
  });

  it('one failing condition makes matched=false', async () => {
    const r = await rulesService.testConditions([
      { field: 'score', operator: 'greater_than', value: '50' },
      { field: 'segment', operator: 'equals', value: 'HOT' },
    ], { score: 80, segment: 'COLD' });
    expect(r.matched).toBe(false);
  });
});
