-- DropForeignKey
ALTER TABLE "public"."Team" DROP CONSTRAINT "Team_ownerId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
