/*
  Warnings:

  - A unique constraint covering the columns `[ownerId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Team" DROP CONSTRAINT "Team_ownerId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Team_ownerId_key" ON "public"."Team"("ownerId");

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
