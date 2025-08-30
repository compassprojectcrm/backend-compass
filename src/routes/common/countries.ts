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
            const response = await prisma.country.findMany({
                include: {
                    states: {
                        include: {
                            cities: true
                        }
                    }
                },
                orderBy: { name: "asc" }
            });

            const countries = response.map(country => ({
                id: country.id,
                name: country.name,
                states: country.states.map(state => ({
                    id: state.id,
                    name: state.name,
                    cities: state.cities.map(city => ({
                        id: city.id,
                        name: city.name
                    }))
                }))
            }));

            return reply.send({ countries });
        } catch (err: any) {
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
}
