const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable package exports to avoid Metro confusing the "exports" map in React 19
config.resolver.unstable_enablePackageExports = false;

// Custom resolver to explicitly point Metro to the correct React 19 files
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react/jsx-dev-runtime') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    };
  }
  if (moduleName === 'react/jsx-runtime') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
    };
  }
  if (moduleName === 'react') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/react/index.js'),
    };
  }
  
  // Chain to the standard Metro resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
