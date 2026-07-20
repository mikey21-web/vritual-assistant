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
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('audio', blob, filename);

    const res = await fetch(`${this.baseUrl}/transcribe`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown');
      throw new Error(`Moonshine transcription failed: ${err}`);
    }
    const data = await res.json() as any;
    return data.text || '';
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch { return false; }
  }
}
