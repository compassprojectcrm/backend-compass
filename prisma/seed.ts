import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const countries = [
        {
            name: "United States",
            states: {
                create: [
                    {
                        name: "California",
                        cities: {
                            create: [
                                { name: "Los Angeles" },
                                { name: "San Francisco" },
                                { name: "San Diego" },
                            ],
                        },
                    },
                    {
                        name: "Texas",
                        cities: {
                            create: [
                                { name: "Houston" },
                                { name: "Austin" },
                                { name: "Dallas" },
                            ],
                        },
                    },
                ],
            },
        },
        {
            name: "India",
            states: {
                create: [
                    {
                        name: "Maharashtra",
                        cities: {
                            create: [
                                { name: "Mumbai" },
                                { name: "Pune" },
                                { name: "Nagpur" },
                            ],
                        },
                    },
                    {
                        name: "Karnataka",
                        cities: {
                            create: [
                                { name: "Bengaluru" },
                                { name: "Mysuru" },
                                { name: "Mangalore" },
                            ],
                        },
                    },
                ],
            },
        },
    ];

    for (const country of countries) {
        await prisma.country.upsert({
            where: { name: country.name },
            update: {},
            create: country,
        });
    }

    console.log("✅ Database seeded successfully!");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
