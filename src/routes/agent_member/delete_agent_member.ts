import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";
import { permissionGuard } from "../../middleware/auth";

/** ✅ Zod schema for deleting multiple Agent Members */
const deleteAgentMembersSchema = z.object({
    agentMemberIds: z.array(z.number().int().positive()).min(1),
});

export default async function deleteAgentMembersRoute(app: FastifyInstance) {
    app.delete(
        ROUTES.AGENT_MEMBER.DELETE_AGENT_MEMBERS,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.AGENT_MEMBER.DELETE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            app.log.debug("Bulk agent member deletion request received");

            /** ✅ Step 1 — Validate Input */
            const parsed = deleteAgentMembersSchema.safeParse(req.body);
            if (!parsed.success) {
                app.log.debug({ issues: parsed.error.issues }, "Validation failed");
                return reply.status(400).send(parsed.error.format());
            }

            const { agentMemberIds } = parsed.data;
            const agentId = req.user.id;

            try {
                /** ✅ Step 3 — Delete only those members that belong to this agent */
                const deleted = await prisma.agentMember.deleteMany({
                    where: {
                        agentId,
                        agentMemberId: { in: agentMemberIds },
                    },
                });

                app.log.info(
                    { deletedCount: deleted.count, agentId },
                    "Agent members deleted successfully"
                );

                /** ✅ Step 4 — Respond */
                return reply.status(200).send({
                    message: "Agent members deleted successfully."
                });
            } catch (err) {
                app.log.error({ err }, "Unexpected error during agent member deletion");
                return reply.status(500).send({
                    error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR,
                });
            }
        }
    );
}
