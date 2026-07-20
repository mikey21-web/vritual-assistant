import { Injectable, Logger } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private register: client.Registry;

  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    // Request duration histogram
    new client.Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.register],
    });

    // Database query duration histogram
    new client.Histogram({
      name: 'db_query_duration_ms',
      help: 'Database query duration in milliseconds',
      labelNames: ['operation'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500],
      registers: [this.register],
    });

    // Business counters
    new client.Counter({
      name: 'leads_created_total',
      help: 'Total number of leads created',
      labelNames: ['source'],
      registers: [this.register],
    });

    new client.Counter({
      name: 'conversions_total',
      help: 'Total number of conversions',
      labelNames: ['destination', 'status'],
      registers: [this.register],
    });

    new client.Counter({
      name: 'agent_runs_total',
      help: 'Total number of AI agent runs',
      labelNames: ['result'],
      registers: [this.register],
    });

    new client.Counter({
      name: 'webhooks_processed_total',
      help: 'Total number of webhooks processed',
      labelNames: ['provider', 'status'],
      registers: [this.register],
    });

    // Queue depth gauge
    new client.Gauge({
      name: 'bullmq_queue_depth',
      help: 'BullMQ queue depth',
      labelNames: ['queue', 'status'],
      registers: [this.register],
    });

    // Synthetic check duration histogram
    new client.Histogram({
      name: 'synthetic_check_duration_ms',
      help: 'Synthetic monitoring check duration in milliseconds',
      labelNames: ['check', 'status'],
      buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
      registers: [this.register],
    });

    // Synthetic check failure counter
    new client.Counter({
      name: 'synthetic_check_failures_total',
      help: 'Total number of synthetic monitoring check failures',
      labelNames: ['check'],
      registers: [this.register],
    });

    // Circuit breaker state gauge
    new client.Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      labelNames: ['name'],
      registers: [this.register],
    });

    this.logger.log('Prometheus metrics initialized');
  }

  get metrics(): Promise<string> {
    return this.register.metrics();
  }

  get contentType(): string {
    return this.register.contentType;
  }

  incrementCounter(name: string, labels: Record<string, string> = {}) {
    const counter = this.register.getSingleMetric(name) as client.Counter<string> | undefined;
    if (counter) counter.inc(labels);
  }

  observeHistogram(name: string, value: number, labels: Record<string, string> = {}) {
    const histogram = this.register.getSingleMetric(name) as client.Histogram<string> | undefined;
    if (histogram) histogram.observe(labels, value);
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const gauge = this.register.getSingleMetric(name) as client.Gauge<string> | undefined;
    if (gauge) gauge.set(labels, value);
  }
}
