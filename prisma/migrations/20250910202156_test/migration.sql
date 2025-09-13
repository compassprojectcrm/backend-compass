/*
  Warnings:

  - Added the required column `endDate` to the `Destination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Destination` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Destination` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Destination" ADD COLUMN     "description" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
