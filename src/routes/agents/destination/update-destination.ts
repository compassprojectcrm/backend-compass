/** src/routes/destinations/update-destination.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for updating a destination */
const updateDestinationSchema = z.object({
    destinationId: z.number().int().positive(),
    cityId: z.number().int().positive()
});

/** PUT /destinations/update */
export default async function updateDestinationRoute(app: FastifyInstance) {
    app.put(
        CONSTANTS.ROUTES.DESTINATION.UPDATE,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([CONSTANTS.PERMISSIONS.DESTINATION.UPDATE])
            ]
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            /** Validate request body */
            const parsed = updateDestinationSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { destinationId, cityId } = parsed.data;

            try {
                /** Check if destination exists and fetch its package */
                const destination = await prisma.destination.findUnique({
                    where: { destinationId },
                    include: { Package: true }
                });

                if (!destination) {
                    return reply.status(404).send({
                        success: false,
                        message: "Destination not found"
                    });
                }

                /** Ensure destination belongs to a package owned by authenticated agent */
                if (destination.Package.agentId !== req.user.userId) {
                    return reply.status(403).send({
                        success: false,
                        message: "Not authorized to update this destination"
                    });
                }

                /** Update the destination city */
                const updatedDestination = await prisma.destination.update({
                    where: { destinationId },
                    data: { cityId },
                    select: {
                        destinationId: true,
                        city: {
                            select: {
                                cityId: true,
                                cityName: true,
                                state: {
                                    select: {
                                        stateId: true,
                                        stateName: true,
                                        country: {
                                            select: {
                                                countryId: true,
                                                countryName: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                /** Return updated destination */
                return reply.status(200).send({
                    destination: updatedDestination
                });
            } catch (err) {
                req.log.error(err);
                return reply.status(500).send({
                    success: false,
                    message: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR
                });
            }
        }
    );
}
