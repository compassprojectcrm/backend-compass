-- CreateTable
CREATE TABLE "AgentMember" (
    "agentMemberId" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" INTEGER NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "AgentMember_pkey" PRIMARY KEY ("agentMemberId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentMember_email_agentId_key" ON "AgentMember"("email", "agentId");

-- AddForeignKey
ALTER TABLE "AgentMember" ADD CONSTRAINT "AgentMember_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("agentId") ON DELETE CASCADE ON UPDATE CASCADE;
