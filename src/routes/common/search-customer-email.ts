/** src/routes/customers/verify-customer-username.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { addUsernamesToFilter, mayExist } from "../../utils/username-bloom-filter";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";
import { permissionGuard } from "../../middleware/auth";
import { CONSTANTS } from "../../constants/constants";

/** Zod schema for verifying multiple customer usernames */
const verifyUsernamesSchema = z.object({
    usernames: z.array(z.string().email()).nonempty(),
});

export default async function verifyCustomerUsernameRoute(app: FastifyInstance) {
    /** On startup, preload the Bloom filter with all customer usernames */
    const customers = await prisma.traveller.findMany({ select: { username: true } });
    addUsernamesToFilter(customers.map((c) => c.username));

    app.post(
        ROUTES.COMMON.SEARCH_CUSTOMER_USERNAME,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.COMMON.SEARCH_CUSTOMER_USERNAME]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                /** Validate request body */
                const parsed = verifyUsernamesSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { usernames } = parsed.data;
                const result: Record<string, { exists: boolean; travellerId?: number }> = {};

                /** Collect "maybe exists" usernames for batch DB query */
                const candidates: string[] = [];

                for (const username of usernames) {
                    if (!mayExist(username)) {
                        /** Definitely does not exist */
                        result[username] = { exists: false };
                    } else {
                        /** Might exist → check later in bulk */
                        candidates.push(username);
                    }
                }

                /** Perform a single DB query for all candidate usernames */
                if (candidates.length > 0) {
                    const existingTravellers = await prisma.traveller.findMany({
                        where: { username: { in: candidates } },
                        select: { username: true, travellerId: true },
                    });

                    /** Map usernames to travellerId for fast lookup */
                    const usernameToTravellerId = new Map(
                        existingTravellers.map((t) => [t.username, t.travellerId])
                    );

                    for (const username of candidates) {
                        if (usernameToTravellerId.has(username)) {
                            result[username] = { exists: true };
                        } else {
                            result[username] = { exists: false };
                        }
                    }
                }

                /** Send final results */
                return reply.status(200).send(result);
            } catch (error) {
                return reply.status(500).send({
                    error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR
                });
            }
        }
    );
}
