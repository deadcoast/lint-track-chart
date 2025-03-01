#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk').default;
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const CONFIG = {
  logFile: path.join(process.cwd(), 'eslint-progress.log'),
  reportDir: path.join(process.cwd(), 'lint-reports'),
  fileGlobs: '"src/**/*.ts" "src/**/*.tsx"',
  checkPrettier: true,
  timeout: 60000, // Default timeout: 60 seconds
  reportFilename: 'lint-report.html',
  jsonFilename: 'lint-data.json',
};

// -----------------------------------------------------------------------------
// ASCII Definitions & Theme Configuration
// -----------------------------------------------------------------------------

// Single and Double line characters (for future use if needed)
const SINGLE_LINE = {
  top_left: "┌",
  top_right: "┐",
  bottom_left: "└",
  bottom_right: "┘",
  horizontal: "─",
  vertical: "│",
  cross: "┼",
};

const DOUBLE_LINE = {
  top_left: "╔",
  top_right: "╗",
  bottom_left: "╚",
  bottom_right: "╝",
  horizontal: "═",
  vertical: "║",
  cross: "╬",
};

// Themes and current theme selection
const themes = {
  default: {
    borderStyle: chalk.bold.magenta,
    titleStyle: chalk.bold.cyan,
    optionStyle: chalk.bold.white,
    highlightStyle: chalk.bold.yellow,
    errorStyle: chalk.bold.red,
    warningStyle: chalk.bold.yellow,
    infoStyle: chalk.bold.blue,
    successStyle: chalk.bold.green
  },
  dark: {
    borderStyle: chalk.bold.white,
    titleStyle: chalk.bold.green,
    optionStyle: chalk.bold.white,
    highlightStyle: chalk.bold.red,
    errorStyle: chalk.bold.red,
    warningStyle: chalk.bold.yellow,
    infoStyle: chalk.bold.cyan,
    successStyle: chalk.bold.green
  },
  light: {
    borderStyle: chalk.bold.black,
    titleStyle: chalk.bold.blue,
    optionStyle: chalk.bold.black,
    highlightStyle: chalk.bold.blue,
    errorStyle: chalk.bold.red,
    warningStyle: chalk.bold.yellow,
    infoStyle: chalk.bold.blue,
    successStyle: chalk.bold.green
  }
};
let currentTheme = "default";

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

// Wait for user input (simulate "Press Enter to continue")
async function waitForEnter(message = 'Press Enter to return to the main menu') {
  await inquirer.prompt([{ type: 'input', name: 'dummy', message }]);
}

// Center text in a fixed width
function centerText(text, width) {
  const len = text.length;
  if (len >= width) return text;
  const leftPadding = Math.floor((width - len) / 2);
  const rightPadding = width - len - leftPadding;
  return " ".repeat(leftPadding) + text + " ".repeat(rightPadding);
}

// Pad text to the right in a fixed width
function padRight(text, width) {
  if (text.length >= width) return text;
  return text + " ".repeat(width - text.length);
}

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

// Safely execute commands
function safeExec(command, progressMessage = 'Processing') {
  console.log(`${progressMessage}...`);

  try {
    // Show a simple spinner while the command is running
    let spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    let spinnerInterval;

    spinnerInterval = setInterval(() => {
      process.stdout.write(`\r${spinnerFrames[frameIndex]} ${progressMessage}...`);
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
    }, 80);

    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    clearInterval(spinnerInterval);
    process.stdout.write(`\r✓ ${progressMessage} ${chalk.green('completed')}    \n`);

    return result;
  } catch (error) {
    // If the command fails but outputs something, return that output
    if (error.stdout) {
      return error.stdout;
    }
    throw error;
  }
}

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(chalk.green(`Created directory: ${dirPath}`));
  }
}

// -----------------------------------------------------------------------------
// Display Functions
// -----------------------------------------------------------------------------

// Display header with logo, system info, and greeting
function displayHeader() {
  console.clear();
  const logo = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█░░░░░░░░▄▄▄█████▄▄▄░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░░░░▄▄████████████████▄▄░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░░▄████████████████████████▄░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░███████████████████████████▀▀░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░█████████████████▀▀░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░░▀█████████▀▀░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░░░░▀▀▀▀░░░░░░░░░░░▄▄▄████▄▄▄░░░░░░░░░░░▄▄▄██▄▄▄▄░░░░░░▄▄░░█
█░░░░░░░░░░░░░░░░░▄██████████████▄▄▄▄▄▄████████████▄▄███▀░░░█
█░░░░░░░░░░░░░░░░████████████████████████████████████▀░░░░░░█
█░░░░░░░░░░░░░░░░████████████████████████████████▀▀░░░░░░░░░█
█░░░░░░░░░░░░░░░░▀██████████████████████████▀▀░░░░░░░░░░░░░░█
█░░░░░░░░░░░░░░░░░░▀▀▀██████████████▀▀▀░░░░░░░░░░░░░░░░░░░░░█
█░░░░░░░░░░░░░░░░░░░░░░░░▀▀▀▀▀▀▀░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
`;
  console.log(chalk.bold.blue(logo));
  console.log(chalk.bold.cyan(`System: ${process.platform} | Node: ${process.version}`));
  console.log(chalk.bold.green("TypeScript Linting Toolbox - Your complete solution for tracking and improving code quality"));
}

// This function displays the ASCII CLI menu
function displayAsciiMenu() {
  const indent = "          "; // 10 spaces
  const leftColWidth = 8;
  const rightColWidth = 49;
  const theme = themes[currentTheme];

  const topBorder = theme.borderStyle(indent + "┏" + "━".repeat(leftColWidth) + "┳" + "━".repeat(rightColWidth) + "┓");
  const headerRow = theme.borderStyle(indent + "┃") + centerText("Option", leftColWidth) + theme.borderStyle("┃") + padRight("Description", rightColWidth) + theme.borderStyle("┃");
  const headerSep = theme.borderStyle(indent + "┡" + "━".repeat(leftColWidth) + "╇" + "━".repeat(rightColWidth) + "┩");

  const menuItems = [
    { option: "1", description: "Run Linting Analysis" },
    { option: "2", description: "View Progress & Statistics" },
    { option: "3", description: "Generate HTML Report" },
    { option: "4", description: "Fix Specific ESLint Rule" },
    { option: "5", description: "Compare with Previous Version" },
    { option: "6", description: "Change Theme" },
    { option: "0", description: "Exit" }
  ];

  let rows = "";
  for (const item of menuItems) {
    rows += theme.borderStyle(indent + "│") + centerText(item.option, leftColWidth) + theme.borderStyle("│") + padRight(item.description, rightColWidth) + theme.borderStyle("│\n");
  }

  const bottomBorder = theme.borderStyle(indent + "└" + "─".repeat(leftColWidth) + "┴" + "─".repeat(rightColWidth) + "┘");

  // Print header and menu
  console.log(topBorder);
  console.log(headerRow);
  console.log(headerSep);
  console.log(rows.trimEnd());
  console.log(bottomBorder);
}

// -----------------------------------------------------------------------------
// Core Linting Functions
// -----------------------------------------------------------------------------

// Track current linting status
async function trackLintingProgress() {
  console.clear();
  displayHeader();
  console.log("\n" + themes[currentTheme].titleStyle("✓ Running Linting Analysis"));

  try {
    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.error(
        `\n\n${themes[currentTheme].errorStyle("Script execution timed out after " + CONFIG.timeout / 1000 + " seconds")}`
      );
      console.error('This may indicate an issue with ESLint or Prettier processing');
      return;
    }, CONFIG.timeout);

    // Get current date
    const date = new Date().toISOString().split('T')[0];
    const dateEntry = `===== ${date} =====`;

    // Ensure the log file exists
    ensureDirectoryExists(path.dirname(CONFIG.logFile));
    if (!fs.existsSync(CONFIG.logFile)) {
      fs.writeFileSync(CONFIG.logFile, '', 'utf8');
      console.log(themes[currentTheme].successStyle(`Created new log file: ${CONFIG.logFile}`));
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
        themes[currentTheme].successStyle(`Successfully parsed results for ${eslintData.length} files`)
      );
    } catch (error) {
      console.warn(
        themes[currentTheme].warningStyle("Warning: Could not parse ESLint output as JSON. ESLint may not be properly configured.")
      );
      console.warn(`Error details: ${error.message}`);
      console.warn('Proceeding with zero ESLint issues...');
    }

    // Count errors and warnings with progress bar
    const issuesByRule = {};
    const issuesByFile = {};
    const issuesByDirectory = {};

    if (eslintData.length > 0) {
      console.log('Analyzing ESLint issues:');

      eslintData.forEach((file, index) => {
        updateProgressBar(
          index + 1,
          eslintData.length,
          `Analyzing file ${index + 1}/${eslintData.length}`
        );

        // Extract directory information from file path
        const relativePath = path.relative(process.cwd(), file.filePath);
        const directory = path.dirname(relativePath);
        
        if (!issuesByDirectory[directory]) {
          issuesByDirectory[directory] = { errors: 0, warnings: 0, total: 0 };
        }

        if (file.messages && file.messages.length > 0) {
          // Track issues by file
          issuesByFile[file.filePath] = {
            errors: file.messages.filter(msg => msg.severity === 2).length,
            warnings: file.messages.filter(msg => msg.severity === 1).length,
            total: file.messages.length
          };
          
          // Update directory stats
          issuesByDirectory[directory].errors += issuesByFile[file.filePath].errors;
          issuesByDirectory[directory].warnings += issuesByFile[file.filePath].warnings;
          issuesByDirectory[directory].total += issuesByFile[file.filePath].total;

          file.messages.forEach(msg => {
            if (msg.severity === 2) {
              eslintErrors++;
            } else if (msg.severity === 1) {
              eslintWarnings++;
            }

            // Track issues by rule
            const ruleId = msg.ruleId || 'unknown';
            if (!issuesByRule[ruleId]) {
              issuesByRule[ruleId] = { count: 0, errors: 0, warnings: 0 };
            }
            issuesByRule[ruleId].count++;
            if (msg.severity === 2) {
              issuesByRule[ruleId].errors++;
            } else if (msg.severity === 1) {
              issuesByRule[ruleId].warnings++;
            }
          });
        }
      });
    }

    // Check Prettier formatting issues if enabled
    if (CONFIG.checkPrettier) {
      try {
        const prettierCmd = `npx prettier --check ${CONFIG.fileGlobs} | wc -l`;
        const prettierOutput = safeExec(prettierCmd, 'Running Prettier check').trim();

        // Parse Prettier output - this is an approximation as Prettier doesn't have a strict format
        const prettierCount = parseInt(prettierOutput, 10);
        if (!isNaN(prettierCount) && prettierCount > 0) {
          // Usually Prettier prints a header line, so we subtract 1
          prettierIssues = Math.max(0, prettierCount - 1);
          console.log(
            themes[currentTheme].infoStyle(`Found ${prettierIssues} Prettier formatting issues`)
          );
        } else {
          console.log(themes[currentTheme].successStyle(`No Prettier formatting issues found`));
        }
      } catch (error) {
        console.warn(
          themes[currentTheme].warningStyle("Warning: Could not run Prettier check. Prettier may not be installed.")
        );
        console.warn(`Error details: ${error.message}`);
        console.warn('Proceeding with zero Prettier issues...');
      }
    }

    // Calculate totals
    totalIssues = eslintErrors + eslintWarnings + prettierIssues;

    // Format the progress entry for the log file
    const progressEntry = `${totalIssues} problems (${eslintErrors} errors, ${eslintWarnings} warnings${CONFIG.checkPrettier ? `, ${prettierIssues} formatting` : ''})`;

    logContent += `${progressEntry}\n`;

    // Add details about top issues
    const sortedIssues = Object.entries(issuesByRule)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    
    if (sortedIssues.length > 0) {
      logContent += '\nTop issues by rule:\n';
      sortedIssues.forEach(([rule, data]) => {
        logContent += `- ${rule}: ${data.count} occurrences (${data.errors} errors, ${data.warnings} warnings)\n`;
      });

      // Add a suggestion for fixing the top issue
      const [topRule, topData] = sortedIssues[0];
      if (topRule && topRule !== 'unknown') {
        logContent += `\nSuggestion: Focus on fixing "${topRule}" issues (${topData.count} occurrences)\n`;

        if (topRule.startsWith('prettier/') || topRule === 'prettier') {
          logContent += `Try running: npx prettier --write ${CONFIG.fileGlobs}\n`;
        } else {
          logContent += `Try running: npx eslint --fix . --rule "${topRule}: error"\n`;
        }
      }
    }

    logContent += '\n';

    // Write to log file
    fs.appendFileSync(CONFIG.logFile, logContent, 'utf8');
    console.log(`\n${themes[currentTheme].successStyle(`Progress entry added to ${CONFIG.logFile}`)}`);

    // Store detailed data for reports
    const lintData = {
      date,
      summary: {
        total: totalIssues,
        errors: eslintErrors,
        warnings: eslintWarnings,
        formatting: prettierIssues
      },
      issuesByRule: Object.entries(issuesByRule)
        .map(([rule, data]) => ({ 
          rule, 
          count: data.count, 
          errors: data.errors, 
          warnings: data.warnings 
        }))
        .sort((a, b) => b.count - a.count),
      issuesByDirectory: Object.entries(issuesByDirectory)
        .map(([dir, data]) => ({ 
          directory: dir, 
          errors: data.errors, 
          warnings: data.warnings, 
          total: data.total 
        }))
        .sort((a, b) => b.total - a.total),
      worstFiles: Object.entries(issuesByFile)
        .map(([file, data]) => ({
          file: path.relative(process.cwd(), file),
          errors: data.errors,
          warnings: data.warnings,
          total: data.total
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)
    };

    // Ensure reports directory exists
    ensureDirectoryExists(CONFIG.reportDir);
    
    // Save data for reports
    fs.writeFileSync(
      path.join(CONFIG.reportDir, CONFIG.jsonFilename),
      JSON.stringify(lintData, null, 2),
      'utf8'
    );

    // Display summary
    console.log(`\n${themes[currentTheme].titleStyle("Summary:")}`);
    console.log(`${themes[currentTheme].errorStyle(`ESLint errors: ${eslintErrors}`)}`);
    console.log(`${themes[currentTheme].warningStyle(`ESLint warnings: ${eslintWarnings}`)}`);
    if (CONFIG.checkPrettier) {
      console.log(`${themes[currentTheme].infoStyle(`Prettier issues: ${prettierIssues}`)}`);
    }
    console.log(`${themes[currentTheme].titleStyle(`Total issues: ${totalIssues}`)}`);

    // Display top issues
    if (sortedIssues.length > 0) {
      console.log(`\n${themes[currentTheme].titleStyle("Top Issues by Rule:")}`);
      sortedIssues.slice(0, 5).forEach(([rule, data], index) => {
        console.log(`${index + 1}. ${rule}: ${data.count} occurrences (${data.errors} errors, ${data.warnings} warnings)`);
      });
    }

    // Display worst directories
    const worstDirectories = Object.entries(issuesByDirectory)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    
    if (worstDirectories.length > 0) {
      console.log(`\n${themes[currentTheme].titleStyle("Worst Directories:")}`);
      worstDirectories.forEach(([dir, data], index) => {
        console.log(`${index + 1}. ${dir}: ${data.total} issues (${data.errors} errors, ${data.warnings} warnings)`);
      });
    }

    // Clear the timeout since we're done
    clearTimeout(timeoutId);
  } catch (error) {
    console.error(`\n${themes[currentTheme].errorStyle("Error tracking ESLint progress:")}`, error.message);
    if (error.stack) {
      console.error(`\n${themes[currentTheme].warningStyle("Stack trace:")}\n${error.stack}`);
    }
  }

  await waitForEnter();
}

// Generate HTML report
async function generateHtmlReport() {
  console.clear();
  displayHeader();
  console.log("\n" + themes[currentTheme].titleStyle("✓ Generating HTML Report"));
  
  try {
    // Check if JSON data exists
    const jsonPath = path.join(CONFIG.reportDir, CONFIG.jsonFilename);
    if (!fs.existsSync(jsonPath)) {
      console.log(`${themes[currentTheme].warningStyle('No data available. Please run linting analysis first.')}`);
      await waitForEnter();
      return;
    }
    
    // Read the JSON data
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Create the HTML report
    const htmlPath = path.join(CONFIG.reportDir, CONFIG.reportFilename);
    const chartJsScript = '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';
    
    // Get historical data from log file
    const logContent = fs.readFileSync(CONFIG.logFile, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    
    const historyEntries = [];
    let currentDate = '';
    
    logLines.forEach(line => {
      if (line.startsWith('===== ')) {
        currentDate = line.replace(/=+/g, '').trim();
      } else if (line.includes('problems')) {
        const match = line.match(
          /(\d+) problems? \((\d+) errors?, (\d+) warnings?(?:, (\d+) formatting)?\)/
        );
        if (match) {
          historyEntries.push({
            date: currentDate,
            total: parseInt(match[1], 10),
            errors: parseInt(match[2], 10),
            warnings: parseInt(match[3], 10),
            formatting: match[4] ? parseInt(match[4], 10) : 0,
          });
        }
      }
    });
    
    // Create HTML content
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TypeScript Linting Report</title>
  ${chartJsScript}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .header {
      background-color: #34495e;
      color: white;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .summary-box {
      background-color: #f8f9fa;
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .chart-container {
      width: 100%;
      margin-bottom: 30px;
      height: 400px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background-color: #f8f9fa;
      border-radius: 5px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .error {
      color: #e74c3c;
      font-weight: bold;
    }
    .warning {
      color: #f39c12;
      font-weight: bold;
    }
    .info {
      color: #3498db;
      font-weight: bold;
    }
    .success {
      color: #2ecc71;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
    .progress-bar {
      background-color: #ecf0f1;
      border-radius: 3px;
      height: 20px;
      position: relative;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background-color: #3498db;
    }
    .filter-controls {
      margin-bottom: 20px;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    .filter-controls select, .filter-controls input {
      padding: 8px;
      margin-right: 10px;
      border-radius: 3px;
      border: 1px solid #ddd;
    }
    .tab-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .tab-button {
      padding: 10px 20px;
      background-color: #f2f2f2;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    .tab-button.active {
      background-color: #3498db;
      color: white;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>TypeScript Linting Report</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary-box">
    <h2>Summary</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <h3>Total Issues</h3>
        <p style="font-size: 2rem;">${jsonData.summary.total}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: 100%"></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Errors</h3>
        <p class="error" style="font-size: 2rem;">${jsonData.summary.errors}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${jsonData.summary.errors / jsonData.summary.total * 100}%; background-color: #e74c3c;"></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Warnings</h3>
        <p class="warning" style="font-size: 2rem;">${jsonData.summary.warnings}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${jsonData.summary.warnings / jsonData.summary.total * 100}%; background-color: #f39c12;"></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Formatting Issues</h3>
        <p class="info" style="font-size: 2rem;">${jsonData.summary.formatting}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${jsonData.summary.formatting / jsonData.summary.total * 100}%; background-color: #3498db;"></div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="tab-buttons">
    <button class="tab-button active" onclick="showTab('trend-tab')">Trends</button>
    <button class="tab-button" onclick="showTab('rules-tab')">Rules</button>
    <button class="tab-button" onclick="showTab('files-tab')">Files</button>
    <button class="tab-button" onclick="showTab('directories-tab')">Directories</button>
  </div>
  
  <!-- Trend Tab -->
  <div id="trend-tab" class="tab-content active">
    <h2>Trend Analysis</h2>
    <div class="chart-container">
      <canvas id="trendChart"></canvas>
    </div>
    
    <div class="summary-box">
      <h3>Progress Statistics</h3>
      ${historyEntries.length >= 2 ? `
        <p>Starting with <strong>${historyEntries[0].total}</strong> issues on ${historyEntries[0].date}</p>
        <p>Currently at <strong>${historyEntries[historyEntries.length-1].total}</strong> issues on ${historyEntries[historyEntries.length-1].date}</p>
        <p class="${historyEntries[0].total - historyEntries[historyEntries.length-1].total > 0 ? 'success' : 'error'}">
          ${historyEntries[0].total - historyEntries[historyEntries.length-1].total > 0 ? 'Reduced by' : 'Increased by'} 
          <strong>${Math.abs(historyEntries[0].total - historyEntries[historyEntries.length-1].total)}</strong> issues
          (${(Math.abs(historyEntries[0].total - historyEntries[historyEntries.length-1].total) / historyEntries[0].total * 100).toFixed(1)}%)
        </p>
      ` : '<p>Not enough data to show trend analysis</p>'}
    </div>
  </div>
  
  <!-- Rules Tab -->
  <div id="rules-tab" class="tab-content">
    <h2>Issues by Rule</h2>
    
    <div class="filter-controls">
      <input type="text" id="ruleSearch" placeholder="Search rules..." onkeyup="filterRules()">
      <select id="ruleSortBy" onchange="sortRules()">
        <option value="count">Sort by Count</option>
        <option value="errors">Sort by Errors</option>
        <option value="warnings">Sort by Warnings</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>
    
    <div class="chart-container">
      <canvas id="rulesChart"></canvas>
    </div>
    
    <table id="rulesTable">
      <thead>
        <tr>
          <th>Rule</th>
          <th>Total</th>
          <th>Errors</th>
          <th>Warnings</th>
        </tr>
      </thead>
      <tbody>
        ${jsonData.issuesByRule.map((rule, index) => `
          <tr>
            <td>${rule.rule}</td>
            <td>${rule.count}</td>
            <td class="${rule.errors > 0 ? 'error' : ''}">${rule.errors}</td>
            <td class="${rule.warnings > 0 ? 'warning' : ''}">${rule.warnings}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Files Tab -->
  <div id="files-tab" class="tab-content">
    <h2>Issues by File</h2>
    
    <div class="filter-controls">
      <input type="text" id="fileSearch" placeholder="Search files..." onkeyup="filterFiles()">
      <select id="fileSortBy" onchange="sortFiles()">
        <option value="total">Sort by Total Issues</option>
        <option value="errors">Sort by Errors</option>
        <option value="warnings">Sort by Warnings</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>
    
    <div class="chart-container">
      <canvas id="filesChart"></canvas>
    </div>
    
    <table id="filesTable">
      <thead>
        <tr>
          <th>File</th>
          <th>Total</th>
          <th>Errors</th>
          <th>Warnings</th>
        </tr>
      </thead>
      <tbody>
        ${jsonData.worstFiles.map((file, index) => `
          <tr>
            <td>${file.file}</td>
            <td>${file.total}</td>
            <td class="${file.errors > 0 ? 'error' : ''}">${file.errors}</td>
            <td class="${file.warnings > 0 ? 'warning' : ''}">${file.warnings}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Directories Tab -->
  <div id="directories-tab" class="tab-content">
    <h2>Issues by Directory</h2>
    
    <div class="filter-controls">
      <input type="text" id="dirSearch" placeholder="Search directories..." onkeyup="filterDirectories()">
      <select id="dirSortBy" onchange="sortDirectories()">
        <option value="total">Sort by Total Issues</option>
        <option value="errors">Sort by Errors</option>
        <option value="warnings">Sort by Warnings</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>
    
    <div class="chart-container">
      <canvas id="directoriesChart"></canvas>
    </div>
    
    <table id="directoriesTable">
      <thead>
        <tr>
          <th>Directory</th>
          <th>Total</th>
          <th>Errors</th>
          <th>Warnings</th>
        </tr>
      </thead>
      <tbody>
        ${jsonData.issuesByDirectory.map((dir, index) => `
          <tr>
            <td>${dir.directory}</td>
            <td>${dir.total}</td>
            <td class="${dir.errors > 0 ? 'error' : ''}">${dir.errors}</td>
            <td class="${dir.warnings > 0 ? 'warning' : ''}">${dir.warnings}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <script>
    // Tab switching functionality
    function showTab(tabId) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
      });
      
      // Show the selected tab
      document.getElementById(tabId).classList.add('active');
      document.querySelector(\`button[onclick="showTab('\${tabId}')"]\`).classList.add('active');
    }
    
    // Filter functions
    function filterRules() {
      const input = document.getElementById('ruleSearch').value.toLowerCase();
      const table = document.getElementById('rulesTable');
      const rows = table.getElementsByTagName('tr');
      
      for (let i = 1; i < rows.length; i++) {
        const ruleName = rows[i].getElementsByTagName('td')[0].textContent.toLowerCase();
        rows[i].style.display = ruleName.includes(input) ? '' : 'none';
      }
    }
    
    function filterFiles() {
      const input = document.getElementById('fileSearch').value.toLowerCase();
      const table = document.getElementById('filesTable');
      const rows = table.getElementsByTagName('tr');
      
      for (let i = 1; i < rows.length; i++) {
        const fileName = rows[i].getElementsByTagName('td')[0].textContent.toLowerCase();
        rows[i].style.display = fileName.includes(input) ? '' : 'none';
      }
    }
    
    function filterDirectories() {
      const input = document.getElementById('dirSearch').value.toLowerCase();
      const table = document.getElementById('directoriesTable');
      const rows = table.getElementsByTagName('tr');
      
      for (let i = 1; i < rows.length; i++) {
        const dirName = rows[i].getElementsByTagName('td')[0].textContent.toLowerCase();
        rows[i].style.display = dirName.includes(input) ? '' : 'none';
      }
    }
    
    // Sort functions
    function sortRules() {
      const sortBy = document.getElementById('ruleSortBy').value;
      const table = document.getElementById('rulesTable');
      const rows = Array.from(table.getElementsByTagName('tr')).slice(1);
      const headerRow = table.rows[0];
      
      rows.sort((a, b) => {
        let aValue, bValue;
        switch(sortBy) {
          case 'count':
            aValue = parseInt(a.cells[1].textContent);
            bValue = parseInt(b.cells[1].textContent);
            return bValue - aValue;
          case 'errors':
            aValue = parseInt(a.cells[2].textContent);
            bValue = parseInt(b.cells[2].textContent);
            return bValue - aValue;
          case 'warnings':
            aValue = parseInt(a.cells[3].textContent);
            bValue = parseInt(b.cells[3].textContent);
            return bValue - aValue;
          case 'name':
            aValue = a.cells[0].textContent;
            bValue = b.cells[0].textContent;
            return aValue.localeCompare(bValue);
        }
      });
      
      // Clear the table and re-add the rows in the sorted order
      while (table.rows.length > 1) {
        table.deleteRow(1);
      }
      
      rows.forEach(row => {
        table.appendChild(row);
      });
    }
    
    function sortFiles() {
      const sortBy = document.getElementById('fileSortBy').value;
      const table = document.getElementById('filesTable');
      const rows = Array.from(table.getElementsByTagName('tr')).slice(1);
      
      rows.sort((a, b) => {
        let aValue, bValue;
        switch(sortBy) {
          case 'total':
            aValue = parseInt(a.cells[1].textContent);
            bValue = parseInt(b.cells[1].textContent);
            return bValue - aValue;
          case 'errors':
            aValue = parseInt(a.cells[2].textContent);
            bValue = parseInt(b.cells[2].textContent);
            return bValue - aValue;
          case 'warnings':
            aValue = parseInt(a.cells[3].textContent);
            bValue = parseInt(b.cells[3].textContent);
            return bValue - aValue;
          case 'name':
            aValue = a.cells[0].textContent;
            bValue = b.cells[0].textContent;
            return aValue.localeCompare(bValue);
        }
      });
      
      while (table.rows.length > 1) {
        table.deleteRow(1);
      }
      
      rows.forEach(row => {
        table.appendChild(row);
      });
    }
    
    function sortDirectories() {
      const sortBy = document.getElementById('dirSortBy').value;
      const table = document.getElementById('directoriesTable');
      const rows = Array.from(table.getElementsByTagName('tr')).slice(1);
      
      rows.sort((a, b) => {
        let aValue, bValue;
        switch(sortBy) {
          case 'total':
            aValue = parseInt(a.cells[1].textContent);
            bValue = parseInt(b.cells[1].textContent);
            return bValue - aValue;
          case 'errors':
            aValue = parseInt(a.cells[2].textContent);
            bValue = parseInt(b.cells[2].textContent);
            return bValue - aValue;
          case 'warnings':
            aValue = parseInt(a.cells[3].textContent);
            bValue = parseInt(b.cells[3].textContent);
            return bValue - aValue;
          case 'name':
            aValue = a.cells[0].textContent;
            bValue = b.cells[0].textContent;
            return aValue.localeCompare(bValue);
        }
      });
      
      while (table.rows.length > 1) {
        table.deleteRow(1);
      }
      
      rows.forEach(row => {
        table.appendChild(row);
      });
    }
    
    // Charts initialization
    window.onload = function() {
      // Trend chart
      const trendCtx = document.getElementById('trendChart').getContext('2d');
      const trendData = ${JSON.stringify(historyEntries.map(entry => ({
        date: entry.date,
        total: entry.total,
        errors: entry.errors,
        warnings: entry.warnings,
        formatting: entry.formatting || 0
      })))};
      
      new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: trendData.map(entry => entry.date),
          datasets: [
            {
              label: 'Total Issues',
              data: trendData.map(entry => entry.total),
              borderColor: '#2c3e50',
              backgroundColor: 'rgba(44, 62, 80, 0.1)',
              tension: 0.1,
              fill: true
            },
            {
              label: 'Errors',
              data: trendData.map(entry => entry.errors),
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              tension: 0.1
            },
            {
              label: 'Warnings',
              data: trendData.map(entry => entry.warnings),
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              tension: 0.1
            },
            {
              label: 'Formatting',
              data: trendData.map(entry => entry.formatting),
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Issues'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          }
        }
      });
      
      // Rules chart
      const rulesCtx = document.getElementById('rulesChart').getContext('2d');
      const rulesData = ${JSON.stringify(jsonData.issuesByRule.slice(0, 10))};
      
      new Chart(rulesCtx, {
        type: 'bar',
        data: {
          labels: rulesData.map(rule => rule.rule),
          datasets: [
            {
              label: 'Errors',
              data: rulesData.map(rule => rule.errors),
              backgroundColor: 'rgba(231, 76, 60, 0.7)',
            },
            {
              label: 'Warnings',
              data: rulesData.map(rule => rule.warnings),
              backgroundColor: 'rgba(243, 156, 18, 0.7)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Issues'
              }
            }
          }
        }
      });
      
      // Files chart
      const filesCtx = document.getElementById('filesChart').getContext('2d');
      const filesData = ${JSON.stringify(jsonData.worstFiles.slice(0, 10))};
      
      new Chart(filesCtx, {
        type: 'bar',
        data: {
          labels: filesData.map(file => file.file),
          datasets: [
            {
              label: 'Errors',
              data: filesData.map(file => file.errors),
              backgroundColor: 'rgba(231, 76, 60, 0.7)',
            },
            {
              label: 'Warnings',
              data: filesData.map(file => file.warnings),
              backgroundColor: 'rgba(243, 156, 18, 0.7)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Issues'
              }
            }
          }
        }
      });
      
      // Directories chart
      const dirCtx = document.getElementById('directoriesChart').getContext('2d');
      const dirData = ${JSON.stringify(jsonData.issuesByDirectory.slice(0, 10))};
      
      new Chart(dirCtx, {
        type: 'bar',
        data: {
          labels: dirData.map(dir => dir.directory),
          datasets: [
            {
              label: 'Errors',
              data: dirData.map(dir => dir.errors),
              backgroundColor: 'rgba(231, 76, 60, 0.7)',
            },
            {
              label: 'Warnings',
              data: dirData.map(dir => dir.warnings),
              backgroundColor: 'rgba(243, 156, 18, 0.7)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Issues'
              }
            }
          }
        }
      });
    };
  </script>
</body>
</html>
    `;
    
    // Write HTML report
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    
    console.log(`${themes[currentTheme].successStyle(`HTML report generated at: ${htmlPath}`)}`);
    console.log(`Open this file in your browser to view interactive charts and statistics.`);
    
  } catch (error) {
    console.error(`\n${themes[currentTheme].errorStyle("Error generating HTML report:")}`, error.message);
  }
  
  await waitForEnter();
}

// Fix specific ESLint rule
async function fixEslintRule() {
  console.clear();
  displayHeader();
  console.log("\n" + themes[currentTheme].titleStyle("✓ Fix Specific ESLint Rule"));
  await waitForEnter();
}

// Generate and display progress chart
async function viewProgressChart() {
  console.clear();
  displayHeader();
  console.log("\n" + themes[currentTheme].titleStyle("✓ Viewing Progress & Statistics"));

  try {
    // Check if log file exists
    if (!fs.existsSync(CONFIG.logFile)) {
      console.log(`${themes[currentTheme].warningStyle(`No ${CONFIG.logFile} file found.`)}`);
      console.log(`\nRun the linting analysis first to create it.`);
      await waitForEnter();
      return;
    }

    // Read the log file
    const logContent = fs.readFileSync(CONFIG.logFile, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());

    console.log(`Read ${logLines.length} lines from log file`);

    // Parse the log entries
    const entries = [];
    let currentDate = '';

    console.log('Parsing log entries...');
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
      console.log(`\n${themes[currentTheme].warningStyle(`No data entries found in ${CONFIG.logFile}`)}`);
      console.log('Make sure the file contains entries in the correct format:');
      console.log('===== DATE =====');
      console.log('X problems (Y errors, Z warnings)');
      await waitForEnter();
      return;
    }

    // Find the maximum number of issues to scale the chart
    const maxIssues = Math.max(...entries.map(e => e.total));
    const scale = 40; // Maximum width of chart

    console.log(
      `\n${themes[currentTheme].titleStyle("=== ESLINT/PRETTIER LINTING PROGRESS CHART ===")}`
    );
    console.log(`${themes[currentTheme].optionStyle("Date       | Errors | Warnings | Format | Progress")}`);
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
      let progressStyle = themes[currentTheme].errorStyle;
      if (progress >= 75) {
        progressStyle = themes[currentTheme].successStyle;
      } else if (progress >= 50) {
        progressStyle = themes[currentTheme].infoStyle;
      } else if (progress >= 25) {
        progressStyle = themes[currentTheme].warningStyle;
      }

      console.log(
        `${dateStr} | ${themes[currentTheme].errorStyle(errorsStr)} | ${themes[currentTheme].warningStyle(warningsStr)} | ${themes[currentTheme].infoStyle(formattingStr)} | ${progressStyle(`${bar} ${progress}%`)}`
      );
    });

    // Show trend information
    if (entries.length >= 2) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      const reduction = first.total - last.total;
      const percentReduction = ((reduction / first.total) * 100).toFixed(1);

      console.log(`\n${themes[currentTheme].titleStyle("=== TREND ANALYSIS ===")}`);
      console.log(`Starting issues: ${themes[currentTheme].optionStyle(`${first.total}`)}`);
      console.log(`Current issues: ${themes[currentTheme].optionStyle(`${last.total}`)}`);

      const reductionStyle = reduction > 0 ? themes[currentTheme].successStyle : themes[currentTheme].errorStyle;
      console.log(
        `Issues fixed: ${reductionStyle(`${reduction} (${percentReduction}%)`)}`
      );

      // Estimate completion
      if (reduction > 0) {
        const daysElapsed = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
        const fixRate = reduction / Math.max(1, daysElapsed);
        const daysRemaining = Math.ceil(last.total / fixRate);

        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysRemaining);

        console.log(
          `Average fix rate: ${themes[currentTheme].infoStyle(`${fixRate.toFixed(1)} issues per day`)}`
        );
        console.log(
          `Estimated completion: ${themes[currentTheme].optionStyle(`${daysRemaining} days`)} (around ${themes[currentTheme].successStyle(`${completionDate.toLocaleDateString()}`)})`
        );

        // Show additional stats
        console.log(`\n${themes[currentTheme].titleStyle("=== DETAILED ANALYSIS ===")}`);

        // Error reduction
        const errorReduction = first.errors - last.errors;
        const errorPercentReduction = (
          (errorReduction / Math.max(1, first.errors)) *
          100
        ).toFixed(1);
        console.log(
          `Error reduction: ${themes[currentTheme].errorStyle(`${errorReduction} (${errorPercentReduction}%)`)}`
        );

        // Warning reduction
        const warningReduction = first.warnings - last.warnings;
        const warningPercentReduction = (
          (warningReduction / Math.max(1, first.warnings)) *
          100
        ).toFixed(1);
        console.log(
          `Warning reduction: ${themes[currentTheme].warningStyle(`${warningReduction} (${warningPercentReduction}%)`)}`
        );

        // Formatting reduction if available
        if (first.formatting || last.formatting) {
          const formattingReduction = (first.formatting || 0) - (last.formatting || 0);
          const formattingPercentReduction = (
            (formattingReduction / Math.max(1, first.formatting || 1)) *
            100
          ).toFixed(1);
          console.log(
            `Formatting reduction: ${themes[currentTheme].infoStyle(`${formattingReduction} (${formattingPercentReduction}%)`)}`
          );
        }
      }
    }

    // Check if detailed data is available
    const jsonPath = path.join(CONFIG.reportDir, CONFIG.jsonFilename);
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        // Display file statistics
        if (jsonData.worstFiles && jsonData.worstFiles.length > 0) {
          console.log(`\n${themes[currentTheme].titleStyle("=== FILES WITH MOST ISSUES ===")}`);
          jsonData.worstFiles.slice(0, 5).forEach((file, index) => {
            console.log(`${index + 1}. ${file.file}: ${themes[currentTheme].errorStyle(file.errors.toString())} errors, ${themes[currentTheme].warningStyle(file.warnings.toString())} warnings`);
          });
        }
        
        // Display directory statistics
        if (jsonData.issuesByDirectory && jsonData.issuesByDirectory.length > 0) {
          console.log(`\n${themes[currentTheme].titleStyle("=== DIRECTORY BREAKDOWN ===")}`);
          const topDirs = jsonData.issuesByDirectory.slice(0, 5);
          
          // Find max issues for bar scaling
          const maxDirIssues = Math.max(...topDirs.map(d => d.total));
          const barScale = 20; // Scale for the bar chart
          
          topDirs.forEach((dir, index) => {
            const barLength = Math.floor((dir.total / maxDirIssues) * barScale);
            const bar = '█'.repeat(barLength);
            console.log(`${index + 1}. ${dir.directory.padEnd(30)}: ${bar} ${dir.total} (${dir.errors} errors, ${dir.warnings} warnings)`);
          });
        }
      } catch (error) {
        console.log(`${themes[currentTheme].warningStyle('Could not load detailed statistics')}`);
      }
    }
  } catch (error) {
    console.log(`${themes[currentTheme].errorStyle('Error: ')}` + error);
  }
}