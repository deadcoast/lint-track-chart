#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import { clearInterval, clearTimeout, setInterval, setTimeout } from 'node:timers';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * TypeScript Linting Tracker
 *
 * USAGE:
 *   node tools/track-and-chart.js [command] [options]
 *
 * COMMANDS:
 *   track    Record current linting issues (default command)
 *   chart    Generate a progress chart from the logs
 *   help     Show help information
 *
 * TRACK OPTIONS:
 *   --details      Include details about top issues in the log (default)
 *   --no-details   Don't include details about issues in the log
 *   --no-prettier  Skip Prettier check
 *   --silent       Don't show the progress chart
 *   --color        Enable colored output (default)
 *   --no-color     Disable colored output
 *
 * CHART OPTIONS:
 *   --verbose      Show detailed trend analysis
 *   --no-color     Disable colored output
 *
 * EXAMPLES:
 *   # Record basic progress
 *   node tools/track-and-chart.js track
 *
 *   # Record detailed progress with issue breakdown
 *   node tools/track-and-chart.js track --details
 *
 *   # Generate a detailed chart
 *   node tools/track-and-chart.js chart --verbose
 *
 * OUTPUT FILES:
 *   - eslint-progress.log - Log file with progress entries
 */

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration (you can adjust these)
const CONFIG = {
  logFile: path.join(__dirname, '..', 'eslint-progress.log'),
  filePatterns: ['ts', 'tsx'],
  ignoreDirs: ['node_modules', 'dist', 'build', '.git'],
  includeDetails: true, // Set to true to include top issues in the log
  topIssuesCount: 5, // Number of top issues to display
  checkPrettier: true, // Whether to check Prettier formatting
  timeout: 60000, // Default timeout: 60 seconds
  fileGlobs: '"src/**/*.ts" "src/**/*.tsx"',
};

// Process command line arguments
const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith('-') ? args[0] : 'track';
const showHelp = args.includes('--help') || args.includes('-h');
const includeDetails = args.includes('--details')
  ? true
  : args.includes('--no-details')
    ? false
    : CONFIG.includeDetails;
const checkPrettier = args.includes('--no-prettier') ? false : CONFIG.checkPrettier;
const silentMode = args.includes('--silent');
const useColors = !args.includes('--no-color');
const verboseMode = args.includes('--verbose');

// ANSI color codes
const colors = {
  reset: useColors ? '\x1b[0m' : '',
  red: useColors ? '\x1b[31m' : '',
  green: useColors ? '\x1b[32m' : '',
  yellow: useColors ? '\x1b[33m' : '',
  blue: useColors ? '\x1b[34m' : '',
  magenta: useColors ? '\x1b[35m' : '',
  cyan: useColors ? '\x1b[36m' : '',
  white: useColors ? '\x1b[37m' : '',
  bold: useColors ? '\x1b[1m' : '',
};

// Simple progress bar function
function updateProgressBar(current, total, message = '', barLength = 30) {
  const progress = Math.min(100, Math.round((current / total) * 100));
  const filledLength = Math.min(barLength, Math.round((current / total) * barLength));
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  process.stdout.write(`\r[${bar}] ${progress}% | ${message}`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

// Rename the second showHelp function to displayHelp
function displayHelp() {
  console.log(`${colors.bold}ESLint & Prettier Progress Tracker${colors.reset}`);
  console.log('Usage: node tools/track-and-chart.js [command] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  track    Record current linting issues (default)');
  console.log('  chart    Generate a progress chart from the logs');
  console.log('  help     Show this help information');
  console.log('');
  console.log('Track Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --details      Include details about top issues in the log');
  console.log("  --no-details   Don't include details about issues in the log");
  console.log('  --no-prettier  Skip Prettier check');
  console.log("  --silent       Don't show the progress chart");
  console.log('  --color        Enable colored output (default)');
  console.log('  --no-color     Disable colored output');
  console.log('');
  console.log('Chart Options:');
  console.log('  --verbose      Show detailed trend analysis');
  console.log('  --no-color     Disable colored output');
  console.log('');
  console.log('Description:');
  console.log('  Tracks ESLint and Prettier issues over time for TypeScript files');
  console.log('  Adds a new entry to eslint-progress.log with current issue counts');
  console.log('  Generates a progress chart to visualize improvements');
}

// Helper function to execute commands safely with progress indication
function safeExec(command, progressMessage = 'Processing') {
  console.log(`${progressMessage}...`);

  try {
    // Show a simple spinner while the command is running
    let spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    let spinnerInterval;

    if (!silentMode) {
      spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${spinnerFrames[frameIndex]} ${progressMessage}...`);
        frameIndex = (frameIndex + 1) % spinnerFrames.length;
      }, 80);
    }

    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (!silentMode && spinnerInterval) {
      clearInterval(spinnerInterval);
      process.stdout.write(`\r✓ ${progressMessage} ${colors.green}completed${colors.reset}    \n`);
    }

    return result;
  } catch (error) {
    // If the command fails but outputs something, return that output
    if (error.stdout) {
      return error.stdout;
    }
    throw error;
  }
}

// ============================================
// TRACK COMMAND - Track current linting status
// ============================================
async function trackProgress() {
  try {
    console.log(`${colors.bold}ESLint & Prettier Progress Tracker${colors.reset}`);
    console.log(`Running checks on ${new Date().toISOString().split('T')[0]}...\n`);

    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.error(
        `\n\n${colors.red}Script execution timed out after ${CONFIG.timeout / 1000} seconds${colors.reset}`
      );
      console.error('This may indicate an issue with ESLint or Prettier processing');
      process.exit(1);
    }, CONFIG.timeout);

    // Get current date
    const date = new Date().toISOString().split('T')[0];
    const dateEntry = `===== ${date} =====`;

    // Ensure the log file exists
    if (!fs.existsSync(CONFIG.logFile)) {
      fs.writeFileSync(CONFIG.logFile, '', 'utf8');
      console.log(`${colors.green}Created new log file: ${CONFIG.logFile}${colors.reset}`);
    }

    let logContent = `${dateEntry}\n`;
    let totalIssues = 0;
    let eslintErrors = 0;
    let eslintWarnings = 0;
    let prettierIssues = 0;

    // Build the ESLint command with file patterns and ignores
    const eslintCmd = `npx eslint ${CONFIG.fileGlobs} --format json --max-warnings=9999`;

    // Run ESLint check
    const eslintOutput = safeExec(eslintCmd, 'Running ESLint check');

    // Parse ESLint results
    let eslintData = [];
    try {
      console.log('Parsing ESLint results...');
      eslintData = JSON.parse(eslintOutput);
      console.log(
        `${colors.green}Successfully parsed results for ${eslintData.length} files${colors.reset}`
      );
    } catch (error) {
      console.warn(
        `${colors.yellow}Warning: Could not parse ESLint output as JSON. ESLint may not be properly configured.${colors.reset}`
      );
      console.warn(`Error details: ${error.message}`);
      console.warn('Proceeding with zero ESLint issues...');
    }

    // Count errors and warnings with progress bar
    const issuesByRule = {};

    if (eslintData.length > 0) {
      console.log('Analyzing ESLint issues:');

      eslintData.forEach((file, index) => {
        updateProgressBar(
          index + 1,
          eslintData.length,
          `Analyzing file ${index + 1}/${eslintData.length}`
        );

        if (file.messages && file.messages.length > 0) {
          file.messages.forEach(msg => {
            if (msg.severity === 2) {
              eslintErrors++;
            } else if (msg.severity === 1) {
              eslintWarnings++;
            }

            // Track issues by rule
            const ruleId = msg.ruleId || 'unknown';
            if (!issuesByRule[ruleId]) {
              issuesByRule[ruleId] = 0;
            }
            issuesByRule[ruleId]++;
          });
        }
      });
    }

    // Check Prettier formatting issues if enabled
    if (checkPrettier) {
      try {
        const prettierCmd = `npx prettier --check ${CONFIG.fileGlobs} | wc -l`;
        const prettierOutput = safeExec(prettierCmd, 'Running Prettier check').trim();

        // Parse Prettier output - this is an approximation as Prettier doesn't have a strict format
        const prettierCount = parseInt(prettierOutput, 10);
        if (!isNaN(prettierCount) && prettierCount > 0) {
          // Usually Prettier prints a header line, so we subtract 1
          prettierIssues = Math.max(0, prettierCount - 1);
          console.log(
            `${colors.cyan}Found ${prettierIssues} Prettier formatting issues${colors.reset}`
          );
        } else {
          console.log(`${colors.green}No Prettier formatting issues found${colors.reset}`);
        }
      } catch (error) {
        console.warn(
          `${colors.yellow}Warning: Could not run Prettier check. Prettier may not be installed.${colors.reset}`
        );
        console.warn(`Error details: ${error.message}`);
        console.warn('Proceeding with zero Prettier issues...');
      }
    }

    // Calculate totals
    totalIssues = eslintErrors + eslintWarnings + prettierIssues;

    // Format the progress entry for the log file
    const progressEntry = `${totalIssues} problems (${eslintErrors} errors, ${eslintWarnings} warnings${checkPrettier ? `, ${prettierIssues} formatting` : ''})`;

    logContent += `${progressEntry}\n`;

    // Add details about top issues if enabled
    if (includeDetails && Object.keys(issuesByRule).length > 0) {
      logContent += '\nTop issues by rule:\n';

      // Sort issues by count (descending)
      const sortedIssues = Object.entries(issuesByRule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, CONFIG.topIssuesCount);

      sortedIssues.forEach(([rule, count]) => {
        logContent += `- ${rule}: ${count} occurrences\n`;
      });

      // Add a suggestion for fixing the top issue
      if (sortedIssues.length > 0) {
        const [topRule, topCount] = sortedIssues[0];
        if (topRule && topRule !== 'unknown') {
          logContent += `\nSuggestion: Focus on fixing "${topRule}" issues (${topCount} occurrences)\n`;

          if (topRule.startsWith('prettier/') || topRule === 'prettier') {
            logContent += `Try running: npx prettier --write ${CONFIG.fileGlobs}\n`;
          } else {
            logContent += `Try running: npx eslint --fix . --rule "${topRule}: error"\n`;
          }
        }
      }
    }

    logContent += '\n';

    // Write to log file
    fs.appendFileSync(CONFIG.logFile, logContent, 'utf8');
    console.log(`\n${colors.green}Progress entry added to ${CONFIG.logFile}${colors.reset}`);

    // Display summary
    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`${colors.red}ESLint errors: ${eslintErrors}${colors.reset}`);
    console.log(`${colors.yellow}ESLint warnings: ${eslintWarnings}${colors.reset}`);
    if (checkPrettier) {
      console.log(`${colors.magenta}Prettier issues: ${prettierIssues}${colors.reset}`);
    }
    console.log(`${colors.bold}Total issues: ${totalIssues}${colors.reset}`);

    // Generate chart
    if (!silentMode) {
      console.log(`\n${colors.bold}Generating progress chart...${colors.reset}`);
      await generateChart();
    }

    // Clear the timeout since we're done
    clearTimeout(timeoutId);
  } catch (error) {
    console.error(`\n${colors.red}Error tracking ESLint progress:${colors.reset}`, error.message);
    if (error.stack) {
      console.error(`\n${colors.yellow}Stack trace:${colors.reset}\n${error.stack}`);
    }
    process.exit(1);
  }
}

// ============================================
// CHART COMMAND - Generate progress chart
// ============================================
async function generateChart() {
  try {
    console.log(`${colors.bold}Processing ESLint/Prettier progress log...${colors.reset}`);

    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.error(`\n\n${colors.red}Script execution timed out after 10 seconds${colors.reset}`);
      console.error('This may indicate an issue with the log file format or size');
      process.exit(1);
    }, 10000);

    // Check if log file exists
    const logPath = CONFIG.logFile;
    if (!fs.existsSync(logPath)) {
      clearTimeout(timeoutId);
      console.log(`${colors.yellow}No ${CONFIG.logFile} file found.${colors.reset}`);
      console.log('\nRun the following command to create it:');
      console.log(`node tools/track-and-chart.js track`);
      return;
    }

    // Read the log file
    const logContent = fs.readFileSync(logPath, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());

    console.log(`Read ${logLines.length} lines from log file`);

    // Parse the log entries with progress bar
    const entries = [];
    let currentDate = '';

    console.log('Parsing log entries:');
    logLines.forEach((line, index) => {
      updateProgressBar(index + 1, logLines.length, `Parsing line ${index + 1}/${logLines.length}`);

      if (line.startsWith('===== ')) {
        // This is a date line
        currentDate = line.replace(/=+/g, '').trim();
      } else if (line.includes('problems')) {
        // This is a problems line from ESLint output
        const match = line.match(
          /(\d+) problems? \((\d+) errors?, (\d+) warnings?(?:, (\d+) formatting)?\)/
        );
        if (match) {
          entries.push({
            date: currentDate,
            total: parseInt(match[1], 10),
            errors: parseInt(match[2], 10),
            warnings: parseInt(match[3], 10),
            formatting: match[4] ? parseInt(match[4], 10) : 0,
          });
        }
      }
    });

    if (entries.length === 0) {
      clearTimeout(timeoutId);
      console.log(`\n${colors.yellow}No data entries found in ${CONFIG.logFile}${colors.reset}`);
      console.log('Make sure the file contains entries in the correct format:');
      console.log('===== DATE =====');
      console.log('X problems (Y errors, Z warnings)');
      return;
    }

    // Find the maximum number of issues to scale the chart
    const maxIssues = Math.max(...entries.map(e => e.total));
    const scale = 50; // Maximum width of chart

    console.log(
      `\n${colors.bold}${colors.cyan}=== ESLINT/PRETTIER LINTING PROGRESS CHART ===${colors.reset}`
    );
    console.log(`${colors.bold}Date       | Errors | Warnings | Format | Progress${colors.reset}`);
    console.log('-'.repeat(70));

    entries.forEach(entry => {
      const dateStr = entry.date.substring(0, 10);
      const errorsStr = entry.errors.toString().padStart(6);
      const warningsStr = entry.warnings.toString().padStart(8);
      const formattingStr = (entry.formatting || 0).toString().padStart(6);

      // Calculate bar length proportional to issues
      const progress = Math.floor((1 - entry.total / maxIssues) * 100);
      const barLength = Math.floor((scale * entry.total) / maxIssues);
      const bar = '█'.repeat(scale - barLength) + '░'.repeat(barLength);

      // Color-code based on progress
      let progressColor = colors.red;
      if (progress >= 75) {
        progressColor = colors.green;
      } else if (progress >= 50) {
        progressColor = colors.cyan;
      } else if (progress >= 25) {
        progressColor = colors.yellow;
      }

      console.log(
        `${dateStr} | ${colors.red}${errorsStr}${colors.reset} | ${colors.yellow}${warningsStr}${colors.reset} | ${colors.magenta}${formattingStr}${colors.reset} | ${progressColor}${bar} ${progress}%${colors.reset}`
      );
    });

    // Show trend information
    if (entries.length >= 2) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      const reduction = first.total - last.total;
      const percentReduction = ((reduction / first.total) * 100).toFixed(1);

      console.log(`\n${colors.bold}${colors.cyan}=== TREND ANALYSIS ===${colors.reset}`);
      console.log(`Starting issues: ${colors.bold}${first.total}${colors.reset}`);
      console.log(`Current issues: ${colors.bold}${last.total}${colors.reset}`);

      const reductionColor = reduction > 0 ? colors.green : colors.red;
      console.log(
        `Issues fixed: ${reductionColor}${reduction} (${percentReduction}%)${colors.reset}`
      );

      // Estimate completion
      if (reduction > 0) {
        const daysElapsed = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
        const fixRate = reduction / Math.max(1, daysElapsed);
        const daysRemaining = Math.ceil(last.total / fixRate);

        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysRemaining);

        console.log(
          `Average fix rate: ${colors.cyan}${fixRate.toFixed(1)}${colors.reset} issues per day`
        );
        console.log(
          `Estimated completion: ${colors.bold}${daysRemaining} days${colors.reset} (around ${colors.green}${completionDate.toLocaleDateString()}${colors.reset})`
        );

        // Show detailed trend analysis if verbose mode is enabled
        if (verboseMode) {
          console.log(
            `\n${colors.bold}${colors.cyan}=== DETAILED TREND ANALYSIS ===${colors.reset}`
          );

          // Calculate error reduction rate
          const errorReduction = first.errors - last.errors;
          const errorPercentReduction = (
            (errorReduction / Math.max(1, first.errors)) *
            100
          ).toFixed(1);
          console.log(
            `Error reduction: ${colors.red}${errorReduction} (${errorPercentReduction}%)${colors.reset}`
          );

          // Calculate warning reduction rate
          const warningReduction = first.warnings - last.warnings;
          const warningPercentReduction = (
            (warningReduction / Math.max(1, first.warnings)) *
            100
          ).toFixed(1);
          console.log(
            `Warning reduction: ${colors.yellow}${warningReduction} (${warningPercentReduction}%)${colors.reset}`
          );

          // Calculate formatting reduction rate if available
          if (first.formatting || last.formatting) {
            const formattingReduction = (first.formatting || 0) - (last.formatting || 0);
            const formattingPercentReduction = (
              (formattingReduction / Math.max(1, first.formatting || 1)) *
              100
            ).toFixed(1);
            console.log(
              `Formatting reduction: ${colors.magenta}${formattingReduction} (${formattingPercentReduction}%)${colors.reset}`
            );
          }

          // Calculate daily rates
          if (daysElapsed > 0) {
            console.log(`\nDaily rates:`);
            console.log(
              `- Errors fixed per day: ${colors.red}${(errorReduction / daysElapsed).toFixed(2)}${colors.reset}`
            );
            console.log(
              `- Warnings fixed per day: ${colors.yellow}${(warningReduction / daysElapsed).toFixed(2)}${colors.reset}`
            );
            console.log(
              `- Total issues fixed per day: ${colors.cyan}${(reduction / daysElapsed).toFixed(2)}${colors.reset}`
            );
          }

          // Show progress over time
          console.log(`\nProgress over time:`);
          for (let i = 1; i < entries.length; i++) {
            const prev = entries[i - 1];
            const curr = entries[i];
            const daysBetween = Math.max(
              1,
              (new Date(curr.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24)
            );
            const issueReduction = prev.total - curr.total;

            const dailyRate = (issueReduction / daysBetween).toFixed(2);
            const rateColor = issueReduction > 0 ? colors.green : colors.red;
            console.log(
              `${prev.date.substring(0, 10)} → ${curr.date.substring(0, 10)}: ${rateColor}${dailyRate}${colors.reset} issues/day`
            );
          }
        }
      }
    }

    // Clear the timeout since we're done
    clearTimeout(timeoutId);
  } catch (error) {
    console.error(`\n${colors.red}Error processing log file:${colors.reset}`, error.message);
    if (error.stack) {
      console.error(`\n${colors.yellow}Stack trace:${colors.reset}\n${error.stack}`);
    }
    if (error.code === 'ENOENT') {
      console.log(`\nNo ${CONFIG.logFile} file found. Run the track command to create it:`);
      console.log(`node tools/track-and-chart.js track`);
    }
    process.exit(1);
  }
}

// Main function to handle commands
async function main() {
  try {
    if (showHelp) {
      displayHelp();
      return;
    }

    switch (command) {
      case 'track':
        await trackProgress();
        break;
      case 'chart':
        await generateChart();
        break;
      case 'help':
        displayHelp();
        break;
      default:
        console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
        displayHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Error executing command:${colors.reset}`, error.message);
    if (error.stack) {
      console.error(`\n${colors.yellow}Stack trace:${colors.reset}\n${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error.message);
  process.exit(1);
});

// Display help message
function displayHelp() {
  console.log(`Usage: node tools/track-and-chart.js <command> [options]`);
  console.log(`\nCommands:`);
  console.log(`  track   - Track progress and generate report`);
  console.log(`  chart   - Generate a chart from the log file`);
  console.log(`  help    - Show this help message`);
}