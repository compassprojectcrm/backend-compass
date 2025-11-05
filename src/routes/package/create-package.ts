import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants/constants";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";

/** 🧩 Common base fields */
const basePackageSchema = {
  packageName: z.string().min(1),
  tripType: z.enum(["INTERNATIONAL", "DOMESTIC"]),
  price: z.number().min(0),
  description: z.string().optional(),
  isFeatured: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(true),
  copyDestinationsFromPackageId: z.number().optional(),
  destinations: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        cityId: z.number(),
      })
    )
    .max(20)
    .optional()
    .default([]),
  travellerEmails: z
    .array(z.string().email())
    .max(100)
    .optional()
    .default([]),
};

/** 👤 Private package schema */
const privatePackageSchema = z
  .object({
    ...basePackageSchema,
    isPrivate: z.literal(true),
    members: z.number().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    days: z.any().transform(() => null).default(null),
    nights: z.any().transform(() => null).default(null),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

/** 🌍 Public package schema */
const publicPackageSchema = z.object({
  ...basePackageSchema,
  isPrivate: z.literal(false),
  days: z.number().min(1),
  nights: z.number().min(0),
  members: z.any().transform(() => null).default(null),
  startDate: z.any().transform(() => null).default(null),
  endDate: z.any().transform(() => null).default(null),
});

/** 🔀 Discriminated union schema */
const createPackageSchema = z.discriminatedUnion("isPrivate", [
  privatePackageSchema,
  publicPackageSchema,
]);

/** 🚀 POST /packages/create */
export default async function createPackageRoute(app: FastifyInstance) {
  app.post(
    ROUTES.PACKAGE.CREATE,
    {
      preValidation: [
        app.authenticate,
        permissionGuard([PERMISSIONS.PACKAGE.CREATE]),
      ],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const agentId = (req.user as any)?.id;
      app.log.info({ agentId }, "Incoming create package request");

      try {
        /** ✅ Validate request */
        const parsed = createPackageSchema.safeParse(req.body);
        if (!parsed.success) {
          app.log.warn(
            { agentId, issues: parsed.error.issues },
            "Package creation validation failed"
          );
          return reply.status(400).send(parsed.error.format());
        }

        const data = parsed.data;
        const {
          packageName,
          tripType,
          price,
          description,
          isFeatured,
          isPrivate,
          destinations,
          copyDestinationsFromPackageId,
          travellerEmails,
          startDate,
          endDate,
          days,
          nights,
          members,
        } = data;

        app.log.debug(
          {
            agentId,
            packageName,
            tripType,
            isPrivate,
            hasDestinations: destinations.length > 0,
            copyFrom: copyDestinationsFromPackageId ?? null,
          },
          "Parsed package creation data"
        );

        let finalDestinations = destinations;

        /** 📋 Copy destinations if needed */
        if (finalDestinations.length === 0 && copyDestinationsFromPackageId) {
          app.log.info(
            { agentId, sourcePackageId: copyDestinationsFromPackageId },
            "Copying destinations from another package"
          );

          const sourcePackage = await prisma.package.findUnique({
            where: {
              packageId: copyDestinationsFromPackageId,
              agentId,
            },
            include: { destinations: true },
          });

          if (!sourcePackage) {
            app.log.warn(
              { agentId, copyDestinationsFromPackageId },
              "Source package not found or not owned by agent"
            );
            return reply
              .status(404)
              .send({ error: "package not found or not owned by agent" });
          }

          finalDestinations = sourcePackage.destinations.map((d) => ({
            title: d.title,
            description: d.description ?? undefined,
            startDate: d.startDate.toISOString(),
            endDate: d.endDate.toISOString(),
            cityId: d.cityId,
          }));

          app.log.debug(
            { agentId, copiedCount: finalDestinations.length },
            "Copied destinations from existing package"
          );
        }

        /** 👥 Validate traveller emails */
        let validTravellerIds: number[] = [];
        if (travellerEmails.length > 0) {
          const validTravellers = await prisma.traveller.findMany({
            where: { email: { in: travellerEmails } },
            select: { travellerId: true, email: true },
          });

          const validEmails = validTravellers.map((t) => t.email);
          if (validEmails.length !== travellerEmails.length) {
            return reply
              .status(400)
              .send({ error: `Some traveller emails are invalid.` });
          }

          validTravellerIds = validTravellers.map((t) => t.travellerId);
        }

        /** 🏙 Validate city IDs */
        const cityIds = finalDestinations.map((d) => d.cityId);
        if (cityIds.length > 0) {
          const validCities = await prisma.city.findMany({
            where: { cityId: { in: cityIds } },
            select: { cityId: true },
          });

          const validCityIds = validCities.map((c) => c.cityId);
          if (validCityIds.length !== cityIds.length) {
            return reply
              .status(400)
              .send({ error: `Some city Ids are invalid.` });
          }
        }

        /** 💾 Create package */
        const newPackage = await prisma.package.create({
          data: {
            packageName,
            tripType,
            price,
            description: description ?? null,
            isFeatured,
            isPrivate,
            members,
            startDate,
            endDate,
            days,
            nights,
            agent: { connect: { agentId } },
            destinations: {
              create: finalDestinations.map((d) => ({
                title: d.title,
                description: d.description ?? null,
                startDate: new Date(d.startDate),
                endDate: new Date(d.endDate),
                cityId: d.cityId,
              })),
            },
            subscriptions: {
              create: validTravellerIds.map((travellerId) => ({
                traveller: { connect: { travellerId } },
              })),
            },
          },
          select: {
            packageId: true,
            packageName: true,
            tripType: true,
            price: true,
            members: true,
            startDate: true,
            endDate: true,
            days: true,
            nights: true,
            isFeatured: true,
            isPrivate: true,
          },
        });

        /** 🧹 Remove irrelevant fields from response */
        const filteredPackage = isPrivate
          ? (({ days, nights, ...rest }) => rest)(newPackage)
          : (({ startDate, endDate, members, ...rest }) => rest)(newPackage);

        app.log.info(
          { agentId, packageId: newPackage.packageId },
          "✅ Package created successfully"
        );

        return reply.status(201).send({ package: filteredPackage });
      } catch (err: any) {
        app.log.error({ err, agentId }, "Unexpected error during package creation");
        return reply
          .status(500)
          .send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
      }
    }
  );
}