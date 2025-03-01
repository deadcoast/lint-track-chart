#!/usr/bin/env node

import { program } from 'commander';
import { getCurrentTheme } from './lib/themes.js';
import { commandExists } from './lib/utils.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Command imports
import { trackCommand } from './lib/commands/track.js';
import { compareCommand } from './lib/commands/compare.js';
import { fixCommand } from './lib/commands/fix.js';
import { chartCommand } from './lib/commands/chart.js';
import { themeCommand } from './lib/commands/theme.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Version and description
const packageJson = JSON.parse(await import(path.join(__dirname, 'package.json'), { assert: { type: 'json' } }));
const VERSION = packageJson.version;
const DESCRIPTION = 'Advanced ESLint tracking and visualization tool';

async function main() {
    const theme = getCurrentTheme();

    // Verify ESLint installation
    if (!commandExists('eslint')) {
        console.error(theme.errorStyle('Error: ESLint is not installed. Please install ESLint to use this tool.'));
        process.exit(1);
    }

    program
        .name('lint-track-chart')
        .description(DESCRIPTION)
        .version(VERSION, '-v, --version', 'Output the current version')
        .option('-d, --debug', 'Enable debug mode')
        .option('-q, --quiet', 'Suppress non-essential output')
        .option('-c, --config <path>', 'Path to config file', path.join(__dirname, 'config', 'default.js'))
        .option('-o, --output <directory>', 'Output directory for reports', path.join(__dirname, 'reports'))
        .option('--no-color', 'Disable colored output')
        .hook('preAction', (thisCommand, actionCommand) => {
            // Global pre-action hook for all commands
            const options = actionCommand.opts();
            if (options.debug) {
                console.log(theme.infoStyle('Debug mode enabled'));
            }
        });

    // Track Command
    program
        .command('track')
        .description('Track ESLint issues and generate reports')
        .option('-p, --path <path>', 'Path to analyze (default: current directory)')
        .option('-f, --format <format>', 'Output format (json, html, console)', 'console')
        .option('-i, --include <patterns...>', 'Glob patterns to include')
        .option('-e, --exclude <patterns...>', 'Glob patterns to exclude')
        .option('--fix', 'Automatically fix problems')
        .option('--max-warnings <number>', 'Number of warnings to trigger nonzero exit code')
        .action(trackCommand);

    // Compare Command
    program
        .command('compare')
        .description('Compare ESLint results between commits or branches')
        .option('-b, --base <commit>', 'Base commit/branch for comparison')
        .option('-t, --target <commit>', 'Target commit/branch for comparison')
        .option('-d, --detailed', 'Show detailed comparison')
        .option('--stat', 'Show statistics only')
        .action(compareCommand);

    // Fix Command
    program
        .command('fix')
        .description('Interactive ESLint rule fixing')
        .option('-r, --rule <rule>', 'Specific rule to fix')
        .option('-a, --auto', 'Automatically fix safe rules')
        .option('--dry-run', 'Show what would be fixed without making changes')
        .option('--fix-type <type>', 'Specify the type of fixes to apply (problem, suggestion, layout)')
        .action(fixCommand);

    // Chart Command
    program
        .command('chart')
        .description('Generate visual charts of ESLint progress')
        .option('-t, --type <type>', 'Chart type (trend, distribution, heatmap)', 'trend')
        .option('-p, --period <period>', 'Time period to analyze (day, week, month, year)', 'month')
        .option('--width <pixels>', 'Chart width in pixels', '800')
        .option('--height <pixels>', 'Chart height in pixels', '600')
        .option('--interactive', 'Generate interactive HTML chart')
        .action(chartCommand);

    // Theme Command
    program
        .command('theme')
        .description('Manage color themes')
        .option('-l, --list', 'List available themes')
        .option('-s, --set <theme>', 'Set active theme')
        .option('-p, --preview', 'Preview current theme')
        .option('--create <name>', 'Create a new theme')
        .option('--export <file>', 'Export themes to file')
        .option('--import <file>', 'Import themes from file')
        .action(themeCommand);

    // Error handling
    program.showHelpAfterError('(add --help for additional information)');
    
    try {
        await program.parseAsync(process.argv);
    } catch (error) {
        console.error(theme.errorStyle('Error:'), error.message);
        if (program.opts().debug) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    const theme = getCurrentTheme();
    console.error(theme.errorStyle('\nFatal Error:'), error.message);
    if (program.opts().debug) {
        console.error(error.stack);
    }
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    const theme = getCurrentTheme();
    console.error(theme.errorStyle('\nUnhandled Promise Rejection:'), reason);
    if (program.opts().debug) {
        console.error('Promise:', promise);
    }
    process.exit(1);
});

main().catch((error) => {
    const theme = getCurrentTheme();
    console.error(theme.errorStyle('\nFatal Error:'), error.message);
    if (program.opts().debug) {
        console.error(error.stack);
    }
    process.exit(1);
});