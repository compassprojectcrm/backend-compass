/** src/routes/customers/verify-customer-email.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { addEmailsToFilter, mayExist } from "../../utils/email-bloom-filter";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";
import { permissionGuard } from "../../middleware/auth";
import { CONSTANTS } from "../../constants/constants";

/** Zod schema for verifying multiple customer emails */
const verifyEmailsSchema = z.object({
    emails: z.array(z.string().email()).nonempty(),
});

export default async function verifyCustomerEmailRoute(app: FastifyInstance) {
    /** On startup, preload the Bloom filter with all customer emails */
    const customers = await prisma.traveller.findMany({ select: { email: true } });
    addEmailsToFilter(customers.map((c) => c.email));

    app.post(
        ROUTES.COMMON.SEARCH_CUSTOMER_EMAIL,
        {
            preValidation: [
                app.authenticate,
                permissionGuard([PERMISSIONS.COMMON.SEARCH_CUSTOMER_EMAIL]),
            ],
        },
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                /** Validate request body */
                const parsed = verifyEmailsSchema.safeParse(req.body);
                if (!parsed.success) {
                    return reply.status(400).send(parsed.error.format());
                }

                const { emails } = parsed.data;
                const result: Record<string, { exists: boolean; travellerId?: number }> = {};

                /** Collect "maybe exists" emails for batch DB query */
                const candidates: string[] = [];

                for (const email of emails) {
                    if (!mayExist(email)) {
                        /** Definitely does not exist */
                        result[email] = { exists: false };
                    } else {
                        /** Might exist → check later in bulk */
                        candidates.push(email);
                    }
                }

                /** Perform a single DB query for all candidate emails */
                if (candidates.length > 0) {
                    const existingTravellers = await prisma.traveller.findMany({
                        where: { email: { in: candidates } },
                        select: { email: true, travellerId: true },
                    });

                    /** Map emails to travellerId for fast lookup */
                    const emailToTravellerId = new Map(
                        existingTravellers.map((t) => [t.email, t.travellerId])
                    );

                    for (const email of candidates) {
                        if (emailToTravellerId.has(email)) {
                            result[email] = { exists: true, travellerId: emailToTravellerId.get(email) };
                        } else {
                            result[email] = { exists: false };
                        }
                    }
                }

                /** Send final results */
                return reply.status(200).send(result);
            } catch (error) {
                console.error(error);
                return reply
                    .status(500)
                    .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
            }
        }
    );
}
