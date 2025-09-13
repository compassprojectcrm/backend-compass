/** src/routes/packages/get-package-by-id.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema for validating route params */
const getPackageSchema = z.object({
    packageId: z.coerce.number().int().positive()
});

/** GET /packages/:packageId */
export default async function getPackageByIdRoute(app: FastifyInstance) {
    app.get(ROUTES.PACKAGE.GET_BY_ID, {
        preValidation: [
            app.authenticate,
            permissionGuard([PERMISSIONS.PACKAGE.READ])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Validate params */
            const parsed = getPackageSchema.safeParse(req.query);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { packageId } = parsed.data;

            /** Fetch the package for the authenticated agent */
            const packageItem = await prisma.package.findFirst({
                where: {
                    packageId,
                    agentId: req.user.id,
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
                                                    countryName: true
                                                }
                                            }
                                        }
                                    }
                                },
                            },
                        },
                    },
                },
            });

            if (!packageItem) {
                return reply.status(404).send({ error: CONSTANTS.ERRORS.NOT_FOUND });
            }

            return reply.send({ package: packageItem });
        } catch (err: any) {
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
