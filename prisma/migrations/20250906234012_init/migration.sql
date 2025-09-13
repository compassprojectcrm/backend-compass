/*
  Warnings:

  - The primary key for the `Agent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Agent` table. All the data in the column will be lost.
  - The primary key for the `City` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `City` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `City` table. All the data in the column will be lost.
  - The primary key for the `Country` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Country` table. All the data in the column will be lost.
  - You are about to drop the column `packagePackageId` on the `Destination` table. All the data in the column will be lost.
  - The primary key for the `State` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `State` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `State` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[countryName]` on the table `Country` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cityName` to the `City` table without a default value. This is not possible if the table is not empty.
  - Added the required column `countryName` to the `Country` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageId` to the `Destination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stateName` to the `State` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."City" DROP CONSTRAINT "City_stateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Destination" DROP CONSTRAINT "Destination_cityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Destination" DROP CONSTRAINT "Destination_packagePackageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Package" DROP CONSTRAINT "Package_agentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."State" DROP CONSTRAINT "State_countryId_fkey";

-- DropIndex
DROP INDEX "public"."Country_name_key";

-- AlterTable
ALTER TABLE "public"."Agent" DROP CONSTRAINT "Agent_pkey",
DROP COLUMN "id",
ADD COLUMN     "agentId" SERIAL NOT NULL,
ADD CONSTRAINT "Agent_pkey" PRIMARY KEY ("agentId");

-- AlterTable
ALTER TABLE "public"."City" DROP CONSTRAINT "City_pkey",
DROP COLUMN "id",
DROP COLUMN "name",
ADD COLUMN     "cityId" SERIAL NOT NULL,
ADD COLUMN     "cityName" TEXT NOT NULL,
ADD CONSTRAINT "City_pkey" PRIMARY KEY ("cityId");

-- AlterTable
ALTER TABLE "public"."Country" DROP CONSTRAINT "Country_pkey",
DROP COLUMN "id",
DROP COLUMN "name",
ADD COLUMN     "countryId" SERIAL NOT NULL,
ADD COLUMN     "countryName" TEXT NOT NULL,
ADD CONSTRAINT "Country_pkey" PRIMARY KEY ("countryId");

-- AlterTable
ALTER TABLE "public"."Destination" DROP COLUMN "packagePackageId",
ADD COLUMN     "packageId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."State" DROP CONSTRAINT "State_pkey",
DROP COLUMN "id",
DROP COLUMN "name",
ADD COLUMN     "stateId" SERIAL NOT NULL,
ADD COLUMN     "stateName" TEXT NOT NULL,
ADD CONSTRAINT "State_pkey" PRIMARY KEY ("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_countryName_key" ON "public"."Country"("countryName");

-- AddForeignKey
ALTER TABLE "public"."Package" ADD CONSTRAINT "Package_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("agentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."State" ADD CONSTRAINT "State_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."Country"("countryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."City" ADD CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."State"("stateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Destination" ADD CONSTRAINT "Destination_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("cityId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Destination" ADD CONSTRAINT "Destination_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package"("packageId") ON DELETE CASCADE ON UPDATE CASCADE;
