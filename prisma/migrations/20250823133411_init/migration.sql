/*
  Warnings:

  - You are about to drop the column `teamId` on the `TeamMember` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";

-- AlterTable
ALTER TABLE "public"."TeamMember" DROP COLUMN "teamId";

-- CreateTable
CREATE TABLE "public"."_TeamMembers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TeamMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TeamMembers_B_index" ON "public"."_TeamMembers"("B");

-- AddForeignKey
ALTER TABLE "public"."_TeamMembers" ADD CONSTRAINT "_TeamMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TeamMembers" ADD CONSTRAINT "_TeamMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
