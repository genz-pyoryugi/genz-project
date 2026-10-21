// Compile application TypeScript to CJS for Node's test runner; no extra test framework.
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.resolve('src', request.slice(2)) : request, ...args);
};
const compile = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};
require.extensions['.ts'] = compile;
require.extensions['.tsx'] = compile;
