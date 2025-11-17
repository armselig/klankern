/**
 * ESLint rule: no-db-transaction-in-services
 *
 * Prevents calling db.transaction() from within service files.
 * Transactions should only be started in route handlers, services receive them as parameters.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow starting transactions in service layer - transactions must be managed by route handlers",
            category: "Architecture",
            recommended: true,
        },
        messages: {
            noDbTransaction:
                "Services must not call .transaction(). Transactions should be managed by route handlers and passed as DbConnection parameters.",
        },
        schema: [],
    },
    create(context) {
        const filename = context.getFilename();

        // Only apply this rule to files in server/services/
        if (!filename.includes("/server/services/")) {
            return {};
        }

        return {
            CallExpression(node) {
                // Check for db.transaction() or dbConnection.transaction() calls
                if (
                    node.callee.type === "MemberExpression" &&
                    node.callee.property.type === "Identifier" &&
                    node.callee.property.name === "transaction"
                ) {
                    // Check if object is 'db' or potentially a connection
                    const objectName =
                        node.callee.object.type === "Identifier"
                            ? node.callee.object.name
                            : null;

                    // Flag if calling .transaction() on 'db' or 'dbConnection'
                    // We want to be permissive but catch the obvious cases
                    if (
                        objectName === "db" ||
                        objectName === "dbConnection" ||
                        objectName === "connection"
                    ) {
                        context.report({
                            node,
                            messageId: "noDbTransaction",
                        });
                    }
                }
            },
        };
    },
};
