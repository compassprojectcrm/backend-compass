/*
  Warnings:

  - The primary key for the `Package` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `days` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `nights` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `packageId` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `packageName` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `tripType` on the `Package` table. All the data in the column will be lost.
  - Added the required column `endDate` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Package` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."PackageStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "public"."Destination" DROP CONSTRAINT "Destination_packagePackageId_fkey";

-- AlterTable
ALTER TABLE "public"."Package" DROP CONSTRAINT "Package_pkey",
DROP COLUMN "days",
DROP COLUMN "nights",
DROP COLUMN "packageId",
DROP COLUMN "packageName",
DROP COLUMN "tripType",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "public"."PackageStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" "public"."TripType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "Package_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "public"."Destination" ADD CONSTRAINT "Destination_packagePackageId_fkey" FOREIGN KEY ("packagePackageId") REFERENCES "public"."Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
