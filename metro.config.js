const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude non-JS directories from the Metro bundler
config.resolver.blockList = [
    /[/\\]\.venv(?:[/\\]|$)/,
    /[/\\]backend(?:[/\\]|$)/,
    /[/\\]\.git(?:[/\\]|$)/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
