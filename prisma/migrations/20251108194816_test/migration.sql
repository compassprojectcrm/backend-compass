/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `AgentMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AgentMember_username_key" ON "AgentMember"("username");
