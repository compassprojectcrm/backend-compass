/** src/routes/destinations/delete-destination.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for deleting a destination */
const deleteDestinationSchema = z.object({
    destinationId: z.coerce.number().int().positive(),
});

/** DELETE /destinations/delete */
export default async function deleteDestinationRoute(app: FastifyInstance) {
    app.delete(CONSTANTS.ROUTES.DESTINATION.DELETE, {
        preValidation: [
            app.authenticate,
            permissionGuard([CONSTANTS.PERMISSIONS.DESTINATION.DELETE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        /** Validate request body */
        const parsed = deleteDestinationSchema.safeParse(req.query);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error.format());
        }

        const { destinationId } = parsed.data;

        try {
            /** Check if destination exists */
            const destination = await prisma.destination.findUnique({
                where: { destinationId },
                include: { Package: true }
            });

            if (!destination) {
                return reply.status(404).send({ error: "Destination not found" });
            }

            /** Ensure destination belongs to a package owned by the authenticated agent */
            if (destination.Package.agentId !== req.user.userId) {
                return reply.status(403).send({ error: "Not authorized to delete this destination" });
            }

            /** Delete destination */
            await prisma.destination.delete({
                where: { destinationId }
            });

            /** Return success response */
            return reply.status(200).send({ message: "Destination deleted successfully" });
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
