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
    travellers: z
        .array(
            z.object({
                travellerId: z.number().int().positive(),
                moneyPaid: z.number().min(0).optional().default(0),
            })
        )
        .nonempty(),
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
                    select: { packageId: true, members: true },
                });

                if (!pkg) {
                    return reply
                        .status(404)
                        .send({ error: "Package not found or you do not have permission to modify it." });
                }

                /** Count current subscribers */
                const currentCount = await prisma.packageSubscription.count({
                    where: { packageId },
                });

                /** Check if adding these travellers exceeds members limit */
                if (currentCount + travellers.length > pkg.members) {
                    return reply.status(400).send({
                        error: `Cannot add travellers. Package allows a maximum of ${pkg.members} members.`,
                    });
                }

                /** Create subscriptions in bulk, skipping duplicates or invalid IDs */
                await prisma.packageSubscription.createMany({
                    data: travellers.map(t => ({
                        packageId,
                        travellerId: t.travellerId,
                        moneyPaid: t.moneyPaid ?? 0,
                    })),
                    skipDuplicates: true,
                });

                /** Fetch created subscriptions for response */
                const createdSubscriptions = await prisma.packageSubscription.findMany({
                    where: { packageId },
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