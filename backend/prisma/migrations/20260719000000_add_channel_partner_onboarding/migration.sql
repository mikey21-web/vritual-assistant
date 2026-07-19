-- CreateEnum
CREATE TYPE "channel_partner_onboarding_status" AS ENUM ('INVITED', 'DOCS_PENDING', 'TRAINING_PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "channel_partners" ADD COLUMN     "agreementExpiryAt" TIMESTAMP(3),
ADD COLUMN     "agreementSignedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStatus" "channel_partner_onboarding_status" NOT NULL DEFAULT 'INVITED',
ADD COLUMN     "reraExpiryAt" TIMESTAMP(3),
ADD COLUMN     "trainingCompletedAt" TIMESTAMP(3);

