/*
  Warnings:

  - You are about to drop the `_TeamMembers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `teamId` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."_TeamMembers" DROP CONSTRAINT "_TeamMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_TeamMembers" DROP CONSTRAINT "_TeamMembers_B_fkey";

-- DropIndex
DROP INDEX "public"."TeamMember_email_key";

-- AlterTable
ALTER TABLE "public"."TeamMember" ADD COLUMN     "teamId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."_TeamMembers";

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
