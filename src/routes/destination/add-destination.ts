/** src/routes/destinations/create-destination.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema for creating one or more destinations */
const createDestinationsSchema = z.object({
    packageId: z.number().int().positive(),
    destinations: z.array(
        z.object({
            cityId: z.number().int().positive(),
            title: z.string().min(1),
            description: z.string().optional(),
            startDate: z.string().datetime(),
            endDate: z.string().datetime(),
        }).refine(
            (data) => new Date(data.endDate) > new Date(data.startDate),
            { message: "endDate must be after startDate", path: ["endDate"] }
        )
    ).nonempty(),
});

/** POST /destinations/create */
export default async function createDestinationRoute(app: FastifyInstance) {
    app.post(ROUTES.DESTINATION.CREATE, {
        preValidation: [
            app.authenticate,
            permissionGuard([PERMISSIONS.DESTINATION.CREATE]),
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Validate request body */
            const parsed = createDestinationsSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { packageId, destinations } = parsed.data;

            /** Ensure package exists and belongs to the authenticated agent */
            const pkg = await prisma.package.findFirst({
                where: { packageId, agentId: req.user.id }
            });

            if (!pkg) {
                return reply.status(404).send({ error: "Package not found or not owned by agent" });
            }

            /** Validate that all cities exist */
            const cityIds = destinations.map(d => d.cityId);

            const existingCities = await prisma.city.findMany({
                where: { cityId: { in: cityIds } },
                select: { cityId: true },
            });

            const existingCityIds = new Set(existingCities.map(c => c.cityId));
            const invalidCities = destinations.filter(d => !existingCityIds.has(d.cityId));

            if (invalidCities.length > 0) {
                return reply.status(404).send({
                    error: "One or more city IDs are invalid!"
                });
            }

            /** Create all destinations inside a transaction and return them with city, state, country */
            const createdDestinations = await prisma.$transaction(
                destinations.map(d =>
                    prisma.destination.create({
                        data: {
                            title: d.title,
                            description: d.description ?? null,
                            startDate: new Date(d.startDate),
                            endDate: new Date(d.endDate),
                            cityId: d.cityId,
                            packageId,
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
                                                    countryName: true,
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    })
                )
            );

            return reply.status(201).send({
                destinations: createdDestinations
            });
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
