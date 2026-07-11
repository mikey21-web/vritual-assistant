import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebsiteCrawlerService {
  private readonly logger = new Logger(WebsiteCrawlerService.name);

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
  ) {}

  private extractText(html: string, tag: string): string[] {
    const results: string[] = [];
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = regex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 20) results.push(text);
    }
    return results;
  }

  async crawl(userId: string, url: string) {
    if (!url) throw new BadRequestException('URL is required');
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
    if (!user) throw new BadRequestException('User not found');
    const tenantId = user.tenantId;

    const pagesToCrawl = [url];
    const knownPages = ['/about', '/about-us', '/services', '/products', '/pricing', '/contact', '/faq', '/features'];
    for (const page of knownPages) pagesToCrawl.push(`${url.replace(/\/$/, '')}${page}`);

    const articles: { title: string; body: string; tags: string[] }[] = [];
    const visited = new Set<string>();

    for (const pageUrl of pagesToCrawl) {
      if (visited.has(pageUrl)) continue;
      visited.add(pageUrl);

      try {
        const res = await firstValueFrom(this.http.get(pageUrl, { timeout: 10000 }));
        const html = res.data;

        const title = this.extractText(html, 'title')[0] || this.extractText(html, 'h1')[0] || new URL(pageUrl).hostname;
        const headings = this.extractText(html, 'h1').concat(this.extractText(html, 'h2'));
        const paragraphs = this.extractText(html, 'p').filter(p => p.length > 30);
        const body = paragraphs.join('\n\n');

        if (body.length < 50) continue;

        // Determine tags from URL path
        const path = new URL(pageUrl).pathname;
        const tags: string[] = ['website'];
        if (path.includes('about')) tags.push('about');
        if (path.includes('service')) tags.push('services');
        if (path.includes('product')) tags.push('products');
        if (path.includes('pricing') || path.includes('price')) tags.push('pricing');
        if (path.includes('contact')) tags.push('contact');
        if (path.includes('faq')) tags.push('faq');
        if (path.includes('feature')) tags.push('features');
        if (path === '/' || path === '') tags.push('home');

        articles.push({ title: title.slice(0, 200), body: body.slice(0, 10000), tags });
      } catch (e: any) {
        this.logger.warn(`Failed to crawl ${pageUrl}: ${e.message}`);
      }
    }

    // Save as knowledge articles
    const created: any[] = [];
    for (const article of articles) {
      const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `page-${Date.now()}`;
      try {
        const existing = await this.prisma.knowledgeArticle.findUnique({ where: { slug } });
        if (existing) continue;
        const saved = await this.prisma.knowledgeArticle.create({
          data: { tenantId, title: article.title, slug, body: article.body, tags: article.tags, published: true, authorId: userId },
        });
        created.push({ id: saved.id, title: saved.title, tags: saved.tags });
      } catch (e: any) {
        this.logger.warn(`Failed to save article "${article.title}": ${e.message}`);
      }
    }

    return { crawled: visited.size, created: created.length, articles: created };
  }
}
