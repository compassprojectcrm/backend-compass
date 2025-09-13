/** src/routes/packages/remove-travellers.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema */
const removeTravellersSchema = z.object({
    packageId: z.number().int().positive(),
    travellerIds: z.array(z.number().int().positive()).nonempty(),
});

/** DELETE /packages/remove-travellers */
export default async function removeTravellersRoute(app: FastifyInstance) {
    app.delete(
        ROUTES.TRAVELLER.REMOVE_TRAVELLER,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.PACKAGE.UPDATE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const parsed = removeTravellersSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { packageId, travellerIds } = parsed.data;

                /** Ensure package exists and belongs to agent */
                const pkg = await prisma.package.findFirst({
                    where: { packageId, agentId: req.user.id },
                });
                if (!pkg) {
                    return reply
                        .status(404)
                        .send({ error: "Package not found or not owned by agent" });
                }

                /** Delete subscriptions for provided travellerIds */
                await prisma.packageSubscription.deleteMany({
                    where: {
                        packageId,
                        travellerId: { in: travellerIds },
                    },
                });

                /** Return updated travellers list */
                const updatedTravellers = await prisma.packageSubscription.findMany({
                    where: { packageId },
                    select: {
                        traveller: {
                            select: { travellerId: true, firstName: true, lastName: true, email: true },
                        },
                        subscribedAt: true,
                    },
                });

                return reply.status(200).send({ travellers: updatedTravellers });
            } catch (err) {
                console.error(err);
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
