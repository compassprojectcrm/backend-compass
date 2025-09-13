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
            permissionGuard([PERMISSIONS.DESTINATION.DELETE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Validate request body */
            const parsed = deleteDestinationsSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { packageId, destinationIds } = parsed.data;

            /** Ensure package exists and belongs to the agent */
            const pkg = await prisma.package.findUnique({
                where: { packageId },
            });
            if (!pkg || pkg.agentId !== req.user.id) {
                return reply.status(404).send({ error: "Package not found!" });
            }

            /** Fetch destinations to ensure they belong to this package */
            const destinations = await prisma.destination.findMany({
                where: { destinationId: { in: destinationIds }, packageId },
            });

            if (destinations.length === 0) {
                return reply.status(404).send({ error: "No destinations found for this package!" });
            }

            /** Check if any provided IDs do not exist in the package */
            const fetchedIds = new Set(destinations.map(d => d.destinationId));
            const invalidIds = destinationIds.filter(id => !fetchedIds.has(id));
            if (invalidIds.length > 0) {
                return reply.status(400).send({
                    error: "Some destinations are invalid for this package!"
                });
            }

            /** Delete destinations */
            await prisma.destination.deleteMany({
                where: { destinationId: { in: destinationIds } }
            });

            return reply.status(200).send({ message: "Destinations deleted successfully!" });
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
