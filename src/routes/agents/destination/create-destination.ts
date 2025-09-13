/** src/routes/destinations/create-destination.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for creating a destination */
const createDestinationSchema = z.object({
    cityId: z.number().int().positive(),
    packageId: z.number().int().positive(),
});

/** POST /destinations/create */
export default async function createDestinationRoute(app: FastifyInstance) {
    app.post(CONSTANTS.ROUTES.DESTINATION.CREATE, {
        preValidation: [
            app.authenticate,
            permissionGuard([CONSTANTS.PERMISSIONS.DESTINATION.CREATE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        /** Validate request body */
        const parsed = createDestinationSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error.format());
        }

        const { cityId, packageId } = parsed.data;

        try {
            /** Ensure city exists */
            const cityExists = await prisma.city.findUnique({ where: { cityId } });
            if (!cityExists) {
                return reply.status(404).send({ error: "City not found" });
            }

            /** Ensure package exists and belongs to the authenticated agent */
            const packageExists = await prisma.package.findFirst({
                where: { packageId, agentId: req.user.userId }
            });
            if (!packageExists) {
                return reply.status(404).send({ error: "Package not found or not owned by agent" });
            }

            /** Prevent duplicate destination (same city in the same package) */
            const alreadyExists = await prisma.destination.findFirst({
                where: { cityId, packageId }
            });
            if (alreadyExists) {
                return reply.status(400).send({ error: "This city is already added to the package" });
            }

            /** Create destination */
            const destination = await prisma.destination.create({
                data: {
                    city: { connect: { cityId } },
                    Package: { connect: { packageId } },
                },
                select: {
                    destinationId: true,
                    city: {
                        select: {
                            cityName: true,
                            cityId: true,
                        },
                    },
                    Package: {
                        select: {
                            packageId: true,
                            packageName: true,
                            tripType: true,
                            status: true,
                            price: true,
                            description: true,
                            isFeatured: true,
                            isPrivate: true,
                            startDate: true,
                            endDate: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            });


            /** Return created destination */
            return reply.status(201).send({ destination });
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
