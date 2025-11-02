/*
  Warnings:

  - The values [INACTIVE,ARCHIVED] on the enum `PackageStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PackageStatus_new" AS ENUM ('ACTIVE', 'DRAFT');
ALTER TABLE "public"."Package" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Package" ALTER COLUMN "status" TYPE "PackageStatus_new" USING ("status"::text::"PackageStatus_new");
ALTER TYPE "PackageStatus" RENAME TO "PackageStatus_old";
ALTER TYPE "PackageStatus_new" RENAME TO "PackageStatus";
DROP TYPE "public"."PackageStatus_old";
ALTER TABLE "Package" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
