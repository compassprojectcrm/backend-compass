import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";
import { permissionGuard } from "../../middleware/auth";

export default async function getAllAgentMembersRoute(app: FastifyInstance) {
    app.get(
        ROUTES.AGENT_MEMBER.GET_ALL_AGENT_MEMBERS,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.AGENT_MEMBER.READ]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            app.log.debug("Fetching all agent members");

            const agentId = req.user.id;

            try {
                /** ✅ Fetch all members belonging to the agent */
                const members = await prisma.agentMember.findMany({
                    where: { agentId },
                    select: {
                        agentMemberId: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        permissions: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                });

                /** ✅ Respond */
                return reply.status(200).send({
                    members
                });
            } catch (err) {
                app.log.error({ err }, "Unexpected error while fetching agent members");
                return reply.status(500).send({
                    error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR,
                });
            }
        }
    );
}
