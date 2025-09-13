/*
  Warnings:

  - The primary key for the `Package` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Package` table. All the data in the column will be lost.
  - Added the required column `packageName` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tripType` to the `Package` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Destination" DROP CONSTRAINT "Destination_packagePackageId_fkey";

-- AlterTable
ALTER TABLE "public"."Package" DROP CONSTRAINT "Package_pkey",
DROP COLUMN "id",
DROP COLUMN "name",
DROP COLUMN "type",
ADD COLUMN     "packageId" SERIAL NOT NULL,
ADD COLUMN     "packageName" TEXT NOT NULL,
ADD COLUMN     "tripType" "public"."TripType" NOT NULL,
ADD CONSTRAINT "Package_pkey" PRIMARY KEY ("packageId");

-- AddForeignKey
ALTER TABLE "public"."Destination" ADD CONSTRAINT "Destination_packagePackageId_fkey" FOREIGN KEY ("packagePackageId") REFERENCES "public"."Package"("packageId") ON DELETE CASCADE ON UPDATE CASCADE;
