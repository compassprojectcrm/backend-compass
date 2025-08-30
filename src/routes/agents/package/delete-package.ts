/** src/routes/packages/delete-package.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for validating route params */
const querySchema = z.object({
    id: z.string().regex(/^\d+$/)
});

/** DELETE /packages/:packageId */
export default async function deletePackageRoute(app: FastifyInstance) {
    app.delete(CONSTANTS.ROUTES.AGENT.PACKAGE.DELETE, {
        preValidation: [
            app.authenticate,
            permissionGuard([CONSTANTS.PERMISSIONS.AGENT.PACKAGE.DELETE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        /** Validate route params */
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error.format());
        }

        const packageId = parseInt(parsed.data.id, 10);

        try {
            /** Ensure the package belongs to the authenticated agent */
            const existingPackage = await prisma.package.findUnique({
                where: { packageId }
            });

            if (!existingPackage || existingPackage.agentId !== req.user.userId) {
                return reply.status(404).send({ error: CONSTANTS.ERRORS.NOT_FOUND });
            }

            /** Delete the package */
            await prisma.package.delete({
                where: { packageId }
            });

            return reply.status(200).send({ message: "Package deleted successfully" });
        } catch (err: any) {
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}