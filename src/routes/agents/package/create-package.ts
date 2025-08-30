/** src/routes/packages/create-package.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";
import { permissionGuard } from "../../../middleware/auth";

/** Zod schema for creating a package */
const createPackageSchema = z.object({
    packageName: z.string().min(1),
    tripType: z.enum(["GLOBAL", "LOCAL"]),
    days: z.number().int().min(1),
    nights: z.number().int().min(0),
    price: z.number().min(0),
    description: z.string().optional()
});

/** POST /packages/create */
export default async function createPackageRoute(app: FastifyInstance) {
    app.post(CONSTANTS.ROUTES.AGENT.PACKAGE.CREATE, {
        preValidation: [
            app.authenticate,
            permissionGuard([CONSTANTS.PERMISSIONS.AGENT.PACKAGE.CREATE])
        ]
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        /** Validate request body */
        const parsed = createPackageSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error.format());
        }

        const { packageName, tripType, days, nights, price, description } = parsed.data;

        try {
            /** Create package for the authenticated agent */
            const newPackage = await prisma.package.create({
                data: {
                    packageName,
                    tripType,
                    days,
                    nights,
                    price,
                    description: description ?? null,
                    agent: { connect: { id: req.user.userId } }
                },
                include: { destinations: true },
            });

            /** Return the created package */
            return reply.status(201).send({ package: newPackage });
        } catch (err: any) {
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}