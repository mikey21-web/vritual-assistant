-- AlterEnum
ALTER TYPE "CustomFieldTarget" ADD VALUE 'TEAM_MEMBER';

-- AlterTable
ALTER TABLE "custom_field_values" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "custom_field_values_userId_idx" ON "custom_field_values"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_definitionId_userId_key" ON "custom_field_values"("definitionId", "userId");

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
