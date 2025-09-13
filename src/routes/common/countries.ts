/** src/routes/countries.ts */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../prisma";
import { CONSTANTS } from "../../constants";

/** GET /countries */
export default async function countriesRoute(app: FastifyInstance) {
    app.get(CONSTANTS.ROUTES.COMMON.COUNTRIES, {
        preValidation: [app.authenticate]
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
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
}
