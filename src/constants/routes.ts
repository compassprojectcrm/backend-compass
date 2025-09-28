export const ROUTES = {
    AUTH: {
        AGENT_LOGIN: "/auth/agent/login",
        AGENT_SIGNUP: "/auth/agent/signup",
        TRAVELLER_SIGNUP: "/auth/customer/signup",
        TRAVELLER_LOGIN: "/auth/customer/login",
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
        SEARCH_CUSTOMER_EMAIL: "/search-customer-email",
    },
    TRAVELLER: {
        UPDATE_TRAVELLER: "/packages/traveller/update",
        REMOVE_TRAVELLER: "/packages/traveller/delete",
        ADD_TRAVELLER: "/packages/traveller/add",
    }
};