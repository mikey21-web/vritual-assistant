-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN     "compliance" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "toneExamples" TEXT[] DEFAULT ARRAY[]::TEXT[];
