/**
 * PWA Configuration
 * 
 * Controls whether certain features require standalone (app) mode.
 * Set NEXT_PUBLIC_REQUIRE_STANDALONE=false in .env.local to disable during development.
 */
export const REQUIRE_STANDALONE_ENABLED = 
  process.env.NEXT_PUBLIC_REQUIRE_STANDALONE !== 'false';

