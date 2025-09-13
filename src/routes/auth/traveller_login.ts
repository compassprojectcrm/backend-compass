/** src/routes/login.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { getPermissionKeysByRole } from "../../constants/permissions";
import { ROLES } from "../../constants/roles";

/** Zod schema for login */
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default async function customerLoginRoute(app: FastifyInstance) {
    /** POST /login */
    app.post(ROUTES.AUTH.TRAVELLER_LOGIN, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error.format());
            }

            const { email, password } = parsed.data;

            /** Find user in DB */
            const traveller = await prisma.traveller.findUnique({
                where: { email },
            });

            if (!traveller) {
                return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
            }

            /** Compare password with stored hash */
            const match = await bcrypt.compare(password, traveller.password);
            if (!match) {
                return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
            }

            /** Generate JWT token */
            const token = app.jwt.sign({
                role: ROLES.TRAVELLER,
                id: traveller.travellerId,
                permissions: getPermissionKeysByRole(ROLES.TRAVELLER),
            });

            return reply.send({
                message: "Login successful",
                token
            });
        } catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}