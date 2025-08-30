/** src/routes/login.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";

/** Zod schema for login */
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default async function loginRoute(app: FastifyInstance) {
    /** POST /login */
    app.post(CONSTANTS.ROUTES.AGENT.AUTH.LOGIN, async (req: FastifyRequest, reply: FastifyReply) => {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error.format());
        }

        const { email, password } = parsed.data;

        try {
            /** Find user in DB */
            const agent = await prisma.agent.findUnique({
                where: { email },
            });

            if (!agent) {
                return reply.status(401).send({ error: "Invalid credentials" });
            }

            /** Compare password with stored hash */
            const match = await bcrypt.compare(password, agent.password);
            if (!match) {
                return reply.status(401).send({ error: "Invalid credentials" });
            }

            /** Generate JWT token */
            const token = app.jwt.sign({
                userId: agent.id,
                permissions: [CONSTANTS.PERMISSIONS.AGENT.PACKAGE.READ, CONSTANTS.PERMISSIONS.AGENT.PACKAGE.CREATE],
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