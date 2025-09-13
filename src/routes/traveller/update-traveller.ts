/** src/routes/packages/update-travellers.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema for updating multiple traveller subscriptions */
const updateTravellersSchema = z.object({
    packageId: z.number().int().positive(),
    travellers: z.array(
        z.object({
            travellerId: z.number().int().positive(),
            moneyPaid: z.number().min(0).optional(),
        })
    ).nonempty()
});

/** PUT /packages/update-travellers */
export default async function updateTravellersRoute(app: FastifyInstance) {
    app.put(
        ROUTES.TRAVELLER.UPDATE_TRAVELLER,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.PACKAGE.UPDATE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const parsed = updateTravellersSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { packageId, travellers } = parsed.data;

                /** Ensure package exists and belongs to agent */
                const pkg = await prisma.package.findFirst({
                    where: { packageId, agentId: req.user.id },
                });
                if (!pkg) {
                    return reply
                        .status(404)
                        .send({ error: "Package not found or not owned by agent" });
                }

                const updatedSubscriptions = [];

                for (const t of travellers) {
                    /** Find subscription */
                    const subscription = await prisma.packageSubscription.findFirst({
                        where: { packageId, travellerId: t.travellerId },
                    });
                    if (!subscription) continue;

                    /** Update subscription */
                    const updated = await prisma.packageSubscription.update({
                        where: { id: subscription.id },
                        data: { moneyPaid: t.moneyPaid ?? subscription.moneyPaid },
                        select: {
                            traveller: {
                                select: {
                                    travellerId: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                            moneyPaid: true,
                            subscribedAt: true,
                        },
                    });

                    updatedSubscriptions.push(updated);
                }

                return reply.status(200).send({ subscriptions: updatedSubscriptions });
            } catch (err) {
                console.error(err);
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
