/**
 * Mock server-only module for Vitest.
 * The real server-only module throws when imported in non-server contexts.
 * This mock allows tests to import modules that transitively depend on it.
 */
export {};
