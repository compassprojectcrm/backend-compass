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
    emails: z.array(z.string().email()).nonempty().max(100),
});

/** DELETE /packages/remove-travellers */
export default async function removeTravellersRoute(app: FastifyInstance) {
    app.delete(
        ROUTES.TRAVELLER.REMOVE_TRAVELLER,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.TRAVELLER.REMOVE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const parsed = removeTravellersSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { packageId, emails } = parsed.data;

                /** Ensure package exists and belongs to agent */
                const pkg = await prisma.package.findFirst({
                    where: { packageId, agentId: req.user.id },
                });

                if (!pkg) {
                    return reply.status(404).send({
                        error: "Package not found or you are not authorized to modify it.",
                    });
                }

                /** Delete by traveller email (fail silently if none exist) */
                await prisma.packageSubscription.deleteMany({
                    where: {
                        packageId,
                        traveller: { email: { in: emails } },
                    },
                });

                return reply.status(200).send({
                    message: "Travellers removed successfully!",
                });
            } catch (err) {
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
