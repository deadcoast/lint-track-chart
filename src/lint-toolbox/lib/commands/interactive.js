import inquirer from 'inquirer';
import { getCurrentTheme } from '../themes.js';
import { track } from './track.js';
import { compare } from './compare.js';
import { fix } from './fix.js';
import { chart } from './chart.js';
import { theme } from './theme.js';
import { html } from './html.js';

/**
 * Display header with logo and system info
 */
function displayHeader() {
  console.clear();
  const logo = `
▗▖  ▗▖▄ █ █  ▄ ▗▄▄▖ ▗▞▀▜▌   
▐▛▚▞▜▌▄ █ █▄▀  ▐▌ ▐▌▝▚▄▟▌   
▐▌  ▐▌█ █ █ ▀▄ ▐▛▀▚▖        
▐▌  ▐▌█ █ █  █ ▐▙▄▞▘    ▗▄▖ 
                       ▐▌ ▐▌
                        ▝▀▜▌
                       ▐▙▄▞▘
    `;
  console.log(getCurrentTheme().titleStyle(logo));
  console.log(getCurrentTheme().infoStyle(`System: ${process.platform} | Node: ${process.version}`));
  console.log(getCurrentTheme().successStyle('TypeScript Linting Toolbox - Your complete solution for tracking and improving code quality'));
}

/**
 * Display ASCII menu with border
 */
function displayAsciiMenu() {
  const indent = '          '; // 10 spaces
  const leftColWidth = 8;
  const rightColWidth = 49;
  const theme = getCurrentTheme();

  const topBorder = theme.titleStyle(indent + '┏' + '━'.repeat(leftColWidth) + '┳' + '━'.repeat(rightColWidth) + '┓');
  const headerRow = theme.titleStyle(indent + '┃') + centerText('Option', leftColWidth) + theme.titleStyle('┃') + padRight('Description', rightColWidth) + theme.titleStyle('┃');
  const headerSep = theme.titleStyle(indent + '┡' + '━'.repeat(leftColWidth) + '╇' + '━'.repeat(rightColWidth) + '┩');

  const menuItems = [
    { option: '1', description: 'Run Linting Analysis' },
    { option: '2', description: 'View Progress & Statistics' },
    { option: '3', description: 'Generate HTML Report' },
    { option: '4', description: 'Fix Specific ESLint Rule' },
    { option: '5', description: 'Compare with Previous Version' },
    { option: '6', description: 'Change Theme' },
    { option: '0', description: 'Exit' },
  ];

  let rows = '';
  for (const item of menuItems) {
    rows += theme.titleStyle(indent + '│') + centerText(item.option, leftColWidth) + theme.titleStyle('│') + padRight(item.description, rightColWidth) + theme.titleStyle('│\n');
  }

  const bottomBorder = theme.titleStyle(indent + '└' + '─'.repeat(leftColWidth) + '┴' + '─'.repeat(rightColWidth) + '┘');

  // Print header and menu
  console.log(topBorder);
  console.log(headerRow);
  console.log(headerSep);
  console.log(rows.trimEnd());
  console.log(bottomBorder);
}

/**
 * Center text in a fixed width
 */
function centerText(text, width) {
  const padding = width - text.length;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

/**
 * Pad text to the right in a fixed width
 */
function padRight(text, width) {
  return text + ' '.repeat(Math.max(0, width - text.length));
}

/**
 * Wait for user to press Enter
 */
async function waitForEnter(message = 'Press Enter to return to the main menu') {
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message,
  }]);
}

/**
 * Interactive CLI menu
 */
export const interactive = async (options = {}) => {
  while (true) {
    displayHeader();
    displayAsciiMenu();

    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'Select an option:',
      choices: [
        { name: '1 Run Linting Analysis', value: '1' },
        { name: '2 View Progress & Statistics', value: '2' },
        { name: '3 Generate HTML Report', value: '3' },
        { name: '4 Fix ESLint Rules', value: '4' },
        { name: '5 Compare Versions', value: '5' },
        { name: '6 Customize Theme', value: '6' },
        { name: '7  Settings', value: '7' },
        { name: '8 Help', value: '8' },
        { name: '0 Exit', value: '0' },
      ],
    }]);

    try {
      switch (choice) {
      case '1': {
        const { analysisType } = await inquirer.prompt([{
          type: 'list',
          name: 'analysisType',
          message: 'Select analysis type:',
          choices: [
            { name: 'Full Project Analysis', value: 'full' },
            { name: 'Changed Files Only', value: 'changed' },
            { name: 'Custom Path', value: 'custom' },
          ],
        }]);

        if (analysisType === 'custom') {
          const { customPath } = await inquirer.prompt([{
            type: 'input',
            name: 'customPath',
            message: 'Enter path to analyze:',
            default: '.',
          }]);
          await track({ type: 'custom', path: customPath });
        } else {
          await track({ type: analysisType });
        }
        break;
      }

      case '2': {
        const { viewType } = await inquirer.prompt([{
          type: 'list',
          name: 'viewType',
          message: 'Select view type:',
          choices: [
            { name: 'Advanced Trend Analysis', value: 'trend' },
            { name: 'Current Status', value: 'current' },
            { name: 'Rule Breakdown', value: 'rules' },
          ],
        }]);
        await chart({ type: viewType });
        break;
      }

      case '3': {
        const { reportOptions } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'reportOptions',
          message: 'Select report options:',
          choices: [
            { name: 'Include Trend Analysis', value: 'trend', checked: true },
            { name: 'Include File Breakdown', value: 'files', checked: true },
            { name: 'Include Rule Statistics', value: 'rules', checked: true },
          ],
        }]);
        await html({ options: reportOptions });
        break;
      }

      case '4': {
        const { fixType } = await inquirer.prompt([{
          type: 'list',
          name: 'fixType',
          message: 'Select fix type:',
          choices: [
            { name: 'Auto-fix Safe Rules', value: 'auto' },
            { name: 'Fix Specific Rule', value: 'specific' },
            { name: 'Interactive Fix Mode', value: 'interactive' },
          ],
        }]);

        if (fixType === 'specific') {
          const { ruleName } = await inquirer.prompt([{
            type: 'input',
            name: 'ruleName',
            message: 'Enter rule name to fix:',
          }]);
          await fix({ rule: ruleName });
        } else {
          await fix({ mode: fixType });
        }
        break;
      }

      case '5': {
        const { compareType } = await inquirer.prompt([{
          type: 'list',
          name: 'compareType',
          message: 'Select comparison type:',
          choices: [
            { name: 'Compare with Previous Run', value: 'previous' },
            { name: 'Compare with Git Branch', value: 'branch' },
            { name: 'Compare with Date', value: 'date' },
          ],
        }]);
        await compare({ type: compareType });
        break;
      }

      case '6': {
        await theme({ list: true });
        const availableThemes = ['default', 'dark', 'light', 'colorful'];
        const { themeName } = await inquirer.prompt([{
          type: 'list',
          name: 'themeName',
          message: 'Select theme:',
          choices: availableThemes,
        }]);
        await theme({ set: themeName });
        break;
      }

      case '7': {
        await inquirer.prompt([{
          type: 'list',
          name: 'setting',
          message: 'Select setting to configure:',
          choices: [
            { name: 'Configure ESLint Rules', value: 'eslint' },
            { name: 'Output Format', value: 'output' },
            { name: 'Cache Settings', value: 'cache' },
            { name: 'Git Integration', value: 'git' },
          ],
        }]);
        // TODO: Implement settings configuration
        console.log(getCurrentTheme().infoStyle('Settings configuration will be implemented in the next update.'));
        break;
      }

      case '8': {
        console.log(getCurrentTheme().infoStyle(`
Lint Track Chart - Help
---------------------
1. Run Linting Analysis: Analyze your codebase for linting issues
2. View Progress: Track your code quality improvements over time
3. Generate Report: Create detailed HTML reports of your analysis
4. Fix Rules: Automatically fix linting issues
5. Compare: Compare linting results between versions
6. Theme: Customize the look and feel
7. Settings: Configure tool behavior

For more information, visit: https://github.com/your-repo/lint-track-chart
`));
        break;
      }

      case '0': {
        console.log(getCurrentTheme().successStyle('\nThank you for using Lint Track Chart! Goodbye!\n'));
        process.exit(0);
      }
      }
      await waitForEnter();
    } catch (error) {
      console.error(getCurrentTheme().errorStyle(`\nError: ${error.message}\n`));
      await waitForEnter();
    }
  }
};
