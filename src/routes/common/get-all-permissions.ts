import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPermissionKeysByRole, PERMISSIONS } from "../../constants/permissions";
import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";
import { permissionGuard } from "../../middleware/auth";

export default async function getAllPermissionsRoute(app: FastifyInstance) {
    app.get(
        ROUTES.COMMON.GET_ALL_PERMISSIONS,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.COMMON.GET_ALL_PERMISSIONS]),
            ],
        },
        async (_req: FastifyRequest, reply: FastifyReply) => {
            app.log.debug("Fetching all agent permissions");

            try {
                /** ✅ Get all permissions for AGENT */
                const permissions = getPermissionKeysByRole(ROLES.AGENT);

                /** ✅ Respond */
                return reply.status(200).send({
                    message: "Permissions for agent role fetched successfully",
                    role: ROLES.AGENT,
                    permissions,
                });
            } catch (err) {
                app.log.error({ err }, "Unexpected error while fetching permissions");
                return reply.status(500).send({
                    error: "Internal server error",
                });
            }
        }
    );
}
