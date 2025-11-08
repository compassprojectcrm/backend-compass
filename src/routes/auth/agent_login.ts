import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";

/** ✅ Zod schema: accepts either an email or a ULID */
const loginSchema = z.object({
    username: z
        .string()
        .email()
        .or(z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "Invalid username format")),
    password: z.string().min(6),
});

export default async function loginRoute(app: FastifyInstance) {
    /** POST /login */
    app.post(ROUTES.AUTH.AGENT_LOGIN, async (req: FastifyRequest, reply: FastifyReply) => {
        app.log.debug("Login request received");

        try {
            /** ✅ Step 1 — Validate Input */
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                app.log.debug({ issues: parsed.error.issues }, "Login validation failed");
                return reply.status(400).send(parsed.error.format());
            }

            const { username, password } = parsed.data;
            app.log.debug({ username }, "Parsed login data (password omitted)");

            let user: any;
            let role: string;

            /** ✅ Step 2 — Detect login type based on format */
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

            if (isEmail) {
                /** 🧩 Agent login flow */
                const agent = await prisma.agent.findUnique({
                    where: {
                        username
                    },
                });

                if (!agent) {
                    app.log.debug({ username }, "Agent not found");
                    return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
                }

                const match = await bcrypt.compare(password, agent.password);
                if (!match) {
                    app.log.debug({ agentId: agent.agentId }, "Agent password mismatch");
                    return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
                }

                user = agent;
                role = ROLES.AGENT;

                app.log.debug({ agentId: agent.agentId }, "Login successful.");
            } else {
                /** 🧩 Agent Member login flow (ULID) */
                const member = await prisma.agentMember.findUnique({
                    where: { username },
                });

                if (!member) {
                    app.log.debug({ username }, "Agent member not found");
                    return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
                }

                const match = await bcrypt.compare(password, member.password);
                if (!match) {
                    app.log.debug({ agentMemberId: member.agentMemberId }, "Member password mismatch");
                    return reply.status(401).send({ error: CONSTANTS.ERRORS.INVALID_CREDENTIALS });
                }

                user = member;
                role = ROLES.AGENT_MEMBER;

                app.log.debug({ agentMemberId: member.agentMemberId }, "Login successful.");
            }

            /** ✅ Step 3 — Generate JWT token */
            const token = app.jwt.sign({
                role,
                id: role === ROLES.AGENT ? user.agentId : user.agentMemberId
            });

            app.log.info(
                { role, id: user.agentId || user.agentMemberId },
                "Login successful"
            );

            /** ✅ Step 4 — Respond */
            return reply.send({
                message: "Login successful.",
                token,
            });
        } catch (err) {
            app.log.error({ err }, "Unexpected error during login");
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
