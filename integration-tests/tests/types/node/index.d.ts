// Our version of Node.js types are very restricted
// This file will get resolved when realm's dependency on bson resolves a dependency on @types/node.
// We need this file to prevent the NodeJS globals to be accessable from within the test source files.

interface Buffer extends Uint8Array { }
