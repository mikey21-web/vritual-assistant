# Changelog

## [1.0.0] - 2026-06-20

### Added
- Production readiness fixes:
  - Forgot password / reset flow with email delivery
  - JWT refresh token rotation and revocation
  - Password complexity enforcement
  - HSTS headers and tightened CSP
  - Environment variable validation at boot
  - Graceful shutdown (SIGTERM/SIGINT handlers)
  - Global request timeout middleware
  - Optimistic locking on Lead/Contact models
  - Sentry error tracking integration
  - Health check separation (liveness vs readiness)
  - PII redaction in request logging
  - React ErrorBoundary for frontend crash protection
  - Off-host encrypted backup script with S3 support
  - Operations runbooks for common issues

### Changed
- Body size limit increased from 1mb to 5mb
- Circuit breaker thresholds configurable via environment
- Login DTO includes min/max length validation
- CORS fallback no longer silently uses localhost in production
