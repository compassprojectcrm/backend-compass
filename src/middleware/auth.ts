import { FastifyReply, FastifyRequest } from "fastify";
import { ROLES } from "../constants/roles";

type Permission = {
    key: string;
    roles: typeof ROLES[keyof typeof ROLES][];
};

/**
 * Permission guard to check required permissions
 * @param requiredPermissions Array of permissions required
 */
export function permissionGuard(requiredPermissions: Permission[]) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user;

        /** Check if user has all required permissions */
        const hasPermission = requiredPermissions.every((perm) => {
            const roleMatches = perm.roles.includes(user.role);
            const permissionExists = user.permissions.includes(perm.key);
            return roleMatches && permissionExists;
        });

        if (!hasPermission) {
            return reply.status(403).send({ error: "Forbidden" });
        }
    };
}