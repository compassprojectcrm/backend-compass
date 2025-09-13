/** src/routes/packages/get-packages.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** GET /packages */
export default async function getPackagesRoute(app: FastifyInstance) {
    app.get(CONSTANTS.ROUTES.PACKAGE.GET_ALL, {
        preValidation: [
            app.authenticate,
            permissionGuard([CONSTANTS.PERMISSIONS.PACKAGE.READ])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Fetch all packages for the authenticated agent */
            const packages = await prisma.package.findMany({
                where: { agentId: req.user.userId },
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
                    destinations: {
                        select: {
                            destinationId: true,
                            city: {
                                select: {
                                    cityId: true,
                                    cityName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            return reply.send({ packages });
        } catch (err: any) {
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
