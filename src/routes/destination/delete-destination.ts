/** src/routes/destinations/delete-destination.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema for deleting multiple destinations with packageId */
const deleteDestinationsSchema = z.object({
    packageId: z.number().int().positive(),
    destinationIds: z.array(z.coerce.number().int().positive()).nonempty(),
});

/** DELETE /destinations/delete */
export default async function deleteDestinationRoute(app: FastifyInstance) {
    app.delete(ROUTES.DESTINATION.DELETE, {
        preValidation: [
            app.authenticate,
            permissionGuard([PERMISSIONS.DESTINATION.DELETE]),
        ],
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Validate request body */
            const parsed = deleteDestinationsSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { packageId, destinationIds } = parsed.data;

            /** Ensure package exists and belongs to the agent */
            const pkg = await prisma.package.findFirst({
                where: { packageId, agentId: req.user.id },
            });

            if (!pkg) {
                return reply.status(404).send({ error: "Package not found or not owned by you" });
            }

            /** Delete destinations (silently skips invalid IDs) */
            const result = await prisma.destination.deleteMany({
                where: {
                    destinationId: { in: destinationIds },
                    packageId,
                },
            });

            return reply.status(200).send({
                message: "Destinations deleted successfully!",
                deleted: result.count
            });
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
