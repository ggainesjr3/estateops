/**
 * Browser-safe entry point for @estateops/shared.
 *
 * This module re-exports ONLY plain TypeScript types, interfaces, enums, and
 * constants. It MUST NOT import (directly or transitively) class-transformer,
 * class-validator, reflect-metadata, or any other server-only / decorator-based
 * code. Consumers running in the browser should import from
 * `@estateops/shared/types` instead of the package root.
 */
export * from './enums';
export * from './constants';
export * from './types/index';
