-- CreateTable
CREATE TABLE "public"."PackageSubscription" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "travellerId" INTEGER NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageSubscription_packageId_travellerId_key" ON "public"."PackageSubscription"("packageId", "travellerId");

-- AddForeignKey
ALTER TABLE "public"."PackageSubscription" ADD CONSTRAINT "PackageSubscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package"("packageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackageSubscription" ADD CONSTRAINT "PackageSubscription_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "public"."Traveller"("travellerId") ON DELETE CASCADE ON UPDATE CASCADE;
