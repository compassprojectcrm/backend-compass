/** src/routes/signup.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../../prisma";
import { CONSTANTS } from "../../../constants";

/** Validation schema for signup input */
const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

/** Signup route for creating a new agent with a default team */
export default async function signupRoute(app: FastifyInstance) {
    app.post(CONSTANTS.ROUTES.AGENT.AUTH.SIGNUP, async (req: FastifyRequest, reply: FastifyReply) => {

        /** Parse and validate request body */
        const parsed = signupSchema.safeParse(req.body);
        if (!parsed.success) return reply.status(400).send(parsed.error.format());

        const { email, password } = parsed.data;

        try {
            /** Check if user already exists */
            const existingUser = await prisma.agent.findUnique({ where: { email } });
            if (existingUser) {
                return reply.status(400).send({ error: "User already exists!" });
            }

            /** Hash the password */
            const passwordHash = await bcrypt.hash(password, 10);

            /** 
             * Create agent and default team in a single query 
             * Ensures that every agent has one team automatically
             */
            const agent = await prisma.agent.create({
                data: {
                    email,
                    password: passwordHash
                }
            });

            /** Generate JWT token */
            const token = app.jwt.sign({
                userId: agent.id,
                permissions: [CONSTANTS.PERMISSIONS.ADMIN],
            });

            /** Return success response with user info and default team */
            return reply.send({
                message: "Signup successful",
                token
            });
        } catch (err) {
            /** Log error and return internal server error */
            app.log.error(err);
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}