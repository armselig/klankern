/**
 * ESLint rule: require-db-connection-param
 *
 * Ensures that exported service functions accept a database connection parameter.
 * This enforces the pattern where services are testable with transactions.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "Require service functions to accept a database connection parameter",
            category: "Architecture",
            recommended: true,
        },
        messages: {
            missingDbConnection:
                "Service function '{{name}}' must accept a 'dbConnection' or 'db' or 'tx' parameter as its first argument.",
        },
        schema: [],
    },
    create(context) {
        const filename = context.getFilename();

        // Only apply this rule to files in server/services/
        if (!filename.includes("/server/services/")) {
            return {};
        }

        /**
         * Check if a function has a database connection parameter
         */
        function hasDbConnectionParam(node) {
            if (!node.params || node.params.length === 0) {
                return false;
            }

            const firstParam = node.params[0];

            // Check if first parameter is named appropriately
            if (firstParam.type === "Identifier") {
                const paramName = firstParam.name.toLowerCase();
                return (
                    paramName === "dbconnection" ||
                    paramName === "db" ||
                    paramName === "tx" ||
                    paramName === "connection"
                );
            }

            return false;
        }

        /**
         * Check if this is likely a service function (exported and async)
         */
        function isServiceFunction(node) {
            // Must be async (service functions interact with database)
            return node.async === true;
        }

        return {
            // Check exported function declarations
            ExportNamedDeclaration(node) {
                if (node.declaration) {
                    // export async function foo() {}
                    if (node.declaration.type === "FunctionDeclaration") {
                        const func = node.declaration;
                        if (
                            isServiceFunction(func) &&
                            !hasDbConnectionParam(func)
                        ) {
                            context.report({
                                node: func,
                                messageId: "missingDbConnection",
                                data: {
                                    name:
                                        func.id?.name || "anonymous function",
                                },
                            });
                        }
                    }

                    // export const foo = async () => {}
                    if (node.declaration.type === "VariableDeclaration") {
                        node.declaration.declarations.forEach((declarator) => {
                            if (
                                declarator.init &&
                                (declarator.init.type ===
                                    "ArrowFunctionExpression" ||
                                    declarator.init.type ===
                                        "FunctionExpression")
                            ) {
                                const func = declarator.init;
                                if (
                                    isServiceFunction(func) &&
                                    !hasDbConnectionParam(func)
                                ) {
                                    context.report({
                                        node: func,
                                        messageId: "missingDbConnection",
                                        data: {
                                            name:
                                                declarator.id?.name ||
                                                "anonymous function",
                                        },
                                    });
                                }
                            }
                        });
                    }
                }
            },
        };
    },
};
