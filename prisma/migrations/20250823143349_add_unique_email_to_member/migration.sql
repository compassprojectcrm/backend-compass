/*
  Warnings:

  - A unique constraint covering the columns `[email,teamId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_email_teamId_key" ON "public"."TeamMember"("email", "teamId");
