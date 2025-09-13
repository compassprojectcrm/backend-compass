/** src/routes/packages/add-travellers.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema */
const addTravellersSchema = z.object({
    packageId: z.number().int().positive(),
    travellers: z.array(
        z.object({
            travellerId: z.number().int().positive(),
            moneyPaid: z.number().min(0).optional().default(0),
        })
    ).nonempty(),
});

/** POST /packages/add-travellers */
export default async function addTravellersRoute(app: FastifyInstance) {
    app.post(
        ROUTES.TRAVELLER.ADD_TRAVELLER,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.PACKAGE.UPDATE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const parsed = addTravellersSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { packageId, travellers } = parsed.data;

                /** Ensure package exists and belongs to the agent */
                const pkg = await prisma.package.findFirst({
                    where: { packageId, agentId: req.user.id },
                });
                if (!pkg) {
                    return reply
                        .status(404)
                        .send({ error: "Package not found or not owned by agent" });
                }

                /** Filter out travellerIds already subscribed */
                const existingSubscriptions = await prisma.packageSubscription.findMany({
                    where: { packageId, travellerId: { in: travellers.map(t => t.travellerId) } },
                    select: { travellerId: true },
                });
                const alreadySubscribedIds = new Set(
                    existingSubscriptions.map((s) => s.travellerId)
                );
                const newTravellers = travellers.filter(
                    (t) => !alreadySubscribedIds.has(t.travellerId)
                );

                if (newTravellers.length === 0) {
                    return reply.status(400).send({ error: "All travellers are already subscribed" });
                }

                /** Ensure travellers exist */
                const existingTravellerRecords = await prisma.traveller.findMany({
                    where: { travellerId: { in: newTravellers.map(t => t.travellerId) } },
                    select: { travellerId: true },
                });
                const existingTravellerIds = new Set(
                    existingTravellerRecords.map((t) => t.travellerId)
                );
                const validTravellers = newTravellers.filter((t) =>
                    existingTravellerIds.has(t.travellerId)
                );

                if (validTravellers.length === 0) {
                    return reply.status(404).send({ error: "No valid travellers found to subscribe" });
                }

                /** Create subscriptions individually to handle moneyPaid */
                const createdSubscriptions = [];
                for (const t of validTravellers) {
                    const subscription = await prisma.packageSubscription.create({
                        data: {
                            packageId,
                            travellerId: t.travellerId,
                            moneyPaid: t.moneyPaid ?? 0,
                        },
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
                    createdSubscriptions.push(subscription);
                }

                return reply.status(200).send({ travellers: createdSubscriptions });
            } catch (err) {
                console.error(err);
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
