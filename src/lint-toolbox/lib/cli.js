import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { getCurrentTheme } from './themes.js';

/**
 * Wait for user input with a custom message
 * @param {string} message - Message to display
 */
export async function waitForEnter(message = 'Press Enter to return to the main menu') {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: getCurrentTheme().dimStyle(message),
      prefix: '→'
    }
  ]);
}

/**
 * Center text in a fixed width
 * @param {string} text - Text to center
 * @param {number} width - Width to center within
 * @returns {string} Centered text
 */
export function centerText(text, width = process.stdout.columns) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Pad text to the right in a fixed width
 * @param {string} text - Text to pad
 * @param {number} width - Width to pad to
 * @returns {string} Padded text
 */
export function padRight(text, width = process.stdout.columns) {
  return text + ' '.repeat(Math.max(0, width - text.length));
}

/**
 * Update progress bar
 * @param {number} current - Current progress
 * @param {number} total - Total progress
 * @param {string} message - Message to display
 * @param {number} barLength - Length of progress bar
 */
export function updateProgressBar(current, total, message = '', barLength = 30) {
  const progress = Math.min(1, current / total);
  const filled = Math.floor(barLength * progress);
  const empty = barLength - filled;
  const theme = getCurrentTheme();
  
  const bar = theme.successStyle('█'.repeat(filled)) + 
              theme.dimStyle('░'.repeat(empty));
  
  const percent = (progress * 100).toFixed(1);
  const status = `${current}/${total} (${percent}%)`;
  
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(
    `${message ? message + ' ' : ''}${bar} ${theme.infoStyle(status)}`
  );
  
  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Safely execute a command with proper error handling
 * @param {string} command - Command to execute
 * @param {string} [progressMessage] - Optional progress message
 * @returns {string} Command output
 */
export function safeExec(command, progressMessage = '') {
  try {
    if (progressMessage) {
      process.stdout.write(`${progressMessage}... `);
    }
    
    const output = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (progressMessage) {
      console.log(getCurrentTheme().successStyle('✓'));
    }
    
    return output;
  } catch (error) {
    if (progressMessage) {
      console.log(getCurrentTheme().errorStyle('✗'));
    }
    
    // If the error contains useful information, preserve it
    if (error.stdout || error.stderr) {
      return error.stdout || error.stderr;
    }
    
    throw error;
  }
}

/**
 * Display a spinner while executing an async operation
 * @param {Promise} promise - Promise to wait for
 * @param {string} message - Message to display
 * @returns {Promise} Original promise result
 */
export async function withSpinner(promise, message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const theme = getCurrentTheme();
  
  const spinner = setInterval(() => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(
      `${theme.infoStyle(frames[i++ % frames.length])} ${message}`
    );
  }, 80);
  
  try {
    const result = await promise;
    clearInterval(spinner);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(`${theme.successStyle('✓')} ${message}`);
    return result;
  } catch (error) {
    clearInterval(spinner);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(`${theme.errorStyle('✗')} ${message}`);
    throw error;
  }
}

/**
 * Format a file size in bytes to a human readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a boxed message with optional title
 * @param {string} message - Message to box
 * @param {string} [title] - Optional title
 * @returns {string} Boxed message
 */
export function createBox(message, title = '') {
  const lines = message.split('\n');
  const width = Math.max(
    ...lines.map(line => line.length),
    title.length
  );
  
  const theme = getCurrentTheme();
  const box = [];
  
  // Top border with optional title
  if (title) {
    box.push(`╭─${title}${'─'.repeat(Math.max(0, width - title.length + 2))}╮`);
  } else {
    box.push(`╭${'─'.repeat(width + 2)}╮`);
  }
  
  // Message lines
  lines.forEach(line => {
    box.push(`│ ${line.padEnd(width)} │`);
  });
  
  // Bottom border
  box.push(`╰${'─'.repeat(width + 2)}╯`);
  
  return box.join('\n');
}