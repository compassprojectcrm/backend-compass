import { ROLES } from "./roles";

/** Define all permissions with assigned roles */
export const PERMISSIONS = {
    PACKAGE: {
        CREATE: { key: "package:create", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        READ: { key: "package:read", roles: [ROLES.AGENT, ROLES.TRAVELLER, ROLES.AGENT_MEMBER] },
        UPDATE: { key: "package:update", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        DELETE: { key: "package:delete", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
    },

    TRAVELLER: {
        ADD: { key: "traveller:add", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        REMOVE: { key: "traveller:remove", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        UPDATE: { key: "traveller:update", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
    },

    DESTINATION: {
        CREATE: { key: "destination:create", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        UPDATE: { key: "destination:update", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        DELETE: { key: "destination:delete", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
    },

    COMMON: {
        READ_COUNTRIES: { key: "countries:read", roles: [ROLES.AGENT, ROLES.TRAVELLER, ROLES.AGENT_MEMBER] },
        SEARCH_CUSTOMER_USERNAME: { key: "search_username:read", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        GET_ALL_PERMISSIONS: { key: "permissions:read", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
    },

    AGENT_MEMBER: {
        CREATE: { key: "agent_member:create", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        UPDATE: { key: "agent_member:update", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        DELETE: { key: "agent_member:delete", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
        READ: { key: "agent_member:read", roles: [ROLES.AGENT, ROLES.AGENT_MEMBER] },
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
