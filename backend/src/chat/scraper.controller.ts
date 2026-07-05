import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

export class ScrapeWebsiteDto {
  url: string;
}

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
@ApiBearerAuth()
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  @Post('scrape')
  @ApiOperation({ summary: 'Scrape a client website to auto-configure the AI agent' })
  async scrapeWebsite(@Body() d: ScrapeWebsiteDto) {
    try {
      const urlObj = new URL(d.url);
      const response = await fetch(d.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LeadFlowBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { success: false, error: `Failed to fetch URL: ${response.statusText}` };
      }

      const html = await response.text();

      const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim();
      const metaDesc = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || '').trim();
      const ogTitle = (html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1] || '').trim();
      const ogDesc = (html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] || '').trim();

      const headings: string[] = [];
      const h1Matches = html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi);
      const h2Matches = html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi);
      const h3Matches = html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi);
      for (const m of h1Matches) if (m[1].trim()) headings.push(m[1].trim());
      for (const m of h2Matches) if (m[1].trim()) headings.push(m[1].trim());
      for (const m of h3Matches) if (m[1].trim()) headings.push(m[1].trim());

      const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const serviceKeywords = ['service', 'solution', 'offer', 'product', 'program', 'we provide', 'we offer', 'consulting'];
      const sentences = textContent.match(/[^.!?]+[.!?]+/g) || [];
      const services = sentences
        .filter(s => serviceKeywords.some(k => s.toLowerCase().includes(k)))
        .slice(0, 5)
        .map(s => s.trim().slice(0, 200));

      const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const contactEmail = emailMatch?.[0] || '';

      const bizName = ogTitle || title.split('|')[0].split('-')[0].trim() || '';

      const fullText = [title, metaDesc, ...headings.slice(0, 10)].filter(Boolean).join(' ');

      const suggestedIndustry = this.guessIndustry(fullText + ' ' + textContent.slice(0, 2000));
      const suggestedTone = this.guessTone(fullText);

      return {
        success: true,
        data: {
          businessName: bizName,
          industry: suggestedIndustry,
          toneStyle: suggestedTone,
          description: metaDesc || ogDesc || '',
          services: services.filter(s => s.length > 10),
          contactEmail,
          suggestedPrompt: `Hey there! Welcome to ${bizName || 'our company'}! I'm your AI assistant — I can help answer questions about ${suggestedIndustry || 'our services'}, schedule a consultation, or connect you with the right team. What can I help you with today?`,
        },
      };
    } catch (err: any) {
      this.logger.error(`Scrape failed for ${d.url}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  private guessIndustry(text: string): string {
    const lower = text.toLowerCase();
    const industries: Record<string, string[]> = {
      'Real Estate': ['real estate', 'property', 'apartment', 'house', 'home', 'mortgage', 'rental', 'commercial', 'realtor', 'brokerage', 'realty'],
      'Healthcare': ['healthcare', 'medical', 'clinic', 'hospital', 'doctor', 'patient', 'health', 'wellness', 'dental', 'therapy', 'surgery'],
      'Education': ['education', 'school', 'training', 'course', 'learning', 'university', 'college', 'academy', 'tutoring', 'coaching'],
      'SaaS / Technology': ['software', 'saas', 'platform', 'app', 'digital', 'tech', 'cloud', 'api', 'automation', 'ai', 'startup'],
      'Legal Services': ['lawyer', 'attorney', 'legal', 'law firm', 'litigation', 'notary', 'advocate'],
      'Financial Services': ['financial', 'finance', 'insurance', 'investment', 'banking', 'loan', 'accounting', 'tax', 'wealth'],
      'E-commerce / Retail': ['shop', 'store', 'ecommerce', 'e-commerce', 'retail', 'wholesale', 'product', 'buy', 'shopping'],
      'Marketing / Agency': ['marketing', 'agency', 'digital agency', 'consulting', 'brand', 'seo', 'advertising', 'creative'],
      'Home Services': ['plumbing', 'electrical', 'contractor', 'renovation', 'construction', 'remodeling', 'cleaning', 'hvac', 'roofing'],
      'Hospitality / Travel': ['hotel', 'travel', 'tourism', 'restaurant', 'hospitality', 'vacation', 'booking', 'resort'],
    };
    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(k => lower.includes(k))) return industry;
    }
    return 'General Business';
  }

  private guessTone(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('luxury') || lower.includes('premium') || lower.includes('exclusive')) return 'formal';
    if (lower.includes('fun') || lower.includes('exciting') || lower.includes('amazing') || lower.includes('best')) return 'enthusiastic';
    if (lower.includes('hey') || lower.includes('yo') || lower.includes('dude') || lower.includes('cool')) return 'casual';
    if (lower.includes('welcome') || lower.includes('friendly') || lower.includes('community') || lower.includes('family')) return 'friendly';
    return 'professional';
  }
}
