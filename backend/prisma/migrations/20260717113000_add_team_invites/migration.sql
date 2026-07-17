-- A real invite flow: the invitee sets their own password via a tokenized
-- link instead of an admin typing a password in for them, with module
-- permissions captured at invite time so they apply the moment the account
-- is created.
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES_AGENT',
    "department" TEXT,
    "moduleGrants" JSONB NOT NULL DEFAULT '{}',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");
CREATE INDEX "team_invites_tenant_id_status_idx" ON "team_invites"("tenant_id", "status");
CREATE INDEX "team_invites_email_idx" ON "team_invites"("email");
