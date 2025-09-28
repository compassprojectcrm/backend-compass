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
                                { cityName: "Sacramento" },
                                { cityName: "San Jose" },
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
                                { cityName: "San Antonio" },
                                { cityName: "Fort Worth" },
                            ],
                        },
                    },
                    {
                        stateName: "New York",
                        cities: {
                            create: [
                                { cityName: "New York City" },
                                { cityName: "Buffalo" },
                                { cityName: "Rochester" },
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
                                { cityName: "Nashik" },
                                { cityName: "Aurangabad" },
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
                                { cityName: "Hubli" },
                                { cityName: "Belgaum" },
                            ],
                        },
                    },
                    {
                        stateName: "Tamil Nadu",
                        cities: {
                            create: [
                                { cityName: "Chennai" },
                                { cityName: "Coimbatore" },
                                { cityName: "Madurai" },
                            ],
                        },
                    },
                ],
            },
        },
        {
            countryName: "United Kingdom",
            states: {
                create: [
                    {
                        stateName: "England",
                        cities: {
                            create: [
                                { cityName: "London" },
                                { cityName: "Manchester" },
                                { cityName: "Liverpool" },
                            ],
                        },
                    },
                    {
                        stateName: "Scotland",
                        cities: {
                            create: [
                                { cityName: "Edinburgh" },
                                { cityName: "Glasgow" },
                                { cityName: "Aberdeen" },
                            ],
                        },
                    },
                ],
            },
        },
        {
            countryName: "Australia",
            states: {
                create: [
                    {
                        stateName: "New South Wales",
                        cities: {
                            create: [
                                { cityName: "Sydney" },
                                { cityName: "Newcastle" },
                                { cityName: "Wollongong" },
                            ],
                        },
                    },
                    {
                        stateName: "Victoria",
                        cities: {
                            create: [
                                { cityName: "Melbourne" },
                                { cityName: "Geelong" },
                                { cityName: "Ballarat" },
                            ],
                        },
                    },
                ],
            },
        },
        {
            countryName: "Canada",
            states: {
                create: [
                    {
                        stateName: "Ontario",
                        cities: {
                            create: [
                                { cityName: "Toronto" },
                                { cityName: "Ottawa" },
                                { cityName: "Hamilton" },
                            ],
                        },
                    },
                    {
                        stateName: "British Columbia",
                        cities: {
                            create: [
                                { cityName: "Vancouver" },
                                { cityName: "Victoria" },
                                { cityName: "Kelowna" },
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

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
