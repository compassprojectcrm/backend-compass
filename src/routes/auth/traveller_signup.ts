/** src/routes/signup.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { addUsernamesToFilter } from "../../utils/username-bloom-filter";
import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";
import { getPermissionKeysByRole } from "../../constants/permissions";

/** Validation schema for signup input */
export const signupSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    username: z.string().email(),
    password: z.string().min(6),
});

/** Signup route for creating a new traveller */
export default async function customerSignupRoute(app: FastifyInstance) {
    app.post(ROUTES.AUTH.TRAVELLER_SIGNUP, async (req: FastifyRequest, reply: FastifyReply) => {
        app.log.debug("Traveller signup request received");

        try {
            /** Parse and validate request body */
            const parsed = signupSchema.safeParse(req.body);
            if (!parsed.success) {
                app.log.debug({ issues: parsed.error.issues }, "Traveller signup validation failed");
                return reply.status(400).send(parsed.error.format());
            }

            const { firstName, lastName, username, password } = parsed.data;
            app.log.debug({ username }, "Parsed traveller signup data (password omitted)");

            /** Check if user already exists */
            const existingTraveller = await prisma.traveller.findUnique({ where: { username } });
            if (existingTraveller) {
                app.log.debug({ username }, "Traveller already exists");
                return reply.status(400).send({ error: "User already exists!" });
            }

            app.log.debug({ username }, "Hashing password and creating traveller");

            /** Hash the password */
            const passwordHash = await bcrypt.hash(password, 10);

            /** Create traveller */
            const traveller = await prisma.traveller.create({
                data: {
                    firstName,
                    lastName,
                    username,
                    password: passwordHash,
                },
            });

            /** Insert the new username in the bloom filter */
            addUsernamesToFilter([username]);
            app.log.debug({ username }, "Username added to bloom filter");

            /** Generate JWT token */
            const token = app.jwt.sign({
                role: ROLES.TRAVELLER,
                id: traveller.travellerId,
                permissions: getPermissionKeysByRole(ROLES.TRAVELLER),
            });

            app.log.info({ travellerId: traveller.travellerId, username: traveller.username }, "Traveller signup successful");

            /** Return success response */
            return reply.send({
                message: "Signup successful",
                token,
            });
        } catch (err) {
            app.log.error({ err }, "Unexpected error during traveller signup");
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
