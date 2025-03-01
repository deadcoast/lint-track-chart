import chalk from 'chalk';

/**
 * Theme definitions for the CLI interface
 */
export const themes = {
  default: {
    titleStyle: chalk.bold.blue,
    errorStyle: chalk.red,
    warningStyle: chalk.yellow,
    successStyle: chalk.green,
    infoStyle: chalk.cyan,
    highlightStyle: chalk.magenta,
    optionStyle: chalk.white,
    dimStyle: chalk.gray,
    name: 'Default (Blue)',
    description: 'Classic blue theme with high contrast'
  },
  ocean: {
    titleStyle: chalk.bold.cyan,
    errorStyle: chalk.red,
    warningStyle: chalk.yellow,
    successStyle: chalk.greenBright,
    infoStyle: chalk.blue,
    highlightStyle: chalk.magentaBright,
    optionStyle: chalk.whiteBright,
    dimStyle: chalk.gray,
    name: 'Ocean',
    description: 'Calming cyan and blue tones'
  },
  forest: {
    titleStyle: chalk.bold.green,
    errorStyle: chalk.redBright,
    warningStyle: chalk.yellowBright,
    successStyle: chalk.greenBright,
    infoStyle: chalk.cyan,
    highlightStyle: chalk.magenta,
    optionStyle: chalk.white,
    dimStyle: chalk.gray,
    name: 'Forest',
    description: 'Nature-inspired green theme'
  },
  sunset: {
    titleStyle: chalk.bold.magenta,
    errorStyle: chalk.redBright,
    warningStyle: chalk.yellow,
    successStyle: chalk.green,
    infoStyle: chalk.blueBright,
    highlightStyle: chalk.magentaBright,
    optionStyle: chalk.whiteBright,
    dimStyle: chalk.gray,
    name: 'Sunset',
    description: 'Warm magenta and orange tones'
  },
  monochrome: {
    titleStyle: chalk.bold.white,
    errorStyle: chalk.bold.gray,
    warningStyle: chalk.white,
    successStyle: chalk.bold.white,
    infoStyle: chalk.gray,
    highlightStyle: chalk.bold.white,
    optionStyle: chalk.white,
    dimStyle: chalk.gray,
    name: 'Monochrome',
    description: 'Clean black and white aesthetic'
  }
};

// Store current theme
let currentTheme = 'default';

/**
 * Get the current theme object
 */
export function getCurrentTheme() {
  return themes[currentTheme];
}

/**
 * Set the current theme
 * @param {string} themeName - Name of the theme to set
 * @returns {boolean} - Whether the theme was successfully set
 */
export function setTheme(themeName) {
  if (themes[themeName]) {
    currentTheme = themeName;
    return true;
  }
  return false;
}

/**
 * Get list of available themes
 * @returns {Array<{name: string, description: string}>} List of themes
 */
export function getAvailableThemes() {
  return Object.entries(themes).map(([id, theme]) => ({
    id,
    name: theme.name,
    description: theme.description
  }));
}

/**
 * Preview a theme's colors
 * @param {string} themeName - Name of theme to preview
 */
export function previewTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;

  console.log('\nTheme Preview:', theme.name);
  console.log('Description:', theme.description);
  console.log('\nColor Samples:');
  console.log(theme.titleStyle('Title Style (titleStyle)'));
  console.log(theme.errorStyle('Error Style (errorStyle)'));
  console.log(theme.warningStyle('Warning Style (warningStyle)'));
  console.log(theme.successStyle('Success Style (successStyle)'));
  console.log(theme.infoStyle('Info Style (infoStyle)'));
  console.log(theme.highlightStyle('Highlight Style (highlightStyle)'));
  console.log(theme.optionStyle('Option Style (optionStyle)'));
  console.log(theme.dimStyle('Dim Style (dimStyle)'));
}

/**
 * Get a specific theme by name
 * @param {string} themeName - Name of theme to get
 * @returns {Object|null} Theme object or null if not found
 */
export function getTheme(themeName) {
  return themes[themeName] || null;
}

/**
 * Check if a theme exists
 * @param {string} themeName - Name of theme to check
 * @returns {boolean} Whether the theme exists
 */
export function themeExists(themeName) {
  return !!themes[themeName];
}

/**
 * Get the current theme name
 * @returns {string} Current theme name
 */
export function getCurrentThemeName() {
  return currentTheme;
}