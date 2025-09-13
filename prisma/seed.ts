import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const countries = [
        {
            countryName: "United States",
            states: {
                create: [
                    {
                        stateName: "California",
                        cities: {
                            create: [
                                { cityName: "Los Angeles" },
                                { cityName: "San Francisco" },
                                { cityName: "San Diego" },
                            ],
                        },
                    },
                    {
                        stateName: "Texas",
                        cities: {
                            create: [
                                { cityName: "Houston" },
                                { cityName: "Austin" },
                                { cityName: "Dallas" },
                            ],
                        },
                    },
                ],
            },
        },
        {
            countryName: "India",
            states: {
                create: [
                    {
                        stateName: "Maharashtra",
                        cities: {
                            create: [
                                { cityName: "Mumbai" },
                                { cityName: "Pune" },
                                { cityName: "Nagpur" },
                            ],
                        },
                    },
                    {
                        stateName: "Karnataka",
                        cities: {
                            create: [
                                { cityName: "Bengaluru" },
                                { cityName: "Mysuru" },
                                { cityName: "Mangalore" },
                            ],
                        },
                    },
                ],
            },
        },
    ];

    for (const country of countries) {
        await prisma.country.upsert({
            where: { countryName: country.countryName },
            update: {},
            create: country,
        });
    }

    console.log("✅ Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
