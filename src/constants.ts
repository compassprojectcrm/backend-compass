export const CONSTANTS = {
    APP_NAME: "Compass",
    JWT: {
        SECRET: process.env.JWT_SECRET,
        EXPIRES_IN: "1h",
        REFRESH_EXPIRES_IN: "7d",
    },
    PERMISSIONS: {
        ADMIN: "admin",
        PACKAGE: {
            CREATE: "package:create",
            READ: "package:read",
            UPDATE: "package:update",
            DELETE: "package:delete",
        },
        DESTINATION: {
            CREATE: "destination:create",
            READ: "destination:read",
            DELETE: "destination:delete",
            UPDATE: "destination:update",
        }
    },
    ERRORS: {
        INVALID_CREDENTIALS: "Invalid credentials",
        INTERNAL_SERVER_ERROR: "Internal server error",
        NOT_FOUND: "Not found",
        UNAUTHORIZED: "Unauthorized",
        FORBIDDEN: "Forbidden",
    },
    ROUTES: {
        AUTH: {
            AGENT_LOGIN: "/auth/agent/login",
            AGENT_SIGNUP: "/auth/agent/signup",
        },
        PACKAGE: {
            CREATE: "/package/create",
            GET_ALL: "/package",
            DELETE: "/package/delete/:id",
            UPDATE: "/package/update",
            GET_BY_ID: "/package/:id",
        },
        DESTINATION: {
            CREATE: "/destination/create",
            DELETE: "/destination/delete/:destinationId",
            GET_BY_PACKAGE: "/destination/package/:packageId",
            GET_ALL: "/destination",
            UPDATE: "/destination/update",
        },
        COMMON: {
            COUNTRIES: "/countries",
        }
    }
};