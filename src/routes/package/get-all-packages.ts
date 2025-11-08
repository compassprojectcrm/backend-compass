/** src/routes/packages/get-packages.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";
import { ROLES } from "../../constants/roles";
import { z } from "zod";

/** Zod schema for validating query params for non-agent users */
const getPackagesQuerySchema = z.object({
    agentId: z.coerce.number().int().positive(),
});

/** GET /packages */
export default async function getPackagesRoute(app: FastifyInstance) {
    app.get(
        ROUTES.PACKAGE.GET_ALL,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.PACKAGE.READ]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const isAgent = req.user.role === ROLES.AGENT;

                let agentId: number | undefined;

                if (isAgent) {
                    /** Agent can fetch their own packages */
                    agentId = req.user.id;
                } else {
                    /** Non-agent must provide agentId as query param */
                    const parsedQuery = getPackagesQuerySchema.safeParse(req.query);
                    if (!parsedQuery.success) {
                        return reply.status(400).send(parsedQuery.error.format());
                    }
                    agentId = parsedQuery.data.agentId;
                }

                /** Fetch packages */
                const packages = await prisma.package.findMany({
                    where: isAgent
                        ? { agentId } // ✅ agents: only their own packages
                        : {
                            agentId, // ✅ traveller must still specify which agent
                            OR: [
                                { isPrivate: false }, // ✅ public packages
                                {
                                    subscriptions: {
                                        some: { travellerId: req.user.id }, // ✅ private but subscribed
                                    },
                                },
                            ],
                        },
                    select: {
                        packageId: true,
                        packageName: true,
                        tripType: true,
                        status: true,
                        price: true,
                        members: true,
                        description: true,
                        isFeatured: true,
                        isPrivate: true,
                        startDate: true,
                        endDate: true,
                        days: true,
                        nights: true,
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

                        /** Conditional traveller info */
                        ...(isAgent
                            ? {
                                subscriptions: {
                                    select: {
                                        traveller: {
                                            select: {
                                                travellerId: true,
                                                firstName: true,
                                                lastName: true,
                                                username: true,
                                            },
                                        },
                                        subscribedAt: true,
                                        moneyPaid: true,
                                    },
                                },
                            }
                            : {
                                _count: { select: { subscriptions: true } },
                            }),
                    },
                    orderBy: { createdAt: "desc" },
                });

                return reply.send({ packages });
            } catch (err: any) {
                return reply.status(500).send({
                    error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR
                });
            }
        }
    );
}
