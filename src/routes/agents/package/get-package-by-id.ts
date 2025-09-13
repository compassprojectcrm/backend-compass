/** src/routes/packages/get-package-by-id.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for validating route params */
const getPackageSchema = z.object({
    packageId: z.coerce.number().int().positive()
});

/** GET /packages/:packageId */
export default async function getPackageByIdRoute(app: FastifyInstance) {
    app.get(CONSTANTS.ROUTES.PACKAGE.GET_BY_ID, {
        preValidation: [
            app.authenticate,
            permissionGuard([CONSTANTS.PERMISSIONS.PACKAGE.READ])
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
                    agentId: req.user.userId,
                },
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
                            cityId: true,
                            city: {
                                select: {
                                    cityName: true,
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
