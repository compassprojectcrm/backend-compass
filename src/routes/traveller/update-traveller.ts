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
                email: z.string().email(),
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
                permissionGuard([PERMISSIONS.TRAVELLER.UPDATE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const parsed = updateTravellersSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { packageId, travellers } = parsed.data;

                /** Deduplicate by email (last occurrence wins) */
                const uniqueTravellersMap = new Map<string, { email: string; moneyPaid?: number }>();
                travellers.forEach(t => uniqueTravellersMap.set(t.email, t));
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

                /** Validate emails → resolve travellerIds */
                const emails = uniqueTravellers.map(t => t.email);
                const validTravellers = await prisma.traveller.findMany({
                    where: { email: { in: emails } },
                    select: { travellerId: true, email: true },
                });

                const foundEmails = validTravellers.map(t => t.email);
                const missingEmails = emails.filter(e => !foundEmails.includes(e));

                if (missingEmails.length > 0) {
                    return reply.status(400).send({
                        error: `The following travellers do not exist: ${missingEmails.join(", ")}`
                    });
                }

                /** Map emails → travellerIds */
                const emailToId = new Map(validTravellers.map(t => [t.email, t.travellerId]));

                try {
                    /** Prepare updates for all provided travellers */
                    const updates = uniqueTravellers.map(t =>
                        prisma.packageSubscription.update({
                            where: {
                                packageId_travellerId: {
                                    packageId: packageId,
                                    travellerId: emailToId.get(t.email)!,
                                }
                            },
                            data: { moneyPaid: t.moneyPaid ?? 0 },
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
                } catch (err: any) {
                    if (err.code === 'P2025') {
                        // Record to update was not found
                        return reply.status(400).send({ error: "One or more subscriptions do not exist" });
                    }

                    return reply
                        .status(500)
                        .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
                }
            } catch (err) {
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
