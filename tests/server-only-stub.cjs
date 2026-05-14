const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'server-only') {
    return require.resolve('./empty-module.cjs');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
