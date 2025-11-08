import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { ulid } from "ulid";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { ROUTES } from "../../constants/routes";
import { ROLES } from "../../constants/roles";
import { PERMISSIONS } from "../../constants/permissions";
import { permissionGuard } from "../../middleware/auth";

/** ✅ Zod schema for Agent Member creation */
const createAgentMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6),
  permissions: z.array(z.string()).default([]),
});

export default async function createAgentMemberRoute(app: FastifyInstance) {
  app.post(
    ROUTES.AGENT_MEMBER.CREATE_AGENT_MEMBER,
    {
      preValidation: [
        app.authenticate,
        permissionGuard([PERMISSIONS.AGENT_MEMBER.CREATE]),
      ],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      app.log.debug("Agent member creation request received");

      /** ✅ Step 1 — Validate Input */
      const parsed = createAgentMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        app.log.debug({ issues: parsed.error.issues }, "Validation failed");
        return reply.status(400).send(parsed.error.format());
      }

      const { firstName, lastName, password, permissions } = parsed.data;
      const agentId = req.user.id;

      try {
        app.log.debug({ agentId, firstName, lastName }, "Parsed agent member data");

        /** ✅ Step 3 — Generate ULID as the member’s login ID */
        const username = ulid();

        /** ✅ Step 4 — Hash Password */
        const hashedPassword = await bcrypt.hash(password, 10);

        /** ✅ Step 5 — Create Agent Member */
        const newMember = await prisma.agentMember.create({
          data: {
            firstName,
            lastName,
            password: hashedPassword,
            agentId,
            permissions,
            username
          },
          select: {
            agentMemberId: true,
            firstName: true,
            lastName: true,
            username: true,
            permissions: true,
          },
        });

        app.log.info(
          { agentMemberId: newMember.agentMemberId },
          "Agent member created successfully"
        );

        /** ✅ Step 6 — Generate JWT (optional) */
        const token = app.jwt.sign({
          role: ROLES.AGENT_MEMBER,
          id: newMember.agentMemberId
        });

        /** ✅ Step 7 — Respond */
        return reply.status(201).send({
          message: "Agent member created successfully",
          username: newMember.username,
          token,
        });
      } catch (err) {
        app.log.error({ err }, "Unexpected error during agent member creation");
        return reply.status(500).send({
          error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR,
        });
      }
    }
  );
}
