/*
  Warnings:

  - Made the column `packagePackageId` on table `Destination` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Destination" ALTER COLUMN "packagePackageId" SET NOT NULL;
