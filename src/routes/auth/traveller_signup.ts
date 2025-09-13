/** src/routes/signup.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { addEmailsToFilter } from "../../utils/email-bloom-filter";
import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";
import { getPermissionKeysByRole } from "../../constants/permissions";

/** Validation schema for signup input */
export const signupSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

/** Signup route for creating a new agent with a default team */
export default async function customerSignupRoute(app: FastifyInstance) {
    app.post(ROUTES.AUTH.TRAVELLER_SIGNUP, async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            /** Parse and validate request body */
            const parsed = signupSchema.safeParse(req.body);
            if (!parsed.success) return reply.status(400).send(parsed.error.format());

            const { firstName, lastName, email, password } = parsed.data;

            /** Check if user already exists */
            const existingTraveller = await prisma.traveller.findUnique({ where: { email } });
            if (existingTraveller) {
                return reply.status(400).send({ error: "User already exists!" });
            }

            /** Hash the password */
            const passwordHash = await bcrypt.hash(password, 10);

            /** 
             * Create agent and default team in a single query 
             * Ensures that every agent has one team automatically
             */
            const traveller = await prisma.traveller.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    password: passwordHash
                }
            });

            /** insert the new email in the bloom filter */
            addEmailsToFilter([email]);

            /** Generate JWT token */
            const token = app.jwt.sign({
                role: ROLES.TRAVELLER,
                id: traveller.travellerId,
                permissions: getPermissionKeysByRole(ROLES.TRAVELLER),
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