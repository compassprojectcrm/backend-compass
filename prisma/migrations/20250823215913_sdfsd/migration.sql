/*
  Warnings:

  - You are about to drop the column `duration` on the `Package` table. All the data in the column will be lost.
  - Added the required column `days` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nights` to the `Package` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Package" DROP COLUMN "duration",
ADD COLUMN     "days" INTEGER NOT NULL,
ADD COLUMN     "nights" INTEGER NOT NULL;
