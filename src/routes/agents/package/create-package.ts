import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for creating a package */
const createPackageSchema = z
    .object({
        packageName: z.string().min(1),
        tripType: z.enum(["GLOBAL", "LOCAL"]),
        price: z.number().min(0),
        description: z.string().optional(),
        isFeatured: z.boolean().optional().default(false),
        isPrivate: z.boolean().optional().default(false),
        startDate: z.string().datetime(), // ISO 8601 string
        endDate: z.string().datetime(),   // ISO 8601 string
    })
    .refine(
        (data) => new Date(data.endDate) > new Date(data.startDate),
        {
            message: "endDate must be after startDate",
            path: ["endDate"],
        }
    );

/** POST /packages/create */
export default async function createPackageRoute(app: FastifyInstance) {
    app.post(
        CONSTANTS.ROUTES.PACKAGE.CREATE,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([CONSTANTS.PERMISSIONS.PACKAGE.CREATE]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            /** Validate request body */
            const parsed = createPackageSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const {
                packageName,
                tripType,
                price,
                description,
                isFeatured,
                isPrivate,
                startDate,
                endDate,
            } = parsed.data;

            try {
                /** Create package for the authenticated agent */
                const newPackage = await prisma.package.create({
                    data: {
                        packageName,
                        tripType,
                        price,
                        description: description ?? null,
                        isFeatured,
                        isPrivate,
                        startDate: new Date(startDate),
                        endDate: new Date(endDate),
                        agent: { connect: { agentId: req.user.userId } },
                    },
                    include: {
                        destinations: {
                            select: {
                                destinationId: true,
                                cityId: true,
                                city: {
                                    select: {
                                        cityName: true,
                                    },
                                },
                            },
                        },
                    },
                });

                /** Return the created package */
                return reply.status(201).send({ package: newPackage });
            } catch (err: any) {
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
