/** src/routes/packages/update-package.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for updating a package */
const updatePackageSchema = z.object({
    packageId: z.number().int().min(1),
    packageName: z.string().min(1).optional(),
    tripType: z.enum(["GLOBAL", "LOCAL"]).optional(),
    days: z.number().int().min(1).optional(),
    nights: z.number().int().min(0).optional(),
    price: z.number().min(0).optional(),
    description: z.string().optional()
});

/** PUT /packages/update */
export default async function updatePackageRoute(app: FastifyInstance) {
    app.put(CONSTANTS.ROUTES.AGENT.PACKAGE.UPDATE, {
        preValidation: [
            app.authenticate,
            permissionGuard([CONSTANTS.PERMISSIONS.AGENT.PACKAGE.UPDATE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        /** Validate request body */
        const parsed = updatePackageSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error.format());
        }

        const { packageId, ...updateData } = parsed.data;

        try {
            /** Check if the package exists and belongs to this agent */
            const existingPackage = await prisma.package.findUnique({
                where: { packageId },
            });

            if (!existingPackage || existingPackage.agentId !== req.user.userId) {
                return reply.status(404).send({ error: CONSTANTS.ERRORS.NOT_FOUND });
            }

            /** Update the package */
            const updatedPackage = await prisma.package.update({
                where: { packageId },
                data: updateData,
            });

            return reply.status(200).send({ package: updatedPackage });
        } catch (err: any) {
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}