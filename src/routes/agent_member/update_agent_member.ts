import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";
import { permissionGuard } from "../../middleware/auth";

/** Zod schema for updating Agent Member */
const updateAgentMemberSchema = z.object({
    agentMemberId: z.number(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    password: z.string().min(6).optional(),
    permissions: z.array(z.string()).optional(),
});

export default async function updateAgentMemberRoute(app: FastifyInstance) {
    app.put(
        ROUTES.AGENT_MEMBER.UPDATE_AGENT_MEMBER,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.AGENT_MEMBER.UPDATE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            app.log.debug("Agent member update request received");

            /** ✅ Step 1 — Validate Input */
            const parsed = updateAgentMemberSchema.safeParse(req.body);
            if (!parsed.success) {
                app.log.debug({ issues: parsed.error.issues }, "Validation failed");
                return reply.status(400).send(parsed.error.format());
            }

            const { agentMemberId, firstName, lastName, password, permissions } = parsed.data;
            const agentId = req.user.id;

            try {
                /** ✅ Step 2 — Verify agent */
                const agent = await prisma.agent.findUnique({
                    where: {
                        agentId
                    },
                    select: {
                        agentId: true
                    },
                });

                if (!agent) {
                    app.log.debug({ agentId }, "Agent not found or unauthorized");
                    return reply.status(403).send({ error: CONSTANTS.ERRORS.UNAUTHORIZED });
                }

                /** ✅ Step 3 — Verify member belongs to this agent */
                const existingMember = await prisma.agentMember.findUnique({
                    where: {
                        agentMemberId,
                        agentId
                    },
                    select: {
                        agentMemberId: true,
                        agentId: true
                    },
                });

                if (!existingMember) {
                    app.log.debug({ agentMemberId, agentId }, "Member not found or unauthorized");
                    return reply.status(404).send({ error: CONSTANTS.ERRORS.NOT_FOUND });
                }

                /** ✅ Step 4 — Prepare update data */
                const updateData: any = {};

                if (firstName) updateData.firstName = firstName;
                if (lastName) updateData.lastName = lastName;
                if (permissions) updateData.permissions = permissions;

                if (password) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    updateData.password = hashedPassword;
                }

                /** ✅ Step 5 — Update member */
                const updatedMember = await prisma.agentMember.update({
                    where: {
                        agentMemberId
                    },
                    data: updateData,
                });

                app.log.info(
                    { agentMemberId: updatedMember.agentMemberId },
                    "Agent member updated successfully"
                );

                /** ✅ Step 6 — Respond */
                return reply.status(200).send({
                    message: "Agent member updated successfully."
                });
            } catch (err) {
                app.log.error({ err }, "Unexpected error during agent member update");
                return reply.status(500).send({
                    error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR,
                });
            }
        }
    );
}
