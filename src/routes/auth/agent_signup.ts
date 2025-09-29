/** src/routes/signup.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { getPermissionKeysByRole } from "../../constants/permissions";
import { ROLES } from "../../constants/roles";

/** Validation schema for signup input */
const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

/** Signup route for creating a new agent with a default team */
export default async function signupRoute(app: FastifyInstance) {
    app.post(ROUTES.AUTH.AGENT_SIGNUP, async (req: FastifyRequest, reply: FastifyReply) => {
        app.log.debug("Signup request received");

        try {
            /** Parse and validate request body */
            const parsed = signupSchema.safeParse(req.body);
            if (!parsed.success) {
                app.log.debug({ issues: parsed.error.issues }, "Signup validation failed");
                return reply.status(400).send(parsed.error.format());
            }

            const { email, password } = parsed.data;
            app.log.debug({ email }, "Parsed signup data (password omitted)");

            /** Check if user already exists */
            const existingAgent = await prisma.agent.findUnique({ where: { email } });
            if (existingAgent) {
                app.log.debug({ email }, "User already exists");
                return reply.status(400).send({ error: "User already exists!" });
            }

            app.log.debug({ email }, "Hashing password");

            /** Hash the password */
            const passwordHash = await bcrypt.hash(password, 10);

            /** Create agent in DB */
            const agent = await prisma.agent.create({
                data: {
                    email,
                    password: passwordHash,
                },
            });

            app.log.info({ agentId: agent.agentId, email: agent.email }, "Agent created successfully");

            /** Generate JWT token */
            const token = app.jwt.sign({
                role: ROLES.AGENT,
                id: agent.agentId,
                permissions: getPermissionKeysByRole(ROLES.AGENT),
            });

            app.log.debug({ agentId: agent.agentId }, "Signup successful, token generated");

            /** Return success response */
            return reply.send({
                message: "Signup successful",
                token,
            });
        } catch (err) {
            /** Log error and return internal server error */
            app.log.error({ err }, "Unexpected error during signup");
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
