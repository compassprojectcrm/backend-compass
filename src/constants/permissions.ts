import { ROLES } from "./roles";

/** Define all permissions with assigned roles */
export const PERMISSIONS = {
    PACKAGE: {
        CREATE: { key: "package:create", roles: [ROLES.AGENT] },
        READ: { key: "package:read", roles: [ROLES.AGENT, ROLES.TRAVELLER] },
        UPDATE: { key: "package:update", roles: [ROLES.AGENT] },
        DELETE: { key: "package:delete", roles: [ROLES.AGENT] },
    },

    DESTINATION: {
        CREATE: { key: "destination:create", roles: [ROLES.AGENT] },
        UPDATE: { key: "destination:update", roles: [ROLES.AGENT] },
        DELETE: { key: "destination:delete", roles: [ROLES.AGENT] },
    },

    COMMON: {
        READ_COUNTRIES: { key: "countries:read", roles: [ROLES.AGENT, ROLES.TRAVELLER] },
        SEARCH_CUSTOMER_EMAIL: { key: "search_email:read", roles: [ROLES.AGENT] },
    }
};

/**
 * Get all permission keys for a specific role
 * @param role Role to filter permissions by
 * @returns Array of permission keys (strings)
 */
export function getPermissionKeysByRole(role: typeof ROLES[keyof typeof ROLES]): string[] {
    const keys: string[] = [];

    for (const category of Object.values(PERMISSIONS)) {
        for (const perm of Object.values(category)) {
            if (perm.roles.includes(role)) {
                keys.push(perm.key);
            }
        }
    }

    return keys;
}
