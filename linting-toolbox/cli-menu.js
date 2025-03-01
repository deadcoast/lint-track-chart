#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk').default;

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

// Themes and current theme selection (currently used for future styling)
const themes = {
  default: {
    borderStyle: chalk.bold.magenta,
    titleStyle: chalk.bold.cyan,
    optionStyle: chalk.bold.white,
    highlightStyle: chalk.bold.yellow
  },
  dark: {
    borderStyle: chalk.bold.white,
    titleStyle: chalk.bold.green,
    optionStyle: chalk.bold.white,
    highlightStyle: chalk.bold.red
  },
  light: {
    borderStyle: chalk.bold.black,
    titleStyle: chalk.bold.blue,
    optionStyle: chalk.bold.black,
    highlightStyle: chalk.bold.blue
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

// -----------------------------------------------------------------------------
// Display Functions
// -----------------------------------------------------------------------------

// Display header with logo, system info, and greeting
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
  console.log(chalk.bold.green(logo));
  console.log(chalk.bold.cyan(`System: ${process.platform} | Node: ${process.version}`));
  console.log(chalk.bold.green("Welcome to the CLI Menu, Please see options below...❚"));
}

// This function prints the exact ASCII CLI menu as you provided.
function displayAsciiMenu() {
  const indent = "          "; // 10 spaces
  const leftColWidth = 8;
  const rightColWidth = 49;
  const theme = themes[currentTheme];

  const topBorder = theme.borderStyle(indent + "┏" + "━".repeat(leftColWidth) + "┳" + "━".repeat(rightColWidth) + "┓");
  const headerRow = theme.borderStyle(indent + "┃") + centerText("Option", leftColWidth) + theme.borderStyle("┃") + padRight("Description", rightColWidth) + theme.borderStyle("┃");
  const headerSep = theme.borderStyle(indent + "┡" + "━".repeat(leftColWidth) + "╇" + "━".repeat(rightColWidth) + "┩");

  const menuItems = [
    { option: "1", description: "MENU 1 PLACEHOLDER" },
    { option: "2", description: "MENU 2 PLACEHOLDER" },
    { option: "3", description: "MENU 3 PLACEHOLDER" },
    { option: "0", description: "Exit Milkbag" }
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
// Submenu Simulations
// -----------------------------------------------------------------------------

async function displayCreateVenvScreen() {
  console.clear();
  displayHeader();
  console.log("\n" + " ".repeat(10) + "placeholder");
  console.log(" ".repeat(10) + "placeholder");
  console.log(" ".repeat(10) + "placeholder");
  await waitForEnter();
}

async function displayDirectoryTreeScreen() {
  console.clear();
  displayHeader();
  const tree = [
    "Simulated Directory Tree:",
    ".",
    "├── file1.txt",
    "├── file2.txt",
    "└── subdir",
    "    └── file3.txt"
  ].join("\n");
  console.log("\n" + " ".repeat(10) + tree);
  await waitForEnter();
}

async function displayThemeMenuScreen() {
  console.clear();
  displayHeader();
  // Build a simple ASCII table for theme selection
  const indent = "          ";
  const colWidth = 12;
  const keys = Object.keys(themes);
  
  const topBorder = indent + "┏" + "━".repeat(6) + "┳" + "━".repeat(colWidth) + "┓";
  const headerRow = indent + "┃" + centerText("Index", 6) + "┃" + padRight("Theme Name", colWidth) + "┃";
  const headerSep = indent + "┡" + "━".repeat(6) + "╇" + "━".repeat(colWidth) + "┩";
  
  let rows = "";
  keys.forEach((key, idx) => {
    const row = indent + "│" + centerText((idx + 1).toString(), 6) + "│" + padRight(key.charAt(0).toUpperCase() + key.slice(1), colWidth) + "│";
    rows += row + "\n";
  });
  
  const bottomBorder = indent + "└" + "─".repeat(6) + "┴" + "─".repeat(colWidth) + "┘";
  
  console.log(topBorder);
  console.log(headerRow);
  console.log(headerSep);
  console.log(rows.trimEnd());
  console.log(bottomBorder);
  
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'themeChoice',
      message: 'Enter the number of the theme you want to select:'
    }
  ]);
  const choice = parseInt(answer.themeChoice.trim());
  if (!isNaN(choice) && choice >= 1 && choice <= keys.length) {
    currentTheme = keys[choice - 1];
    console.log(chalk.green.bold(`Theme changed to ${keys[choice - 1].charAt(0).toUpperCase() + keys[choice - 1].slice(1)}.`));
  } else {
    console.log(chalk.red.bold("Invalid choice. Returning to main menu."));
  }
  await waitForEnter();
}

// -----------------------------------------------------------------------------
// Main Loop
// -----------------------------------------------------------------------------

async function main() {
  while (true) {
    console.clear();
    displayHeader();
    displayAsciiMenu();

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Enter your choice:',
        choices: ['1', '2', '3', '0']
      }
    ]);

    if (choice === '1') {
      await displayCreateVenvScreen();
    } else if (choice === '2') {
      await displayDirectoryTreeScreen();
    } else if (choice === '3') {
      await displayThemeMenuScreen();
    } else if (choice === '0') {
      console.log(chalk.red.bold("Exiting Milkbag. Goodbye!"));
      break;
    } else {
      console.log(chalk.red.bold("Invalid option. Please try again."));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

main();
