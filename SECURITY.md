# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:

1. **DO NOT** open a public GitHub issue
2. Email details to: security@example.com
3. Include steps to reproduce, affected versions, and potential impact

We will acknowledge receipt within 48 hours and provide a timeline for a fix. Security issues are prioritized above feature work.

## Disclosure Policy

- Vulnerabilities are patched internally before public disclosure
- We coordinate disclosure with reporters
- Credit is given to reporters who follow responsible disclosure

## Security Practices

- All passwords hashed with bcrypt (12 rounds)
- JWT tokens have 24h expiry with refresh token rotation
- Integration credentials encrypted at rest (AES-256)
- All API endpoints rate-limited
- CSP headers configured on all responses
- HSTS enabled with preload
- PII redacted from all logs
