export const CONSTANTS = {
    APP_NAME: "Compass",
    JWT: {
        SECRET: process.env.JWT_SECRET,
        EXPIRES_IN: "1h",
        REFRESH_EXPIRES_IN: "7d",
    },
    PERMISSIONS: {
        ADMIN: "admin",
        AGENT: {
            PACKAGE: {
                CREATE: "package:create",
                READ: "package:read",
                UPDATE: "package:update",
                DELETE: "package:delete",
            }
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
        AGENT: {
            AUTH: {
                LOGIN: "/auth/agent/login",
                SIGNUP: "/auth/agent/signup",
            },
            PACKAGE: {
                CREATE: "/agent/package/create",
                GET_ALL: "/agent/package",
                DELETE: "/agent/package/delete/:id",
                UPDATE: "/agent/package/update",
                GET_BY_ID: "/agent/package/:id",
            }
        },
        COMMON: {
            COUNTRIES: "/countries",
        }
    }
};