/*
  Warnings:

  - You are about to drop the column `email` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `AgentMember` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Traveller` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `Traveller` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `AgentMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Traveller` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Agent_email_key";

-- DropIndex
DROP INDEX "AgentMember_email_agentId_key";

-- DropIndex
DROP INDEX "Traveller_email_key";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "email",
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AgentMember" DROP COLUMN "email",
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Traveller" DROP COLUMN "email",
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agent_username_key" ON "Agent"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Traveller_username_key" ON "Traveller"("username");
