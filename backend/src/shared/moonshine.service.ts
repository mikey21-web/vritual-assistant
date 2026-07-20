import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MoonshineService {
  private readonly logger = new Logger(MoonshineService.name);
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('MOONSHINE_URL', 'http://moonshine:8002');
  }

  async transcribe(audioBuffer: Buffer, filename = 'audio.wav'): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    formData.append('audio', blob, filename);

    const res = await fetch(`${this.baseUrl}/transcribe`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown');
      throw new Error(`Moonshine transcription failed: ${err}`);
    }
    const data = await res.json() as any;
    return data.text || '';
  }

  async tts(text: string, language = 'en_us'): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) throw new Error(`TTS failed: ${await res.text().catch(() => 'unknown')}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch { return false; }
  }
}
