/**
 * Custom ESLint plugin for enforcing service layer architecture
 *
 * This plugin provides rules to ensure:
 * 1. Services don't import the global db object
 * 2. Services don't start their own transactions
 * 3. Service functions accept a database connection parameter
 */

import noGlobalDbInServices from "./no-global-db-in-services.js";
import noDbTransactionInServices from "./no-db-transaction-in-services.js";
import requireDbConnectionParam from "./require-db-connection-param.js";

export default {
    rules: {
        "no-global-db-in-services": noGlobalDbInServices,
        "no-db-transaction-in-services": noDbTransactionInServices,
        "require-db-connection-param": requireDbConnectionParam,
    },
};
