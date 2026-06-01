const crypto = require('crypto');
const { createTransformer } = require('@swc/jest');

const base = createTransformer({
  jsc: {
    parser: { syntax: 'typescript', decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
    target: 'es2021',
  },
  module: { type: 'commonjs' },
});

module.exports = {
  process(src, filename, config) {
    return base.process(src, filename, config ?? { supportsStaticESM: false });
  },
  getCacheKey(src, filename) {
    return crypto.createHash('sha1').update(src).update(filename).digest('hex');
  },
};
