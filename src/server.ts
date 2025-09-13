// src/server.ts
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import loginRoute from "./routes/agents/auth/login";
import signupRoute from "./routes/agents/auth/signup";
import { CONSTANTS } from "./constants";
import dotenv from "dotenv";
import countriesRoute from "./routes/common/countries";
import createPackageRoute from "./routes/agents/package/create-package";
import deletePackageRoute from "./routes/agents/package/delete-package";
import updatePackageRoute from "./routes/agents/package/update-package";
import getPackagesRoute from "./routes/agents/package/get-all-packages";
import getPackageByIdRoute from "./routes/agents/package/get-package-by-id";
import createDestinationRoute from "./routes/agents/destination/create-destination";
import updateDestinationRoute from "./routes/agents/destination/update-destination";
import deleteDestinationRoute from "./routes/agents/destination/delete-destination";

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
app.register(countriesRoute);

/** packages */
app.register(createPackageRoute);
app.register(deletePackageRoute);
app.register(updatePackageRoute);
app.register(getPackagesRoute);
app.register(getPackageByIdRoute);

/** destinations */
app.register(createDestinationRoute);
app.register(updateDestinationRoute);
app.register(deleteDestinationRoute);

/** Start server */
app.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server running at ${address}`);
});
