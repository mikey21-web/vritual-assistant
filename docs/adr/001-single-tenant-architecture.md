# ADR-001: Single-Tenant Architecture

**Status:** Accepted
**Date:** 2026-06-20

## Context
The platform needs to serve lead automation to marketing agency clients. Each client has isolated data, branding, and configuration.

## Decision
Deploy a separate stack per client (single-tenant) rather than a shared multi-tenant database with row-level isolation.

Rationale:
- Simpler security model (no cross-tenant leakage risk)
- Per-client resource limits and scaling
- Client-specific customizations without code changes
- Easier backup/restore per client
- Simpler compliance (GDPR data isolation)

## Consequences
- Higher infrastructure cost per client
- Requires fleet management tooling (fleet.yaml, fleet-status.ts)
- Deployments must be automated per client
- No shared analytics across tenants

## Compliance
- Each deployment has its own database
- fleet.yaml tracks all active deployments
- No Tenant model in the database (tenant identity = deployment boundary)
