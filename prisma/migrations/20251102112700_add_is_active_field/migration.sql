/*
  Warnings:

  - The values [GLOBAL,LOCAL] on the enum `TripType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TripType_new" AS ENUM ('INTERNATIONAL', 'DOMESTIC');
ALTER TABLE "Package" ALTER COLUMN "tripType" TYPE "TripType_new" USING ("tripType"::text::"TripType_new");
ALTER TYPE "TripType" RENAME TO "TripType_old";
ALTER TYPE "TripType_new" RENAME TO "TripType";
DROP TYPE "public"."TripType_old";
COMMIT;
