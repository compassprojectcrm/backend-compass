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
        tripType: z.enum(["INTERNATIONAL", "DOMESTIC"]),
        price: z.number().min(0),
        description: z.string().optional(),
        isFeatured: z.boolean().optional().default(false),
        isPrivate: z.boolean().optional().default(false),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        members: z.number().min(1),

        /** Optional: copy destinations from another package */
        copyDestinationsFromPackageId: z.number().optional(),

        /** Destinations to create (max 20 per request) */
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
            .max(20, "You can only add up to 20 destinations at a time")
            .optional()
            .default([]),

        /** Travellers to subscribe at creation (max 100 per request) */
        travellerEmails: z
            .array(z.string().email())
            .max(100, "You can only add up to 100 travellers at a time")
            .optional()
            .default([]),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
        message: "endDate must be after startDate",
        path: ["endDate"],
    })
    .refine(
        (data) =>
            data.destinations.every(
                (d) => new Date(d.endDate) > new Date(d.startDate)
            ),
        {
            message: "In destinations, endDate must be after startDate",
            path: ["destinations"],
        }
    );

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
            const agentId = (req.user as any)?.id;
            app.log.info({ agentId }, "Incoming create package request");

            try {
                /** Validate request */
                const parsed = createPackageSchema.safeParse(req.body);
                if (!parsed.success) {
                    app.log.warn(
                        { agentId, issues: parsed.error.issues },
                        "Package creation validation failed"
                    );
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
                    travellerEmails,
                } = parsed.data;

                app.log.debug(
                    {
                        agentId,
                        packageName,
                        tripType,
                        members,
                        hasDestinations: destinations.length > 0,
                        copyFrom: copyDestinationsFromPackageId ?? null,
                    },
                    "Parsed package creation data"
                );

                let finalDestinations = destinations;

                /** Copy destinations if needed */
                if (finalDestinations.length === 0 && copyDestinationsFromPackageId) {
                    app.log.info(
                        { agentId, sourcePackageId: copyDestinationsFromPackageId },
                        "Copying destinations from another package"
                    );

                    const sourcePackage = await prisma.package.findUnique({
                        where: {
                            packageId: copyDestinationsFromPackageId,
                            agentId,
                        },
                        include: { destinations: true },
                    });

                    if (!sourcePackage) {
                        app.log.warn(
                            { agentId, copyDestinationsFromPackageId },
                            "Source package not found or not owned by agent"
                        );
                        return reply.status(404).send({
                            error: "package not found or not owned by agent",
                        });
                    }

                    finalDestinations = sourcePackage.destinations.map((d) => ({
                        title: d.title,
                        description: d.description ?? undefined,
                        startDate: d.startDate.toISOString(),
                        endDate: d.endDate.toISOString(),
                        cityId: d.cityId,
                    }));

                    app.log.debug(
                        { agentId, copiedCount: finalDestinations.length },
                        "Copied destinations from existing package"
                    );
                }

                /** Validate traveller emails */
                let validTravellerIds: number[] = [];
                if (travellerEmails.length > 0) {
                    app.log.debug(
                        { agentId, travellerEmails },
                        "Validating traveller emails"
                    );

                    const validTravellers = await prisma.traveller.findMany({
                        where: { email: { in: travellerEmails } },
                        select: { travellerId: true, email: true },
                    });

                    const validEmails = validTravellers.map((t) => t.email);
                    if (validEmails.length !== travellerEmails.length) {
                        const invalids = travellerEmails.filter(
                            (e) => !validEmails.includes(e)
                        );
                        app.log.warn(
                            { agentId, invalidEmails: invalids },
                            "Invalid traveller emails detected"
                        );
                        return reply
                            .status(400)
                            .send({ error: "One or more traveller emails are invalid!" });
                    }

                    validTravellerIds = validTravellers.map((t) => t.travellerId);
                    app.log.debug(
                        { agentId, validTravellerCount: validTravellerIds.length },
                        "Validated traveller emails successfully"
                    );
                }

                /** Validate city IDs */
                const cityIds = finalDestinations.map((d) => d.cityId);
                if (cityIds.length > 0) {
                    app.log.debug({ agentId, cityIds }, "Validating city IDs");

                    const validCities = await prisma.city.findMany({
                        where: { cityId: { in: cityIds } },
                        select: { cityId: true },
                    });

                    const validCityIds = validCities.map((c) => c.cityId);
                    if (validCityIds.length !== cityIds.length) {
                        const invalidCityIds = cityIds.filter(
                            (id) => !validCityIds.includes(id)
                        );
                        app.log.warn(
                            { agentId, invalidCityIds },
                            "Invalid city IDs provided"
                        );
                        return reply
                            .status(400)
                            .send({ error: "One or more city IDs are invalid!" });
                    }
                }

                /** Create package */
                app.log.info(
                    { agentId, packageName },
                    "Creating new package in database"
                );

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
                        agent: { connect: { agentId } },
                        destinations: {
                            create: finalDestinations.map((d) => ({
                                title: d.title,
                                description: d.description ?? null,
                                startDate: new Date(d.startDate),
                                endDate: new Date(d.endDate),
                                cityId: d.cityId,
                            })),
                        },
                        subscriptions: {
                            create: validTravellerIds.map((travellerId) => ({
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
                                moneyPaid: true,
                            },
                        },
                    },
                });

                app.log.info(
                    { agentId, packageId: newPackage.packageId },
                    "Package created successfully"
                );

                return reply.status(201).send({ package: newPackage });
            } catch (err: any) {
                app.log.error(
                    { err, agentId },
                    "Unexpected error during package creation"
                );
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}