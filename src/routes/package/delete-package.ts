/** src/routes/packages/delete-packages.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema for deleting multiple packages */
const deletePackagesSchema = z.object({
    packageIds: z.array(z.number().int().positive()).nonempty(),
});

/** DELETE /packages/delete */
export default async function deletePackagesRoute(app: FastifyInstance) {
    app.delete(ROUTES.PACKAGE.DELETE, {
        preValidation: [
            app.authenticate,
            permissionGuard([PERMISSIONS.PACKAGE.DELETE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Validate request body */
            const parsed = deletePackagesSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { packageIds } = parsed.data;

            /** Fetch packages belonging to the authenticated agent */
            const packages = await prisma.package.findMany({
                where: { packageId: { in: packageIds }, agentId: req.user.id },
                select: { packageId: true }
            });

            if (packages.length === 0) {
                return reply.status(404).send({ error: "No valid packages found to delete!" });
            }

            const validPackageIds = packages.map(p => p.packageId);

            /** Delete the packages */
            await prisma.package.deleteMany({
                where: { packageId: { in: validPackageIds } }
            });

            return reply.status(200).send({
                message: "Packages deleted successfully!"
            });
        } catch (err: any) {
            console.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
