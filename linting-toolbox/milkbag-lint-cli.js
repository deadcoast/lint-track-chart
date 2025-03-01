#!/usr/bin/env node

// Import dependencies using CommonJS
const inquirer = require('inquirer');
const chalk = require('chalk').default; // For chalk v5 in CommonJS

// Define ASCII characters for single and double lines
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

// Function to create a framed box around text using DOUBLE_LINE
function createFrame(content, width = 60) {
  const tl = DOUBLE_LINE.top_left;
  const tr = DOUBLE_LINE.top_right;
  const bl = DOUBLE_LINE.bottom_left;
  const br = DOUBLE_LINE.bottom_right;
  const h = DOUBLE_LINE.horizontal;
  const v = DOUBLE_LINE.vertical;

  const topBorder = tl + h.repeat(width - 2) + tr;
  const bottomBorder = bl + h.repeat(width - 2) + br;
  let middle = '';
  content.split('\n').forEach(line => {
    const padded = line.padEnd(width - 4, ' ');
    middle += v + '  ' + padded + '  ' + v + '\n';
  });
  return themes[currentTheme].borderStyle(topBorder + '\n' + middle + bottomBorder);
}

// Function to display header (logo, system info, and greeting)
function displayHeader() {
  console.clear();

  // ASCII Logo (feel free to update this as needed)
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
  const greeting = "Welcome to the CLI Menu, Please see options below...❚";
  console.log(chalk.bold.green(greeting));
}

// Function to display the Milkbag main menu
function displayMilkbagMenu() {
  displayHeader();

  const menuContent = [
    "Milkbag Main Menu",
    "",
    "[1] Create .venv and display activation instruction",
    "[2] Display Directory Tree in current directory",
    "[3] Select and change CLI Theme",
    "[0] Exit Milkbag"
  ].join('\n');

  const framedMenu = createFrame(menuContent, 60);
  console.log(framedMenu);
}

// Main interactive loop
async function main() {
  while (true) {
    displayMilkbagMenu();

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Enter your choice:',
        choices: ['1', '2', '3', '0']
      }
    ]);

    console.log(chalk.bold.yellow(`You selected option: ${choice}`));

    if (choice === '0') {
      console.log(chalk.bold.red("Exiting Milkbag. Goodbye!"));
      break;
    }

    // Placeholder for submenu actions
    // Implement the actual functionality for each option here.
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.clear();
  }
}

main();
