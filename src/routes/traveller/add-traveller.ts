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
                email: z.string().email(),
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
                permissionGuard([PERMISSIONS.TRAVELLER.ADD]),
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

                if (pkg.members === null) {
                    /** Public package → travellers cannot be manually added */ 
                    return reply.status(400).send({
                        error: "Cannot add travellers to this package.",
                    });
                }

                if (currentCount + travellers.length > pkg.members) {
                    return reply.status(400).send({
                        error: `Cannot add travellers. Package allows a maximum of ${pkg.members} members.`,
                    });
                }

                /** Validate emails → resolve travellerIds */
                const emails = travellers.map(t => t.email);
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

                /** Map emails to travellerIds */
                const emailToId = new Map(validTravellers.map(t => [t.email, t.travellerId]));

                try {
                    const createdSubscriptions = await prisma.$transaction(
                        travellers.map(t =>
                            prisma.packageSubscription.create({
                                data: {
                                    packageId,
                                    travellerId: emailToId.get(t.email)!,
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
                            })
                        )
                    );

                    return reply.status(200).send({ travellers: createdSubscriptions });
                } catch (err: any) {
                    if (err.code === 'P2002') {
                        return reply.status(400).send({ error: "One or more travellers are already subscribed" });
                    } else if (err.code === 'P2003') {
                        return reply.status(400).send({ error: "One or more travellers do not exist" });
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
