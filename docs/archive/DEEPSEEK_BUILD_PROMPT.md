# DeepSeek Build Prompt — Virtual Assistant Lead Platform
# Completion Sprint: Everything Remaining to Ship

---

## CONTEXT — READ THIS FIRST

You are working on a **multi-tenant B2B lead capture, nurture, and conversion SaaS platform** located at the root of this repository.

The project has two main parts:
- `backend/` — NestJS + TypeScript + Prisma + PostgreSQL + Redis/BullMQ
- `dashboard/` — Next.js 14 App Router + TypeScript + Tailwind CSS

The project also has:
- `n8n/workflows/` — 12 n8n automation workflow JSON files
- `docker-compose.yml` — 4 services: postgres, redis, backend (port 3001), dashboard (port 3000), n8n (port 5678)

The backend is a NestJS application with JWT authentication, BullMQ queues, Prisma ORM, and a multi-tenant data model. Every model has a `tenantId` field. The auth system uses JWT tokens. Role-based access uses `@Roles()` decorator + `RolesGuard`.

The 6 user roles in order of power are: `OWNER`, `ADMIN`, `MANAGER`, `SALES_AGENT`, `SUPPORT_AGENT`, `VIEWER`.

The dashboard is a Next.js 14 app using the App Router pattern. Auth tokens are stored in localStorage via `dashboard/src/lib/api.ts`. The `api()` function in that file handles all authenticated requests. The layout is in `dashboard/src/app/(dashboard)/layout.tsx`.

---

## CRITICAL RULES — DO NOT BREAK THESE

1. **Do not hallucinate features.** If something is not in the schema or existing code, do not pretend it exists.
2. **Do not break the existing build.** Run `npx tsc --noEmit --incremental false` in both `backend/` and `dashboard/` after your changes. Fix all TypeScript errors before finishing.
3. **Do not add new Prisma models** unless explicitly listed in this document. The schema is final.
4. **Do not change existing Prisma models.** Only add indexes if absolutely necessary.
5. **Every backend endpoint must use a real DTO class with `class-validator` decorators.** No `Record<string, unknown>` in controller method signatures.
6. **Every new module must be registered in `backend/src/app.module.ts`.**
7. **Every new dashboard page must be added to the sidebar nav in `dashboard/src/app/(dashboard)/layout.tsx`.**
8. **Run `npx prisma validate` after any schema change.**
9. **Do not run `npx prisma migrate dev`.** Only modify schema.prisma if needed. The migration SQL already exists.
10. **The n8n workflows must remain valid JSON.** Run `node -e "JSON.parse(require('fs').readFileSync('n8n/workflows/XX.json','utf8'))"` to verify each changed file.

---

## WHAT TO BUILD — 6 AREAS

---

## AREA 1: Permission Matrix (Backend)

### Problem
Right now permissions are inconsistent. Some controllers use `@Roles()`, some don't. There is no single source of truth for what each role can do.

### What to build

Create the file `backend/src/permissions/permissions.matrix.ts`.

This file must export a single object called `PERMISSION_MATRIX` that maps permission keys to arrays of allowed roles.

The permission keys must cover every major action in the system. Here is the complete required list:

```typescript
export const PERMISSION_MATRIX: Record<string, string[]> = {
  // Tenant / super admin
  'tenants:read':        ['OWNER', 'ADMIN'],
  'tenants:write':       ['OWNER'],
  'tenants:delete':      ['OWNER'],

  // Users
  'users:read':          ['OWNER', 'ADMIN', 'MANAGER'],
  'users:write':         ['OWNER', 'ADMIN'],
  'users:delete':        ['OWNER', 'ADMIN'],
  'users:read_self':     ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],

  // Leads
  'leads:read':          ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'leads:write':         ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
  'leads:delete':        ['OWNER', 'ADMIN', 'MANAGER'],
  'leads:assign':        ['OWNER', 'ADMIN', 'MANAGER'],
  'leads:export':        ['OWNER', 'ADMIN', 'MANAGER'],

  // Contacts
  'contacts:read':       ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'contacts:write':      ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
  'contacts:delete':     ['OWNER', 'ADMIN', 'MANAGER'],
  'contacts:merge':      ['OWNER', 'ADMIN', 'MANAGER'],

  // Campaigns
  'campaigns:read':      ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'campaigns:write':     ['OWNER', 'ADMIN', 'MANAGER'],
  'campaigns:delete':    ['OWNER', 'ADMIN'],

  // Conversations
  'conversations:read':  ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'conversations:write': ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'],

  // Templates
  'templates:read':      ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'templates:write':     ['OWNER', 'ADMIN', 'MANAGER'],
  'templates:delete':    ['OWNER', 'ADMIN'],

  // Nurture
  'nurture:read':        ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'nurture:write':       ['OWNER', 'ADMIN', 'MANAGER'],
  'nurture:delete':      ['OWNER', 'ADMIN'],

  // Scoring rules
  'scoring:read':        ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'scoring:write':       ['OWNER', 'ADMIN', 'MANAGER'],

  // Routing rules
  'routing:read':        ['OWNER', 'ADMIN', 'MANAGER'],
  'routing:write':       ['OWNER', 'ADMIN', 'MANAGER'],

  // Automation rules
  'rules:read':          ['OWNER', 'ADMIN', 'MANAGER'],
  'rules:write':         ['OWNER', 'ADMIN'],
  'rules:test':          ['OWNER', 'ADMIN', 'MANAGER'],

  // Integrations
  'integrations:read':   ['OWNER', 'ADMIN'],
  'integrations:write':  ['OWNER', 'ADMIN'],
  'integrations:test':   ['OWNER', 'ADMIN'],

  // CRM mappings
  'crm_mappings:read':   ['OWNER', 'ADMIN', 'MANAGER'],
  'crm_mappings:write':  ['OWNER', 'ADMIN'],

  // Booking
  'booking:read':        ['OWNER', 'ADMIN', 'MANAGER'],
  'booking:write':       ['OWNER', 'ADMIN'],

  // Analytics
  'analytics:read':      ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],

  // Audit logs
  'audit_logs:read':     ['OWNER', 'ADMIN'],

  // System events
  'events:read':         ['OWNER', 'ADMIN'],

  // Failures
  'failures:read':       ['OWNER', 'ADMIN', 'MANAGER'],
  'failures:retry':      ['OWNER', 'ADMIN', 'MANAGER'],
  'failures:resolve':    ['OWNER', 'ADMIN', 'MANAGER'],

  // Timeline
  'timeline:read':       ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'],

  // Tasks
  'tasks:read':          ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'tasks:write':         ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],

  // Conversions
  'conversions:read':    ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'conversions:write':   ['OWNER', 'ADMIN', 'MANAGER'],

  // Media
  'media:read':          ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'media:upload':        ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
  'media:delete':        ['OWNER', 'ADMIN', 'MANAGER'],

  // Forms
  'forms:read':          ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'forms:write':         ['OWNER', 'ADMIN', 'MANAGER'],

  // QR codes
  'qr_codes:read':       ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'qr_codes:write':      ['OWNER', 'ADMIN', 'MANAGER'],

  // Custom fields
  'custom_fields:read':  ['OWNER', 'ADMIN', 'MANAGER'],
  'custom_fields:write': ['OWNER', 'ADMIN'],

  // Business settings
  'settings:read':       ['OWNER', 'ADMIN'],
  'settings:write':      ['OWNER', 'ADMIN'],

  // Advanced features (SLA, pipeline, blocklist, import/export)
  'advanced:read':       ['OWNER', 'ADMIN', 'MANAGER'],
  'advanced:write':      ['OWNER', 'ADMIN', 'MANAGER'],

  // Health (admin only)
  'health:deep':         ['OWNER', 'ADMIN'],

  // Niche templates
  'niche_templates:read':  ['OWNER', 'ADMIN'],
  'niche_templates:write': ['OWNER'],
};
```

Also create `backend/src/permissions/permissions.module.ts` and `backend/src/permissions/permissions.service.ts`.

`PermissionsService` must have one method:

```typescript
canDo(role: string, permission: string): boolean
```

This checks the PERMISSION_MATRIX and returns true if the role is in the allowed list.

Register `PermissionsModule` in `backend/src/app.module.ts`.

Do NOT replace the existing `RolesGuard`. The `PermissionsService` is a utility that can be injected by any service or guard that needs fine-grained checks. The existing `@Roles()` guards on controllers stay as-is — you are adding the matrix as the reference document, not replacing the guard.

---

## AREA 2: DTO Validation Cleanup (Backend)

### Problem
26 controller methods accept `Record<string, unknown>` instead of typed DTO classes. This means any garbage data can enter the system.

### What to build

Fix every controller that has `@Body() d: Record<string, unknown>`. Replace with a proper DTO class using `class-validator`.

Here is the exact list of files and methods to fix:

#### `backend/src/automation-events/automation-events.controller.ts`
Method: `create(@Body() d: Record<string, unknown>)`
Create DTO: `backend/src/automation-events/dto/create-automation-event.dto.ts`
```typescript
import { IsString, IsObject, IsOptional, IsIn } from 'class-validator';

export class CreateAutomationEventDto {
  @IsString()
  type: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
```

#### `backend/src/booking-settings/booking-settings.controller.ts`
Method: `update(@Param('id') id: string, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/booking-settings/dto/update-booking-setting.dto.ts`
```typescript
import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateBookingSettingDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() provider?: string;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsBoolean() @IsOptional() active?: boolean;
}
```

#### `backend/src/business-settings/business-settings.controller.ts`
Method: `update(@Body() data: Record<string, unknown>)`
Create DTO: `backend/src/business-settings/dto/update-business-settings.dto.ts`
```typescript
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsString() @IsOptional() businessName?: string;
  @IsString() @IsOptional() timezone?: string;
  @IsString() @IsOptional() defaultCurrency?: string;
  @IsString() @IsOptional() defaultWhatsAppNumber?: string;
  @IsEmail() @IsOptional() defaultEmail?: string;
  @IsString() @IsOptional() defaultCrm?: string;
  @IsString() @IsOptional() defaultBookingTool?: string;
  @IsString() @IsOptional() workingHoursStart?: string;
  @IsString() @IsOptional() workingHoursEnd?: string;
  @IsEmail() @IsOptional() notificationEmail?: string;
  @IsString() @IsOptional() notificationPhone?: string;
}
```

#### `backend/src/contacts/contacts.controller.ts`
Method: `update(@Param('id') id: string, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/contacts/dto/update-contact.dto.ts`
```typescript
import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

export class UpdateContactDto {
  @IsString() @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() preferredChannel?: string;
  @IsArray() @IsOptional() tags?: string[];
}
```

#### `backend/src/conversions/conversions.controller.ts`
Method: `update(@Param('id') id: string, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/conversions/dto/update-conversion.dto.ts`
```typescript
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateConversionDto {
  @IsString() @IsOptional() @IsIn(['REQUESTED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED'])
  status?: string;
  @IsString() @IsOptional() externalId?: string;
}
```

#### `backend/src/crm-mappings/crm-mappings.controller.ts`
Method: `update(@Param('id') id: string, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/crm-mappings/dto/update-crm-mapping.dto.ts`
```typescript
import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateCrmMappingDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() crmType?: string;
  @IsObject() @IsOptional() fieldMappings?: Record<string, unknown>;
  @IsBoolean() @IsOptional() active?: boolean;
}
```

#### `backend/src/custom-fields/custom-fields.controller.ts`
Methods: `create(@Body() d: Record<string, unknown>)` and `update(@Param('id') id: string, @Body() d: Record<string, unknown>)`
Create DTOs: `backend/src/custom-fields/dto/create-custom-field.dto.ts` and `update-custom-field.dto.ts`
```typescript
// create
import { IsString, IsBoolean, IsOptional, IsIn, IsNumber, IsArray } from 'class-validator';
export class CreateCustomFieldDto {
  @IsString() name: string;
  @IsString() key: string;
  @IsIn(['TEXT','NUMBER','DATE','BOOLEAN','DROPDOWN']) type: string;
  @IsIn(['CONTACT','LEAD']) target: string;
  @IsArray() @IsOptional() options?: unknown[];
  @IsBoolean() @IsOptional() required?: boolean;
  @IsBoolean() @IsOptional() active?: boolean;
  @IsNumber() @IsOptional() displayOrder?: number;
}

// update — same fields but all optional
export class UpdateCustomFieldDto {
  @IsString() @IsOptional() name?: string;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsBoolean() @IsOptional() active?: boolean;
  @IsNumber() @IsOptional() displayOrder?: number;
  @IsArray() @IsOptional() options?: unknown[];
}
```

#### `backend/src/forms/forms.controller.ts`
Method: `updateField(@Param('id') id, @Param('fieldId') fieldId, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/forms/dto/update-form-field.dto.ts`
```typescript
import { IsString, IsBoolean, IsNumber, IsObject, IsOptional, IsArray } from 'class-validator';
export class UpdateFormFieldDto {
  @IsString() @IsOptional() label?: string;
  @IsString() @IsOptional() placeholder?: string;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsNumber() @IsOptional() displayOrder?: number;
  @IsObject() @IsOptional() validation?: Record<string, unknown>;
  @IsArray() @IsOptional() options?: unknown[];
}
```

#### `backend/src/integrations/integrations.controller.ts`
Method: `update(@Param('id') id, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/integrations/dto/update-integration.dto.ts`
```typescript
import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';
export class UpdateIntegrationDto {
  @IsString() @IsOptional() name?: string;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsBoolean() @IsOptional() isActive?: boolean;
}
```

#### `backend/src/nurture-sequences/nurture-sequences.controller.ts`
Method: `updateStep(@Param('id') id, @Param('stepId') stepId, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/nurture-sequences/dto/update-nurture-step.dto.ts`
```typescript
import { IsString, IsNumber, IsObject, IsOptional } from 'class-validator';
export class UpdateNurtureStepDto {
  @IsNumber() @IsOptional() displayOrder?: number;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsNumber() @IsOptional() waitSeconds?: number;
  @IsObject() @IsOptional() condition?: Record<string, unknown>;
  @IsString() @IsOptional() templateId?: string;
}
```

#### `backend/src/qr-codes/qr-codes.controller.ts`
Methods: `update()` and `recordScan()`
Create DTOs:
```typescript
// update-qr-code.dto.ts
import { IsString, IsBoolean, IsOptional } from 'class-validator';
export class UpdateQrCodeDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() destination?: string;
  @IsBoolean() @IsOptional() active?: boolean;
}

// record-qr-scan.dto.ts
import { IsString, IsOptional } from 'class-validator';
export class RecordQrScanDto {
  @IsString() @IsOptional() country?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() userAgent?: string;
}
```

#### `backend/src/routing-rules/routing-rules.controller.ts`
Method: `update(@Param('id') id, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/routing-rules/dto/update-routing-rule.dto.ts`
```typescript
import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';
export class UpdateRoutingRuleDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsObject() @IsOptional() conditions?: Record<string, unknown>;
  @IsObject() @IsOptional() action?: Record<string, unknown>;
  @IsBoolean() @IsOptional() active?: boolean;
}
```

#### `backend/src/rules/rules.controller.ts`
Methods: `test()` and `evaluateLead()`
Create DTOs:
```typescript
// test-rule.dto.ts
import { IsArray, IsObject } from 'class-validator';
export class TestRuleDto {
  @IsArray() conditions: unknown[];
  @IsObject() testLead: Record<string, unknown>;
}

// evaluate-lead.dto.ts
import { IsObject, IsString, IsOptional } from 'class-validator';
export class EvaluateLeadDto {
  @IsObject() lead: Record<string, unknown>;
  @IsString() @IsOptional() ruleId?: string;
}
```

#### `backend/src/tasks/tasks.controller.ts`
Method: `update(@Param('id') id, @Body() d: Record<string, unknown>)`
Create DTO: `backend/src/tasks/dto/update-task.dto.ts`
```typescript
import { IsString, IsDateString, IsOptional, IsIn } from 'class-validator';
export class UpdateTaskDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsIn(['pending','in_progress','done','cancelled']) @IsOptional() status?: string;
  @IsIn(['low','medium','high','urgent']) @IsOptional() priority?: string;
  @IsDateString() @IsOptional() dueAt?: string;
  @IsString() @IsOptional() assigneeId?: string;
}
```

#### `backend/src/webhooks/webhooks.controller.ts`
All 7 webhook methods use `Record<string, unknown>`. These are public endpoints (no auth) so validation is critical.

Create `backend/src/webhooks/dto/webhook-payload.dto.ts`:
```typescript
import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';

export class FormWebhookDto {
  @IsString() @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() message?: string;
  @IsString() @IsOptional() campaignId?: string;
  @IsString() @IsOptional() formId?: string;
  @IsObject() @IsOptional() metadata?: Record<string, unknown>;
}

export class WhatsAppWebhookDto {
  @IsObject() @IsOptional() entry?: unknown;
  @IsString() @IsOptional() object?: string;
}

export class GenericWebhookDto {
  @IsObject() @IsOptional() data?: unknown;
  @IsString() @IsOptional() event?: string;
}
```

After creating each DTO, update the controller to import and use it. The controller signature changes from:
```typescript
methodName(@Body() d: Record<string, unknown>)
```
to:
```typescript
methodName(@Body() d: TheNewDtoClass)
```

Make sure `ValidationPipe` is enabled globally. Check `backend/src/main.ts` and add it if missing:
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));
```

---

## AREA 3: Health Endpoints (Backend)

### Problem
There are no health check endpoints. Production systems need `/health` (quick check) and `/health/deep` (full dependency check).

### What to build

Create the directory `backend/src/health/` with these files:

#### `backend/src/health/health.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

#### `backend/src/health/health.service.ts`

This service must check each dependency and return its status. It must NOT throw — it returns a status object even when a dependency is down.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface DependencyStatus {
  status: 'ok' | 'error' | 'unconfigured';
  latencyMs?: number;
  detail?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: Record<string, DependencyStatus>;
}

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async shallow(): Promise<{ status: string; timestamp: string }> {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async deep(): Promise<HealthReport> {
    const deps: Record<string, DependencyStatus> = {};

    // 1. Database
    deps.database = await this.checkDatabase();

    // 2. Redis — check via env config, not a live ping (avoid circular dependency with BullMQ)
    const redisUrl = this.config.get<string>('REDIS_URL');
    deps.redis = redisUrl
      ? { status: 'ok', detail: 'configured' }
      : { status: 'unconfigured', detail: 'REDIS_URL not set' };

    // 3. n8n
    deps.n8n = await this.checkUrl(
      this.config.get<string>('N8N_BACKEND_API_URL') || 'http://n8n:5678',
      '/healthz',
    );

    // 4. Storage
    const storageProvider = this.config.get<string>('STORAGE_PROVIDER') || 'local';
    deps.storage = { status: 'ok', detail: `provider: ${storageProvider}` };

    // 5. WhatsApp
    const waSecret = this.config.get<string>('WHATSAPP_APP_SECRET');
    deps.whatsapp = waSecret
      ? { status: 'ok', detail: 'app secret configured' }
      : { status: 'unconfigured', detail: 'WHATSAPP_APP_SECRET not set' };

    // 6. Stripe
    const stripeSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    deps.stripe = stripeSecret
      ? { status: 'ok', detail: 'webhook secret configured' }
      : { status: 'unconfigured', detail: 'STRIPE_WEBHOOK_SECRET not set' };

    // 7. HubSpot
    const hubspotKey = this.config.get<string>('HUBSPOT_API_KEY');
    deps.hubspot = hubspotKey
      ? { status: 'ok', detail: 'api key configured' }
      : { status: 'unconfigured', detail: 'HUBSPOT_API_KEY not set' };

    // Determine overall status
    const hasError = Object.values(deps).some(d => d.status === 'error');
    const hasUnconfigured = Object.values(deps).some(d => d.status === 'unconfigured');
    const overallStatus = hasError ? 'degraded' : hasUnconfigured ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      dependencies: deps,
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (e: any) {
      return { status: 'error', detail: e.message };
    }
  }

  private async checkUrl(baseUrl: string, path: string): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(3000) });
      return res.ok
        ? { status: 'ok', latencyMs: Date.now() - start }
        : { status: 'error', detail: `HTTP ${res.status}` };
    } catch (e: any) {
      return { status: 'error', detail: e.message };
    }
  }
}
```

#### `backend/src/health/health.controller.ts`
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private health: HealthService) {}

  @Get()
  @Public()
  shallow() { return this.health.shallow(); }

  @Get('deep')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deep() { return this.health.deep(); }
}
```

Register `HealthModule` in `backend/src/app.module.ts`.

---

## AREA 4: n8n Workflow Completion

### Problem
All 12 n8n workflow JSON files exist but are skeleton placeholders. They are missing:
- Proper error handling nodes
- Auth headers on ALL backend API calls
- Correct backend API URLs using `$env.N8N_BACKEND_API_URL`
- Failure reporting back to the backend's `/failures` endpoint when something goes wrong
- Real node-to-node connections where some are broken or incomplete

### Rules for n8n workflows
- Every HTTP Request node that calls the backend must include: `"x-api-key": "={{ $env.WEBHOOK_API_KEY }}"` in headers
- Every workflow must have an error branch that calls `POST $env.N8N_BACKEND_API_URL/advanced/record-failure` on failure
- All URLs must use `$env.N8N_BACKEND_API_URL` not hardcoded `localhost`
- The JSON must remain valid and parseable

### What to verify and fix in each workflow

#### `n8n/workflows/01-lead-intake.json`
- Verify: The HTTP node calling `/webhooks/forms` has the `x-api-key` header set to `={{ $env.WEBHOOK_API_KEY }}`
- Add: An error catch node that calls `POST {{ $env.N8N_BACKEND_API_URL }}/advanced/record-failure` with `{ "eventType": "lead_intake_failed", "error": "{{ $execution.lastError.message }}" }`
- Ensure the workflow `connections` object properly links all nodes

#### `n8n/workflows/02-whatsapp-incoming.json`
- Must call `POST $env.N8N_BACKEND_API_URL/webhooks/whatsapp` with proper signature header
- Add error branch for failed message storage

#### `n8n/workflows/03-send-message.json`
- Must call `GET $env.N8N_BACKEND_API_URL/message-templates/:id` to fetch template before sending
- Must log delivery result back to `POST $env.N8N_BACKEND_API_URL/conversations/messages`
- Auth headers required on both calls

#### `n8n/workflows/04-followup-runner.json`
- Schedule trigger: every 15 minutes
- Calls `GET $env.N8N_BACKEND_API_URL/nurture-sequences/due` to get due steps
- Loops over results and executes each
- Reports failures for each failed step

#### `n8n/workflows/05-hot-lead-alert.json`
- Webhook trigger on `lead.hot` event
- Calls `GET $env.N8N_BACKEND_API_URL/leads/:leadId` to get full lead
- Sends notification (can be a placeholder HTTP call to a configured notification URL)

#### `n8n/workflows/06-crm-push.json`
- Calls `POST $env.N8N_BACKEND_API_URL/crm-mappings/:id/push` with lead data
- Reports failure to `/advanced/record-failure` if CRM push fails

#### `n8n/workflows/07-appointment-booking.json` through `12-error-alert.json`
- Ensure every HTTP Request node that calls the backend has the `x-api-key` header
- Ensure every workflow has at least one error catch path

After editing each file, verify it parses as valid JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('n8n/workflows/NN-name.json','utf8')); console.log('OK')"
```

---

## AREA 5: Missing Dashboard Pages

### Problem
These backend endpoints exist and work but there are no dashboard pages for them:
1. **Failure Inbox** — view all failed automations, retry/resolve them
2. **Lead Timeline** — see full activity history for one lead
3. **Rule Builder** — create/test automation rules
4. **Health Dashboard** — see `/health/deep` results visually

### Tech Stack Reminder
- Next.js 14 App Router in `dashboard/src/app/(dashboard)/`
- The `api()` function from `dashboard/src/lib/api.ts` handles all API calls
- Use Tailwind CSS for styling
- Use `lucide-react` for icons (already installed)
- Every page is a client component (`'use client'`) with `useState` and `useEffect`
- The API base URL is `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`

### Page 1: Failure Inbox
**File**: `dashboard/src/app/(dashboard)/failures/page.tsx`

This page must:
- On mount, call `GET /failures` to fetch all failure records
- Display a table with columns: Type, Status, Severity, Message, Lead ID, Provider, Operation, Attempts, Created At, Actions
- Have filter buttons: All / Open / Retrying / Resolved
- Each row with `status !== 'resolved'` must have a **Retry** button that calls `POST /failures/:id/retry`
- Each row with `status !== 'resolved'` must have a **Resolve** button that calls `POST /failures/:id/resolve`
- After retry or resolve, reload the list
- Show error messages inline if an API call fails
- Show a badge with color: open=red, retrying=yellow, resolved=green
- Show total count at the top
- Empty state: "No failures found"

Backend endpoints available:
- `GET /failures` — returns all records (array)
- `GET /failures/open` — returns only open
- `POST /failures/:id/retry` — triggers retry
- `POST /failures/:id/resolve` — marks resolved

Add to the sidebar nav in `dashboard/src/app/(dashboard)/layout.tsx`:
```typescript
{ href: '/failures', label: 'Failure Inbox', icon: AlertTriangle },
```
Import `AlertTriangle` from `lucide-react`.

### Page 2: Lead Timeline
**File**: `dashboard/src/app/(dashboard)/leads/[id]/timeline/page.tsx`

This is a subpage of a lead. It receives the lead ID from the URL params.

This page must:
- Accept `params: { id: string }` as props
- On mount, call `GET /leads/:id/timeline` to fetch timeline items
- Call `GET /leads/:id` to get the lead name/contact info for display
- Display items in a vertical timeline format (most recent first)
- Each timeline item shows: an icon based on `type`, the `title`, `description` (if any), and `createdAt` formatted as a human-readable date/time
- Timeline item types and suggested icons (use lucide-react):
  - `lead_created` → UserPlus icon, blue
  - `message_received` → MessageSquare icon, green
  - `message_sent` → Send icon, blue
  - `score_changed` → TrendingUp icon, purple
  - `segment_changed` → Tag icon, orange
  - `assigned` → User icon, gray
  - `note_added` → StickyNote icon, yellow
  - `task_created` → CheckSquare icon, blue
  - `crm_push_attempted` → Upload icon, gray
  - `crm_push_succeeded` → CheckCircle icon, green
  - `crm_push_failed` → XCircle icon, red
  - `conversion_recorded` → ArrowLeftRight icon, green
  - `automation_failed` → AlertTriangle icon, red
  - `automation_retried` → RefreshCw icon, yellow
  - default → Circle icon, gray
- Show "No timeline events yet" if empty
- Add a back button linking to `/leads`

Backend endpoints available:
- `GET /leads/:id` — returns lead with contact info
- `GET /leads/:id/timeline` — returns array of TimelineItem

Also add a **Timeline** link on the existing leads page (`dashboard/src/app/(dashboard)/leads/page.tsx`). Each lead row should have a small "Timeline" button/link that goes to `/leads/:id/timeline`.

### Page 3: Rule Builder
**File**: `dashboard/src/app/(dashboard)/rules/page.tsx`

This page must:
- On mount, call `GET /rules` to fetch all automation rules
- Display them in a table: Name, Category, Event Type, Priority, Active, Actions
- Have a **New Rule** button that opens a form panel (can be inline, not a modal)
- The form must include:
  - Name (text input, required)
  - Description (text input, optional)
  - Category (select: `scoring`, `routing`, `segment`, `nurture`, `notification`, `crm`)
  - Event Type (text input, optional, e.g. `lead.created`)
  - Priority (number input, default 100)
  - Active (toggle/checkbox)
  - Conditions JSON (textarea — the user types raw JSON array like `[{"field":"score","operator":"greater_than","value":50}]`)
  - Actions JSON (textarea — user types raw JSON array like `[{"type":"set_segment","segment":"HOT"}]`)
- A **Test Rule** section below the form:
  - A textarea for "Test Lead JSON" (user pastes a JSON object)
  - A **Test Conditions** button that calls `POST /rules/test` with `{ conditions, testLead }`
  - Show result: each condition shows field / operator / expected / actual / passed (green tick or red cross)
- On submit create, call `POST /rules`
- Edit: clicking a rule populates the form with existing values, submit calls `PATCH /rules/:id`
- Delete: call `DELETE /rules/:id` after confirmation
- Show validation error if JSON is invalid before submitting
- Reload the list after any create/update/delete

Backend endpoints:
- `GET /rules?category=scoring` — list rules
- `POST /rules` — create
- `PATCH /rules/:id` — update
- `DELETE /rules/:id` — delete
- `POST /rules/test` — test conditions, body: `{ conditions: [], testLead: {} }`

Add to sidebar:
```typescript
{ href: '/rules', label: 'Rules', icon: Zap },
```
Import `Zap` from `lucide-react`.

### Page 4: Health Dashboard
**File**: `dashboard/src/app/(dashboard)/health/page.tsx`

This page must:
- On mount, call `GET /health/deep` to fetch the deep health report
- Display overall status as a large badge at the top (ok=green, degraded=yellow, down=red)
- Show uptime in human-readable format (e.g. "14h 32m")
- Show the timestamp of the check
- Display each dependency in a card grid (2 or 3 per row):
  - Dependency name
  - Status badge (ok=green, error=red, unconfigured=gray)
  - Latency in ms (if available)
  - Detail text (if available)
- Have a **Refresh** button that re-fetches the health report
- Show a loading spinner while fetching
- If the API call fails (user not admin), show: "Access denied — admin only"

Add to sidebar:
```typescript
{ href: '/health', label: 'Health', icon: Activity },
```
Import `Activity` from `lucide-react`.

---

## AREA 6: Tests

### Problem
Only 35 unit tests exist (mostly mocked). There are no integration tests, permission tests, or E2E tests.

### What to build

#### 6A: Backend Integration Tests
File: `backend/test/integration.spec.ts`

This file already exists. Add tests to it (do not delete existing tests).

Add the following test groups using Jest and supertest. Import `supertest` as `request` and the NestJS test utilities.

The test module should bootstrap the real `AppModule` but use `DATABASE_URL` from environment (tests run against a real test database — do not mock Prisma).

If `DATABASE_URL` is not set, skip with `test.skip`.

**Test group 1: Authentication**
```
POST /auth/register — creates user, returns token
POST /auth/login — valid credentials return token
POST /auth/login — invalid credentials return 401
POST /auth/register — role field in body is ignored, user gets SALES_AGENT
```

**Test group 2: Leads (as OWNER)**
```
POST /leads — creates lead with valid data
GET /leads — returns paginated list
GET /leads/:id — returns single lead
GET /leads/:id — invalid id returns 404
```

**Test group 3: Permission enforcement**
```
GET /failures — VIEWER gets 403
POST /failures/:id/retry — VIEWER gets 403
GET /audit-logs — SALES_AGENT gets 403
PATCH /integrations/:id — SALES_AGENT gets 403
GET /health/deep — unauthenticated gets 401
GET /health — public, returns 200 with no token
```

**Test group 4: Webhook security**
```
POST /webhooks/forms — valid api key returns 201 or 200
POST /webhooks/forms — missing api key returns 401
POST /webhooks/whatsapp — invalid signature returns 401
```

**Test group 5: Rules**
```
POST /rules — creates rule
POST /rules/test — returns matched/not_matched result with condition breakdown
```

**Test group 6: Failures**
```
POST test a failure record is created (call FailuresService.record directly in test)
GET /failures — OWNER can retrieve the created record
POST /failures/:id/resolve — marks as resolved
POST /failures/:id/retry — non-retryable failure returns 400
```

Each test must:
- Clean up created records in `afterEach` or `afterAll` using `prisma.deleteMany`
- Not depend on order (tests must be isolated)

#### 6B: Backend Permission Unit Tests
File: `backend/src/permissions/permissions.service.spec.ts`

```typescript
describe('PermissionsService', () => {
  it('OWNER can do everything in the matrix');
  it('VIEWER cannot write leads');
  it('SALES_AGENT can read leads');
  it('SALES_AGENT cannot access audit_logs');
  it('MANAGER can retry failures');
  it('SUPPORT_AGENT cannot delete leads');
  it('unknown permission returns false for any role');
  it('unknown role returns false for any permission');
});
```

#### 6C: Rule Evaluator Unit Tests
File: `backend/src/rules/rules.service.spec.ts`

Mock `PrismaService`. Test `testConditions()` directly.

```typescript
describe('RulesService.testConditions', () => {
  it('equals — matches when values match');
  it('equals — no match when values differ');
  it('greater_than — matches when lead score exceeds threshold');
  it('less_than — no match when value is above threshold');
  it('contains — matches substring');
  it('in_list — matches when value is in the list');
  it('not_in_list — matches when value is not in the list');
  it('exists — matches when field has a value');
  it('not_exists — matches when field is null/undefined');
  it('date_before — matches correctly');
  it('date_after — matches correctly');
  it('between — matches when value in range');
  it('between — no match when value outside range');
  it('unknown operator returns false');
  it('all conditions must pass for matched=true');
  it('one failing condition makes matched=false');
});
```

---

## VERIFICATION COMMANDS

After completing all 6 areas, run these commands in order. All must pass with no errors.

```bash
# Backend TypeScript check
cd backend
npx tsc --noEmit --incremental false

# Backend tests
cd backend
npm test -- --runInBand

# Backend build
cd backend
npm run build

# Prisma validation
cd backend
npx prisma validate

# Dashboard TypeScript check
cd dashboard
npx tsc --noEmit --incremental false

# Dashboard build
cd dashboard
npm run build

# n8n JSON validation
node -e "
const fs = require('fs');
const dir = 'n8n/workflows';
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
  JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  console.log('OK:', f);
}
console.log('All n8n JSON valid');
"

# Check for any remaining 'any' body params
grep -rn "Body.*Record<string, unknown>" backend/src --include="*.ts"
# This must return NO results

# Check for unsafe defaults
grep -rn "admin123\|dev-secret\|change-me" backend/src
# This must return NO results in src/
```

---

## FINAL DELIVERABLES CHECKLIST

After building, confirm all of these exist and are non-empty:

**Backend:**
- [ ] `backend/src/permissions/permissions.matrix.ts` — full PERMISSION_MATRIX object
- [ ] `backend/src/permissions/permissions.module.ts`
- [ ] `backend/src/permissions/permissions.service.ts` — with `canDo(role, permission)` method
- [ ] `backend/src/permissions/permissions.service.spec.ts` — unit tests
- [ ] `backend/src/health/health.module.ts`
- [ ] `backend/src/health/health.service.ts` — checkDatabase, checkUrl, shallow, deep
- [ ] `backend/src/health/health.controller.ts` — GET /health (public), GET /health/deep (OWNER/ADMIN)
- [ ] `backend/src/app.module.ts` — PermissionsModule and HealthModule imported
- [ ] All 26 `Record<string, unknown>` body params replaced with typed DTOs
- [ ] `backend/src/main.ts` — ValidationPipe enabled globally
- [ ] `backend/src/rules/rules.service.spec.ts` — rule evaluator unit tests
- [ ] `backend/test/integration.spec.ts` — new test groups added

**Dashboard:**
- [ ] `dashboard/src/app/(dashboard)/failures/page.tsx` — failure inbox with retry/resolve
- [ ] `dashboard/src/app/(dashboard)/leads/[id]/timeline/page.tsx` — lead timeline
- [ ] `dashboard/src/app/(dashboard)/rules/page.tsx` — rule builder + tester
- [ ] `dashboard/src/app/(dashboard)/health/page.tsx` — health dashboard
- [ ] `dashboard/src/app/(dashboard)/layout.tsx` — 4 new nav items added

**n8n:**
- [ ] All 12 workflow JSON files have auth headers on backend API calls
- [ ] All 12 workflow JSON files have at least one error handling path
- [ ] All 12 files parse as valid JSON

---

## WHAT NOT TO TOUCH

- Do NOT modify `backend/prisma/schema.prisma` (schema is final)
- Do NOT modify `docker-compose.yml`
- Do NOT modify existing passing tests — only add new ones
- Do NOT add new npm packages without confirming they are needed
- Do NOT create any new Prisma models
- Do NOT modify the existing auth system (JWT, guards, decorators)
- Do NOT create a new sidebar design — add items to the existing nav arrays only

---

## START HERE

Read these files before writing any code:

1. `backend/src/app.module.ts` — understand module structure
2. `backend/prisma/schema.prisma` — understand all models and their fields
3. `backend/src/auth/roles.guard.ts` — understand existing guard
4. `backend/src/auth/public.decorator.ts` — understand @Public() decorator
5. `dashboard/src/lib/api.ts` — understand how frontend calls backend
6. `dashboard/src/app/(dashboard)/layout.tsx` — understand sidebar nav structure
7. `backend/src/failures/failures.controller.ts` — example of an existing slim controller
8. `backend/src/rules/rules.service.ts` — the rule evaluator logic to test

Then build Area 1 → Area 2 → Area 3 → Area 4 → Area 5 → Area 6 in order.

After each area, run the relevant TypeScript check before moving to the next.
