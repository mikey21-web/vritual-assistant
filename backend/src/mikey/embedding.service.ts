import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private client: OpenAI;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.config.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1';
    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL });
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!text || !this.client) return [];

    try {
      const response = await this.client.embeddings.create({
        model: 'deepseek-chat',
        input: text.slice(0, 8000),
      });
      return response.data[0]?.embedding || [];
    } catch (err: any) {
      this.logger.warn(`Embedding failed: ${err.message}`);
      return [];
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (!a?.length || !b?.length || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  async findSimilar(target: number[], candidates: { id: string; embedding: number[] }[], topK = 5): Promise<{ id: string; score: number }[]> {
    if (!target?.length || !candidates?.length) return [];

    const scored = candidates
      .filter(c => c.embedding?.length > 0)
      .map(c => ({ id: c.id, score: this.cosineSimilarity(target, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.filter(s => s.score > 0.3);
  }
}
