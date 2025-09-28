// src/server.ts
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import loginRoute from "./routes/auth/agent_login";
import signupRoute from "./routes/auth/agent_signup";
import { CONSTANTS } from "./constants/constants";
import dotenv from "dotenv";
import countriesRoute from "./routes/common/countries";
import createPackageRoute from "./routes/package/create-package";
import deletePackageRoute from "./routes/package/delete-package";
import updatePackageRoute from "./routes/package/update-package";
import getPackagesRoute from "./routes/package/get-all-packages";
import createDestinationRoute from "./routes/destination/add-destination";
import updateDestinationRoute from "./routes/destination/update-destination";
import deleteDestinationRoute from "./routes/destination/delete-destination";
import customerSignupRoute from "./routes/auth/traveller_signup";
import customerLoginRoute from "./routes/auth/traveller_login";
import verifyCustomerEmailRoute from "./routes/common/search-customer-email";

/** Load environment variables from .env file */
dotenv.config();

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      targets: [
        /** Console pretty logs only in dev */
        ...(process.env.NODE_ENV !== 'production'
          ? [
            {
              target: 'pino-pretty',
              level: 'info',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
              },
            },
          ]
          : []),

        /** All logs file (info and above) */
        {
          target: 'pino/file',
          level: 'info',
          options: {
            destination: './logs/server.log',
            mkdir: true,
          },
        },

        /** Only error logs file */
        {
          target: 'pino/file',
          level: 'error',
          options: {
            destination: './logs/error.log',
            mkdir: true,
          },
        },
      ],
    },
  },
});

/** Security middleware */
app.register(helmet);
app.register(cors, { origin: "*" });
app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

if (!CONSTANTS.JWT.SECRET) {
  throw new Error("JWT_SECRET is not defined!");
}

/** JWT plugin - register BEFORE routes */
app.register(jwt, {
  secret: CONSTANTS.JWT.SECRET,
  sign: {
    expiresIn: CONSTANTS.JWT.EXPIRES_IN,
  }
});

/** Auth decorator for protected routes */
app.decorate(
  "authenticate",
  async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  }
);

/** Routes */
app.register(loginRoute);
app.register(signupRoute);
app.register(customerSignupRoute);
app.register(customerLoginRoute);

/** common route */
app.register(countriesRoute);
app.register(verifyCustomerEmailRoute);

/** packages */
app.register(createPackageRoute);
app.register(deletePackageRoute);
app.register(updatePackageRoute);
app.register(getPackagesRoute);

/** destinations */
app.register(createDestinationRoute);
app.register(updateDestinationRoute);
app.register(deleteDestinationRoute);

/** Start server */
app.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
  if (err) throw err;
  console.log(`Server running at ${address}`);
});
