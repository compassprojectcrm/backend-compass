import "fastify";
import { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      role: string;
      id: number;
      permissions: string[];
    };
    user: {
      role: string;
      id: number;
      permissions: string[];
    };
  }
}
