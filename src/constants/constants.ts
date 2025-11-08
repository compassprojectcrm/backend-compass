export const CONSTANTS = {
    APP_NAME: "Compass",
    JWT: {
        SECRET: process.env.JWT_SECRET,
        EXPIRES_IN: "3h",
        REFRESH_EXPIRES_IN: "7d",
    },
    ERRORS: {
        INVALID_CREDENTIALS: "Invalid credentials",
        INTERNAL_SERVER_ERROR: "Internal server error",
        NOT_FOUND: "Not found",
        UNAUTHORIZED: "Unauthorized",
        FORBIDDEN: "Forbidden",
        ALREADY_EXISTS: "Resource already exists",
    }
};