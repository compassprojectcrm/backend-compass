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
    travellers: z
        .array(
            z.object({
                travellerId: z.number().int().positive(),
                moneyPaid: z.number().min(0).optional(),
            })
        )
        .nonempty()
        .max(100),
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

                /** Deduplicate traveller IDs (last occurrence wins) */
                const uniqueTravellersMap = new Map<number, { travellerId: number; moneyPaid?: number }>();
                travellers.forEach(t => uniqueTravellersMap.set(t.travellerId, t));
                const uniqueTravellers = Array.from(uniqueTravellersMap.values());

                /** Ensure package exists and belongs to agent */
                const pkg = await prisma.package.findFirst({
                    where: { packageId, agentId: req.user.id },
                });

                if (!pkg) {
                    return reply
                        .status(404)
                        .send({ error: "Package not found or you do not have permission to modify it." });
                }

                /** Fetch all existing subscriptions for this package */
                const existingSubs = await prisma.packageSubscription.findMany({
                    where: {
                        packageId,
                        travellerId: { in: uniqueTravellers.map(t => t.travellerId) },
                    },
                });

                const subMap = new Map(existingSubs.map(s => [s.travellerId, s]));

                /** Prepare updates for valid subscriptions */
                const updates = uniqueTravellers
                    .filter(t => subMap.has(t.travellerId))
                    .map(t =>
                        prisma.packageSubscription.update({
                            where: { id: subMap.get(t.travellerId)!.id },
                            data: { moneyPaid: t.moneyPaid ?? subMap.get(t.travellerId)!.moneyPaid },
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
                        })
                    );

                const updatedSubscriptions = updates.length > 0 ? await prisma.$transaction(updates) : [];

                return reply.status(200).send({ travellers: updatedSubscriptions });
            } catch (err) {
                console.error(err);
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}