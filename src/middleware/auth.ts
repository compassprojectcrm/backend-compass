import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../prisma";
import { ROLES } from "../constants/roles";
import { getPermissionKeysByRole } from "../constants/permissions";
import { CONSTANTS } from "../constants/constants";

type Permission = {
    key: string;
    roles: typeof ROLES[keyof typeof ROLES][];
};

/**
 * Permission guard — validates user existence and permissions.
 * - Verifies the user still exists in the DB.
 * - AGENT → full access.
 * - AGENT_MEMBER → replaces req.user.id with agentId.
 * - TRAVELLER → uses static permissions.
 */
export function permissionGuard(requiredPermissions: Permission[]) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user;

        try {
            let userPermissions: string[] = [];

            /** ✅ Step 1 — Check if user still exists and update context */
            if (user.role === ROLES.AGENT) {
                const agent = await prisma.agent.findUnique({
                    where: {
                        agentId: user.id
                    },
                    select: {
                        agentId: true
                    },
                });

                if (!agent) {
                    req.log.warn({ userId: user.id }, "Agent not found in database");
                    return reply.status(401).send({ error: CONSTANTS.ERRORS.FORBIDDEN });
                }

                req.log.debug({ userId: user.id }, "Agent validated");
                userPermissions = getPermissionKeysByRole(ROLES.AGENT);
            } else if (user.role === ROLES.AGENT_MEMBER) {
                const member = await prisma.agentMember.findUnique({
                    where: {
                        agentMemberId: user.id
                    },
                    select: {
                        permissions: true, agentId: true
                    },
                });

                if (!member) {
                    req.log.warn({ userId: user.id }, "Agent member not found in database");
                    return reply.status(401).send({ error: CONSTANTS.ERRORS.FORBIDDEN });
                }

                /** ✅ Step 2 — Replace req.user.id with parent agent’s ID */
                req.user.id = member.agentId;
                userPermissions = member.permissions;

                req.log.debug(
                    { memberId: user.id, agentId: member.agentId },
                    "Agent member validated - user ID replaced with agentId"
                );
            } else if (user.role === ROLES.TRAVELLER) {
                const traveller = await prisma.traveller.findUnique({
                    where: {
                        travellerId: user.id
                    },
                    select: {
                        travellerId: true
                    },
                });

                if (!traveller) {
                    req.log.warn({ userId: user.id }, "Traveller not found in database");
                    return reply.status(401).send({ error: CONSTANTS.ERRORS.FORBIDDEN });
                }

                userPermissions = getPermissionKeysByRole(ROLES.TRAVELLER);
            } else {
                req.log.warn({ role: user.role }, "Unauthorized role");
                return reply.status(403).send({ error: CONSTANTS.ERRORS.FORBIDDEN });
            }

            /** ✅ Step 3 — Validate permissions */
            const hasPermission = requiredPermissions.every((perm) => {
                const roleMatches = perm.roles.includes(user.role);
                const permissionExists = userPermissions.includes(perm.key);
                return roleMatches && permissionExists;
            });

            if (!hasPermission) {
                req.log.debug(
                    { userId: user.id, missing: requiredPermissions.map((p) => p.key) },
                    "Permission denied"
                );
                return reply.status(403).send({ error: CONSTANTS.ERRORS.FORBIDDEN });
            }

            req.log.debug({ userId: req.user.id }, "Permission check passed");
        } catch (err) {
            req.log.error({ err, userId: req.user?.id }, "Error in permission guard");
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    };
}
