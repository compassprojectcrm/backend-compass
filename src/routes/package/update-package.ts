/** src/routes/packages/update-package.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** Zod schema for updating a package */
const updatePackageSchema = z
    .object({
        packageId: z.number().int().min(1), /** Package ID */
        packageName: z.string().min(1).optional(),
        tripType: z.enum(["GLOBAL", "LOCAL"]).optional(),
        price: z.number().min(0).optional(),
        description: z.string().optional(),
        isFeatured: z.boolean().optional(),
        isPrivate: z.boolean().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        members: z.number().min(1).optional(),
    })
    .refine(
        (data) => {
            if (data.startDate && data.endDate) {
                return new Date(data.endDate) > new Date(data.startDate);
            }
            return true;
        },
        {
            message: "endDate must be after startDate",
            path: ["endDate"],
        }
    );

/** PUT /packages/update */
export default async function updatePackageRoute(app: FastifyInstance) {
    app.put(ROUTES.PACKAGE.UPDATE, {
        preValidation: [
            app.authenticate,
            permissionGuard([PERMISSIONS.PACKAGE.UPDATE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Validate request body */
            const parsed = updatePackageSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { packageId, ...updateData } = parsed.data;

            /** Check if the package exists and belongs to this agent */
            const existingPackage = await prisma.package.findUnique({
                where: { packageId },
            });

            if (!existingPackage || existingPackage.agentId !== req.user.id) {
                return reply.status(404).send({ error: CONSTANTS.ERRORS.NOT_FOUND });
            }

            /** Update the package */
            const updatedPackage = await prisma.package.update({
                where: { packageId },
                data: {
                    ...updateData,
                    /** Convert dates if provided */
                    ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
                    ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
                },
                select: {
                    packageId: true,
                    packageName: true,
                    tripType: true,
                    status: true,
                    price: true,
                    description: true,
                    isFeatured: true,
                    isPrivate: true,
                    startDate: true,
                    endDate: true,
                    members: true,
                },
            });

            return reply.status(200).send({ package: updatedPackage });
        } catch (err: any) {
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
