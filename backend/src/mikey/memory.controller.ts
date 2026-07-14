import { Controller, Post, Get, Param, Query, Body, Logger } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('mikey/memory')
export class MemoryController {
  private readonly logger = new Logger(MemoryController.name);

  constructor(private memory: MemoryService) {}

  @Post('store')
  async store(@Body() body: {
    tenantId: string; type: any; key: string; value: string;
    summary?: string; source?: string; leadId?: string;
    confidence?: number; metadata?: any;
  }) {
    return this.memory.store(body.tenantId, {
      type: body.type,
      key: body.key,
      value: body.value,
      summary: body.summary,
      source: body.source,
      leadId: body.leadId,
      confidence: body.confidence,
      metadata: body.metadata,
    });
  }

  @Get('query')
  async query(
    @Query('tenantId') tenantId: string,
    @Query('type') type?: any,
    @Query('key') key?: string,
    @Query('leadId') leadId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.memory.query(tenantId, {
      type, key, leadId, search, limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('recent/:type')
  async recent(
    @Param('type') type: any,
    @Query('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.memory.recallRecent(tenantId, type, limit ? parseInt(limit, 10) : 10);
  }

  @Post('search/similar')
  async searchSimilar(@Body() body: { tenantId: string; query: string; type?: any; leadId?: string; topK?: number }) {
    return this.memory.searchBySimilarity(body.tenantId, body.query, body.type, body.leadId, body.topK);
  }

  @Post('store-embedding')
  async storeWithEmbedding(@Body() body: {
    tenantId: string; type: any; key: string; value: string;
    summary?: string; source?: string; leadId?: string; confidence?: number;
  }) {
    return this.memory.storeWithEmbedding(body.tenantId, body);
  }

  @Get('working')
  async working(
    @Query('tenantId') tenantId: string,
    @Query('leadId') leadId?: string,
  ) {
    return this.memory.getWorkingMemory(tenantId, leadId);
  }

  @Post('working')
  async setWorking(@Body() body: { tenantId: string; state: any; leadId?: string }) {
    return this.memory.setWorkingMemory(body.tenantId, body.state, body.leadId);
  }

  @Post('invalidate/:id')
  async invalidate(@Param('id') id: string) {
    return this.memory.invalidate(id);
  }

  @Post('rules/propose')
  async proposeRule(@Body() body: { tenantId: string; rule: string; rationale: string; category?: string }) {
    return this.memory.proposeRule(body.tenantId, body.rule, body.rationale, body.category);
  }

  @Post('rules/approve/:id')
  async approveRule(@Param('id') id: string, @Body() body: { approvedById: string }) {
    return this.memory.approveRule(id, body.approvedById);
  }

  @Get('rules/active')
  async getActiveRules(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.memory.getActiveRules(tenantId, category);
  }

  @Post('rules/relevant')
  async getRelevantRules(@Body() body: { tenantId: string; context: string; category?: string; maxRules?: number }) {
    return this.memory.getRelevantRules(body.tenantId, body.context, body.category, body.maxRules);
  }

  @Post('rules/record-impact')
  async recordRuleImpact(@Body() body: { ruleId: string; impactDelta: number; metric: string }) {
    return this.memory.recordRuleImpact(body.ruleId, body.impactDelta, body.metric);
  }

  @Get('rules/pending')
  async getPendingRules(@Query('tenantId') tenantId: string) {
    return this.memory.getPendingRules(tenantId);
  }

  @Post('rules/retire/:id')
  async retireRule(@Param('id') id: string) {
    return this.memory.retireRule(id);
  }

  @Post('reflexion/log')
  async logReflexion(@Body() body: {
    tenantId: string; outcomeType: string; entityId?: string;
    trajectory: any[]; reflection: string;
    candidateRule?: string; perspectives?: any;
  }) {
    return this.memory.logReflexion(body.tenantId, body);
  }

  @Get('stats')
  async stats(@Query('tenantId') tenantId: string) {
    return this.memory.getStats(tenantId);
  }
}
