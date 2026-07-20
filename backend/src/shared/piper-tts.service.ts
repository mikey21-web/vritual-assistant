import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PiperTtsService {
  private readonly logger = new Logger(PiperTtsService.name);
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('PIPER_URL', 'http://piper-tts:8123');
  }

  async speak(text: string, language = 'te'): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/tts?text=${encodeURIComponent(text)}&lang=${language}`);
    if (!res.ok) throw new Error(`Piper TTS failed: ${await res.text().catch(() => 'unknown')}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async health(): Promise<boolean> {
    try { const r = await fetch(`${this.baseUrl}/health`); return r.ok; } catch { return false; }
  }
}
