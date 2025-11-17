/**
 * ESLint rule: no-global-db-in-services
 *
 * Prevents importing the global `db` object from within service files.
 * Services should only accept a `DbConnection` parameter, never use the global db directly.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow importing global db in service layer - services must accept DbConnection parameter",
            category: "Architecture",
            recommended: true,
        },
        messages: {
            noGlobalDb:
                "Services must not import the global 'db' object. Accept a 'DbConnection' parameter instead.",
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
            ImportDeclaration(node) {
                const importSource = node.source.value;

                // Check if importing from db module
                if (
                    importSource === "#server/db" ||
                    importSource === "~/server/db" ||
                    importSource === "~~/server/db"
                ) {
                    // Check if importing 'db' specifically
                    const importsDb = node.specifiers.some((specifier) => {
                        if (specifier.type === "ImportSpecifier") {
                            return specifier.imported.name === "db";
                        }
                        return false;
                    });

                    if (importsDb) {
                        context.report({
                            node,
                            messageId: "noGlobalDb",
                        });
                    }
                }
            },
        };
    },
};
