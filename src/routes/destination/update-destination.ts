/** src/routes/destinations/update-destination.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { PERMISSIONS } from "../../constants/permissions";
import { ROUTES } from "../../constants/routes";

/** Zod schema for updating multiple destinations in same package */
const updateDestinationsSchema = z.object({
    packageId: z.number().int().positive(),
    destinations: z.array(
        z.object({
            destinationId: z.number().int().positive(),
            title: z.string().min(1).optional(),
            description: z.string().optional(),
            startDate: z.string().datetime().optional(),
            endDate: z.string().datetime().optional(),
            cityId: z.number().int().positive().optional()
        }).refine(
            (data) => !data.startDate || !data.endDate || new Date(data.endDate) > new Date(data.startDate),
            { message: "endDate must be after startDate", path: ["endDate"] }
        )
    ).nonempty()
});

/** PUT /destinations/update */
export default async function updateDestinationRoute(app: FastifyInstance) {
    app.put(
        ROUTES.DESTINATION.UPDATE,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.DESTINATION.UPDATE])
            ]
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const parsed = updateDestinationsSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { packageId, destinations } = parsed.data;

                /** Ensure package exists and belongs to agent */
                const pkg = await prisma.package.findFirst({
                    where: { packageId, agentId: req.user.id },
                });

                if (!pkg) {
                    return reply.status(404).send({ error: "Package not found or not owned by agent" });
                }

                /** Fetch all valid destinations in this package */
                const destinationIds = destinations.map(d => d.destinationId);
                const validDestinations = await prisma.destination.findMany({
                    where: { destinationId: { in: destinationIds }, packageId },
                });

                const validDestinationIds = new Set(validDestinations.map(d => d.destinationId));

                /** Use a transaction to update all valid destinations */
                const updatedResults = await prisma.$transaction(
                    destinations
                        .filter(d => validDestinationIds.has(d.destinationId))
                        .map(({ destinationId, ...updateData }) =>
                            prisma.destination.update({
                                where: { destinationId },
                                data: {
                                    ...updateData,
                                    ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
                                    ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
                                },
                                select: {
                                    destinationId: true,
                                    title: true,
                                    description: true,
                                    startDate: true,
                                    endDate: true,
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
                            })
                        )
                );

                return reply.status(200).send({ destinations: updatedResults });
            } catch (err) {
                return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
