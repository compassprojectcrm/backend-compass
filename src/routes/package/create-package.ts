import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema for creating a package */
const createPackageSchema = z
    .object({
        packageName: z.string().min(1),
        tripType: z.enum(["GLOBAL", "LOCAL"]),
        price: z.number().min(0),
        description: z.string().optional(),
        isFeatured: z.boolean().optional().default(false),
        isPrivate: z.boolean().optional().default(false),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        members: z.number().min(1),

        /** Optional: copy destinations from another package */
        copyDestinationsFromPackageId: z.number().optional(),

        /** Destinations to create */
        destinations: z
            .array(
                z.object({
                    title: z.string().min(1),
                    description: z.string().optional(),
                    startDate: z.string().datetime(),
                    endDate: z.string().datetime(),
                    cityId: z.number(),
                })
            )
            .optional()
            .default([]),

        /** Travellers to subscribe at creation */
        travellerIds: z.array(z.number()).optional().default([]),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
        message: "endDate must be after startDate",
        path: ["endDate"],
    });

/** POST /packages/create */
export default async function createPackageRoute(app: FastifyInstance) {
    app.post(
        ROUTES.PACKAGE.CREATE,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.PACKAGE.CREATE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const parsed = createPackageSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const {
                    packageName,
                    tripType,
                    price,
                    description,
                    isFeatured,
                    isPrivate,
                    startDate,
                    endDate,
                    members,
                    destinations,
                    copyDestinationsFromPackageId,
                    travellerIds,
                } = parsed.data;

                let finalDestinations = destinations;

                /** Copy destinations from another package if requested */
                if (copyDestinationsFromPackageId) {
                    const sourcePackage = await prisma.package.findUnique({
                        where: { packageId: copyDestinationsFromPackageId },
                        include: { destinations: true },
                    });

                    if (!sourcePackage) {
                        return reply.status(404).send({ error: "Source package not found" });
                    }

                    finalDestinations = [
                        ...finalDestinations,
                        ...sourcePackage.destinations.map((d) => ({
                            title: d.title,
                            description: d.description ?? undefined,
                            startDate: d.startDate.toISOString(),
                            endDate: d.endDate.toISOString(),
                            cityId: d.cityId,
                        })),
                    ];
                }

                /** Create package */
                const newPackage = await prisma.package.create({
                    data: {
                        packageName,
                        tripType,
                        price,
                        description: description ?? null,
                        isFeatured,
                        isPrivate,
                        members,
                        startDate: new Date(startDate),
                        endDate: new Date(endDate),
                        agent: { connect: { agentId: req.user.id } },

                        /** Create destinations */
                        destinations: {
                            create: finalDestinations.map((d) => ({
                                title: d.title,
                                description: d.description ?? null,
                                startDate: new Date(d.startDate),
                                endDate: new Date(d.endDate),
                                cityId: d.cityId,
                            })),
                        },

                        /** Subscribe travellers */
                        subscriptions: {
                            create: travellerIds.map((travellerId) => ({
                                traveller: { connect: { travellerId } },
                            })),
                        },
                    },
                    select: {
                        packageId: true,
                        packageName: true,
                        tripType: true,
                        price: true,
                        members: true,
                        status: true,
                        startDate: true,
                        endDate: true,
                        isFeatured: true,
                        isPrivate: true,
                        destinations: {
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
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        subscriptions: {
                            select: {
                                traveller: {
                                    select: {
                                        travellerId: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                    },
                                },
                                subscribedAt: true,
                            }
                        }
                    },
                });

                return reply.status(201).send({ package: newPackage });
            } catch (err: any) {
                console.error(err);
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
