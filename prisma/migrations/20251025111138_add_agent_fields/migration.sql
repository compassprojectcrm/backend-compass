/*
  Warnings:

  - Added the required column `companyName` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Agent" ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;
