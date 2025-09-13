/*
  Warnings:

  - Added the required column `members` to the `Package` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Package" ADD COLUMN     "members" INTEGER NOT NULL;
