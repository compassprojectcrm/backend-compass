/** src/routes/countries.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../prisma";
import { permissionGuard } from "../../middleware/auth";
import { ROUTES } from "../../constants/routes";
import { PERMISSIONS } from "../../constants/permissions";
import { CONSTANTS } from "../../constants/constants";

/** GET /countries */
export default async function countriesRoute(app: FastifyInstance) {
    app.get(ROUTES.COMMON.COUNTRIES, {
        preValidation: [app.authenticate, permissionGuard([PERMISSIONS.COMMON.READ_COUNTRIES])]
    }, async (_req: FastifyRequest, reply: FastifyReply) => {
        try {
            const countries = await prisma.country.findMany({
                select: {
                    countryId: true,
                    countryName: true,
                    states: {
                        select: {
                            stateId: true,
                            stateName: true,
                            cities: {
                                select: {
                                    cityId: true,
                                    cityName: true
                                }
                            }
                        }
                    }
                },
                orderBy: { countryName: "asc" }
            });

            return reply.send({ countries });
        } catch (err: any) {
            return reply.status(500).send({ error: CONSTANTS.ERRORS.INTERNAL_SERVER_ERROR });
        }
    });
}
