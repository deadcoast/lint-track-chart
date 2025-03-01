#!/usr/bin/env node

import { program } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import fsPromises from 'fs/promises';

import defaultConfig from '../config/default.js';
import { getCurrentTheme } from '../lib/themes.js';
import { interactive } from '../lib/commands/interactive.js';
import {
    ensureDirectoryExists,
    readJsonSafe,
    writeJsonSafe,
    commandExists,
    getAllFiles,
    getSize,
    createBackup,
    debounce,
    throttle
} from '../lib/utils.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CLI {
    constructor() {
        this.config = defaultConfig;
        this.theme = getCurrentTheme();
        this.spinner = null;
        this.initialized = false;
        this.commandHistory = [];
        this.startTime = Date.now();
    }

    /**
     * Initialize the CLI environment
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Ensure required directories exist
            await this.ensureDirectories();

            // Load user config and merge with defaults
            await this.loadUserConfig();

            // Verify dependencies
            await this.verifyDependencies();

            // Initialize plugins
            if (this.config.plugins.autoload) {
                await this.loadPlugins();
            }

            // Setup event handlers
            this.setupEventHandlers();

            this.initialized = true;
        } catch (error) {
            this.handleError('Initialization failed', error);
            process.exit(1);
        }
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [
            this.config.paths.cache,
            this.config.paths.reports,
            this.config.themes.userThemesDir,
            path.join(this.config.paths.cache, 'backups'),
            path.join(this.config.paths.cache, 'logs')
        ];

        for (const dir of dirs) {
            await ensureDirectoryExists(dir);
        }
    }

    /**
     * Load and merge user configuration
     */
    async loadUserConfig() {
        const userConfigPath = path.join(process.cwd(), '.lint-track-chartrc.json');
        const userConfig = await readJsonSafe(userConfigPath, {});
        this.config = this.mergeConfigs(this.config, userConfig);
    }

    /**
     * Verify required dependencies
     */
    async verifyDependencies() {
        const requiredDeps = ['eslint', 'git'];
        for (const dep of requiredDeps) {
            if (!commandExists(dep)) {
                throw new Error(`Required dependency '${dep}' is not installed`);
            }
        }
    }

    /**
     * Load plugins from the plugins directory
     */
    async loadPlugins() {
        const pluginsDir = this.config.plugins.directory;
        if (!fs.existsSync(pluginsDir)) return;

        const plugins = await fsPromises.readdir(pluginsDir);
        for (const plugin of plugins) {
            try {
                const pluginPath = path.join(pluginsDir, plugin);
                const pluginModule = await import(pluginPath);
                await pluginModule.default(this);
            } catch (error) {
                this.logWarning(`Failed to load plugin ${plugin}: ${error.message}`);
            }
        }
    }

    /**
     * Setup process event handlers
     */
    setupEventHandlers() {
        process.on('SIGINT', () => this.handleExit('SIGINT'));
        process.on('SIGTERM', () => this.handleExit('SIGTERM'));
        process.on('uncaughtException', (error) => this.handleError('Uncaught Exception', error));
        process.on('unhandledRejection', (error) => this.handleError('Unhandled Rejection', error));
    }

    /**
     * Start the spinner with a message
     */
    startSpinner(message) {
        if (this.config.output.verbosity === 0) return;
        this.spinner = ora({
            text: message,
            color: 'cyan',
            spinner: 'dots'
        }).start();
    }

    /**
     * Stop the spinner with a status
     */
    stopSpinner(status = 'succeed') {
        if (!this.spinner) return;
        this.spinner[status]();
        this.spinner = null;
    }

    /**
     * Log a message with timestamp
     */
    log(message, level = 'info') {
        if (this.config.output.verbosity === 0) return;

        const timestamp = this.config.output.timestamps
            ? chalk.gray(`[${new Date().toISOString()}] `)
            : '';

        const coloredMessage = this.theme[`${level}Style`](message);
        console.log(`${timestamp}${coloredMessage}`);
    }

    /**
     * Log an error message
     */
    logError(message, error) {
        this.log(message, 'error');
        if (error && this.config.core.debug) {
            console.error(error.stack);
        }
    }

    /**
     * Log a warning message
     */
    logWarning(message) {
        this.log(message, 'warning');
    }

    /**
     * Handle graceful shutdown
     */
    async handleExit(signal) {
        this.log(`\nReceived ${signal}, cleaning up...`);
        
        // Stop any running processes
        if (this.spinner) {
            this.stopSpinner('fail');
        }

        // Save command history
        await this.saveCommandHistory();

        // Clean up temporary files
        await this.cleanup();

        process.exit(0);
    }

    /**
     * Handle errors
     */
    handleError(context, error) {
        this.logError(`${context}: ${error.message}`);
        
        if (this.config.core.debug) {
            console.error('Stack trace:', error.stack);
            console.error('Context:', context);
            console.error('Configuration:', this.config);
        }

        // Notify if enabled
        if (this.config.notifications.enabled) {
            this.sendNotification('error', `${context}: ${error.message}`);
        }
    }

    /**
     * Send a notification
     */
    async sendNotification(level, message) {
        if (!this.config.notifications.enabled) return;
        if (!this.config.notifications.levels.includes(level)) return;

        const throttled = throttle(async () => {
            for (const channel of this.config.notifications.channels) {
                try {
                    await this.sendNotificationToChannel(channel, level, message);
                } catch (error) {
                    this.logWarning(`Failed to send notification to ${channel}: ${error.message}`);
                }
            }
        }, this.config.notifications.throttle.interval);

        await throttled();
    }

    /**
     * Send notification to specific channel
     */
    async sendNotificationToChannel(channel, level, message) {
        switch (channel) {
            case 'console':
                this.log(`[${level.toUpperCase()}] ${message}`);
                break;
            case 'system':
                // Implement system notifications
                break;
            default:
                throw new Error(`Unknown notification channel: ${channel}`);
        }
    }

    /**
     * Save command history
     */
    async saveCommandHistory() {
        const historyFile = path.join(this.config.paths.cache, 'command-history.json');
        await writeJsonSafe(historyFile, this.commandHistory);
    }

    /**
     * Clean up temporary files
     */
    async cleanup() {
        const tempFiles = await getAllFiles(this.config.paths.cache);
        for (const file of tempFiles) {
            try {
                await fs.unlink(file);
            } catch (error) {
                this.logWarning(`Failed to delete temporary file ${file}: ${error.message}`);
            }
        }
    }

    /**
     * Merge configurations recursively
     */
    mergeConfigs(base, override) {
        const merged = { ...base };
        for (const [key, value] of Object.entries(override)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                merged[key] = this.mergeConfigs(merged[key] || {}, value);
            } else {
                merged[key] = value;
            }
        }
        return merged;
    }

    /**
     * Get execution statistics
     */
    getStats() {
        return {
            startTime: this.startTime,
            uptime: Date.now() - this.startTime,
            commandsExecuted: this.commandHistory.length,
            memoryUsage: process.memoryUsage(),
            config: this.config
        };
    }

    /**
     * Create a backup of the current state
     */
    async createBackup() {
        const backupDir = path.join(this.config.paths.cache, 'backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

        const backupData = {
            stats: this.getStats(),
            commandHistory: this.commandHistory,
            config: this.config
        };

        await writeJsonSafe(backupFile, backupData);
        return backupFile;
    }
}

// Export singleton instance
export const cli = new CLI();

// Initialize CLI when imported
// Define CLI commands for direct usage
program
  .option('-n, --non-interactive', 'Run in non-interactive mode')
  .option('-t, --track', 'Run linting analysis')
  .option('-c, --compare', 'Compare with previous version')
  .option('-f, --fix <rule>', 'Fix specific ESLint rule')
  .option('-v, --view', 'View progress and statistics')
  .option('--theme <name>', 'Set theme')
  .option('--html', 'Generate HTML report')
  .parse(process.argv);

const options = program.opts();

// If any specific command is provided, run in non-interactive mode
if (options.nonInteractive || 
    options.track || 
    options.compare || 
    options.fix || 
    options.view || 
    options.theme || 
    options.html) {
    // Handle direct CLI commands
    await cli.initialize();
    if (options.track) await cli.track();
    if (options.compare) await cli.compare();
    if (options.fix) await cli.fix(options.fix);
    if (options.view) await cli.chart();
    if (options.theme) await cli.setTheme(options.theme);
    if (options.html) await cli.generateHtmlReport();
} else {
    // Default to interactive mode
    interactive();
}
await cli.initialize();