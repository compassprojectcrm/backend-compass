/** src/routes/login.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";

/** Zod schema for login */
const loginSchema = z.object({
    username: z.string().email(),
    password: z.string().min(6),
});

export default async function customerLoginRoute(app: FastifyInstance) {
    /** POST /login */
    app.post(ROUTES.AUTH.TRAVELLER_LOGIN, async (req: FastifyRequest, reply: FastifyReply) => {
        app.log.debug("Traveller login request received");

        try {
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                app.log.debug({ issues: parsed.error.issues }, "Traveller login validation failed");
                return reply.status(400).send(parsed.error.format());
            }

            const { username, password } = parsed.data;
            app.log.debug({ username }, "Parsed traveller login data (password omitted)");

            /** Find user in DB */
            const traveller = await prisma.traveller.findUnique({
                where: { username },
            });

            if (!traveller) {
                app.log.debug({ username }, "Traveller not found");
                return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
            }

            app.log.debug({ travellerId: traveller.travellerId }, "Traveller found, verifying password");

            /** Compare password with stored hash */
            const match = await bcrypt.compare(password, traveller.password);
            if (!match) {
                app.log.debug({ travellerId: traveller.travellerId }, "Password mismatch");
                return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
            }

            app.log.debug({ travellerId: traveller.travellerId }, "Password matched, generating token");

            /** Generate JWT token */
            const token = app.jwt.sign({
                role: ROLES.TRAVELLER,
                id: traveller.travellerId
            });

            app.log.info({ travellerId: traveller.travellerId, username: traveller.username }, "Traveller login successful");

            return reply.send({
                message: "Login successful",
                token
            });
        } catch (err) {
            app.log.error({ err }, "Unexpected error during traveller login");
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
