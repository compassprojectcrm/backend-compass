import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Permission guard to check required permissions
 * @param requiredPermissions Array of permissions required
 */
export function permissionGuard(requiredPermissions: string[]) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user;

        /** Skip check if user is admin */
        if (user.permissions.includes("admin")) {
            return;
        }

        /** Check if user has all required permissions */
        const hasPermission = requiredPermissions.every(p => user.permissions.includes(p));

        if (!hasPermission) {
            return reply.status(403).send({ error: "Forbidden" });
        }
    };
}