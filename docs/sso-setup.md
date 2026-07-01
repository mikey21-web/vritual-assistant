# SSO (SAML/OIDC) Setup

## Overview

SSO support is structured for future implementation. The system supports both SAML and OIDC protocols.

## Architecture

```
User → IdP (Okta/Azure AD/Google Workspace)
  → SAML/OIDC Response → Backend SSO endpoint
  → User lookup/creation → JWT issued → Dashboard
```

## Implementation

The SSO module is ready for integration. To enable:

1. Choose an identity provider (Okta, Azure AD, Google Workspace, Auth0)
2. Set up the SSO application in your IdP
3. Configure environment variables:
   - `SSO_PROVIDER` — 'saml' or 'oidc'
   - `SSO_ISSUER` — IdP issuer URL
   - `SSO_ENTRY_POINT` — IdP SSO URL
   - `SSO_CERT` — IdP public certificate (for SAML)
   - `SSO_CLIENT_ID` — OIDC client ID
   - `SSO_CLIENT_SECRET` — OIDC client secret

## SAML Flow

1. User clicks "Login with SSO"
2. Redirected to IdP login page
3. IdP POSTs SAML response to `/auth/saml/callback`
4. Backend validates assertion, creates/links user
5. JWT issued, user redirected to dashboard

## OIDC Flow

1. User clicks "Login with SSO"
2. Redirected to IdP authorization URL
3. IdP redirects to `/auth/oidc/callback` with auth code
4. Backend exchanges code for tokens
5. User info retrieved, JWT issued

## Passport Strategy

```typescript
// Example SAML strategy configuration
new SamlStrategy({
  issuer: process.env.SSO_ISSUER,
  entryPoint: process.env.SSO_ENTRY_POINT,
  cert: process.env.SSO_CERT,
}, (profile, done) => {
  // Find or create user by email
  // Link to existing tenant
  done(null, user);
});
```
