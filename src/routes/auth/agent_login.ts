/** src/routes/login.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";
import { getPermissionKeysByRole } from "../../constants/permissions";

/** Zod schema for login */
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default async function loginRoute(app: FastifyInstance) {
    /** POST /login */
    app.post(ROUTES.AUTH.AGENT_LOGIN, async (req: FastifyRequest, reply: FastifyReply) => {
        app.log.debug("Login request received");

        try {
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                app.log.debug({ issues: parsed.error.issues }, "Login validation failed");
                return reply.status(400).send(parsed.error.format());
            }

            const { email, password } = parsed.data;
            app.log.debug({ email }, "Parsed login data (password omitted)");

            /** Find user in DB */
            const agent = await prisma.agent.findUnique({
                where: { email },
            });

            if (!agent) {
                app.log.debug({ email }, "Agent not found");
                return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
            }

            app.log.debug({ agentId: agent.agentId }, "Agent found, verifying password");

            /** Compare password with stored hash */
            const match = await bcrypt.compare(password, agent.password);
            if (!match) {
                app.log.debug({ agentId: agent.agentId }, "Password mismatch");
                return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
            }

            app.log.debug({ agentId: agent.agentId }, "Password matched, generating token");

            /** Generate JWT token */
            const token = app.jwt.sign({
                role: ROLES.AGENT,
                id: agent.agentId,
                permissions: getPermissionKeysByRole(ROLES.AGENT),
            });

            app.log.info({ agentId: agent.agentId }, "Login successful");
            return reply.send({
                message: "Login successful",
                token
            });
        } catch (err) {
            app.log.error({ err }, "Unexpected error during login");
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
