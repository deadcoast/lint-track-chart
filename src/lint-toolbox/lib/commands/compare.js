import fs from 'fs';
import path from 'path';
import { getCurrentTheme } from '../themes.js';
import { waitForEnter, updateProgressBar } from '../cli.js';
import config from '../../config/default.js';

/**
 * Compare linting results between different versions
 */
export const compare = async (options) => {
  console.clear();
  console.log('\n' + getCurrentTheme().titleStyle('✓ Comparing Linting Versions'));

  try {
    // Check if log file exists
    if (!fs.existsSync(config.logFile)) {
      console.log(getCurrentTheme().warningStyle(`No ${config.logFile} file found.`));
      console.log('\nRun the linting analysis first to create it.');
      await waitForEnter();
      return;
    }

    // Read and parse log file
    const logContent = fs.readFileSync(config.logFile, 'utf8');
    const entries = [];
    let currentDate = '';

    console.log('Parsing log entries...');
    const logLines = logContent.split('\n').filter((line) => line.trim());

    logLines.forEach((line, index) => {
      updateProgressBar(index + 1, logLines.length, `Parsing line ${index + 1}/${logLines.length}`);

      if (line.startsWith('===== ')) {
        currentDate = line.replace(/=+/g, '').trim();
      } else if (line.includes('problems')) {
        const match = line.match(
          /(\d+) problems? \((\d+) errors?, (\d+) warnings?(?:, (\d+) formatting)?\)/,
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

    if (entries.length < 2) {
      console.log(`\n${getCurrentTheme().warningStyle('Need at least two scans to compare versions.')}`);
      console.log('Run more linting analyses to generate comparison data.');
      await waitForEnter();
      return;
    }

    // Get the latest two entries for comparison
    const current = entries[entries.length - 1];
    const previous = entries[entries.length - 2];

    console.log(`\n${getCurrentTheme().titleStyle('=== VERSION COMPARISON ===')}`);
    console.log(`Previous scan: ${getCurrentTheme().infoStyle(previous.date)}`);
    console.log(`Current scan:  ${getCurrentTheme().infoStyle(current.date)}`);

    // Compare total issues
    const totalDiff = previous.total - current.total;
    const totalPercent = ((totalDiff / previous.total) * 100).toFixed(1);

    console.log(`\n${getCurrentTheme().titleStyle('=== CHANGES OVERVIEW ===')}`);
    console.log(`Total issues: ${formatChange(totalDiff, previous.total, current.total)}`);

    // Compare errors
    const errorDiff = previous.errors - current.errors;
    const errorPercent = ((errorDiff / Math.max(1, previous.errors)) * 100).toFixed(1);
    console.log(`Errors: ${formatChange(errorDiff, previous.errors, current.errors)}`);

    // Compare warnings
    const warningDiff = previous.warnings - current.warnings;
    const warningPercent = ((warningDiff / Math.max(1, previous.warnings)) * 100).toFixed(1);
    console.log(`Warnings: ${formatChange(warningDiff, previous.warnings, current.warnings)}`);

    // Compare formatting if available
    if (previous.formatting || current.formatting) {
      const formattingDiff = (previous.formatting || 0) - (current.formatting || 0);
      const formattingPercent = ((formattingDiff / Math.max(1, previous.formatting || 1)) * 100).toFixed(1);
      console.log(`Formatting: ${formatChange(formattingDiff, previous.formatting || 0, current.formatting || 0)}`);
    }

    // Check if detailed data is available
    const currentJsonPath = path.join(config.reportDir, 'current.json');
    const previousJsonPath = path.join(config.reportDir, 'previous.json');

    if (fs.existsSync(currentJsonPath) && fs.existsSync(previousJsonPath)) {
      try {
        const currentData = JSON.parse(fs.readFileSync(currentJsonPath, 'utf8'));
        const previousData = JSON.parse(fs.readFileSync(previousJsonPath, 'utf8'));

        console.log(`\n${getCurrentTheme().titleStyle('=== FILE-LEVEL CHANGES ===')}`);

        // Compare worst files
        const changedFiles = new Map();

        // Process previous files
        previousData.worstFiles?.forEach((file) => {
          changedFiles.set(file.file, {
            previous: { errors: file.errors, warnings: file.warnings },
            current: { errors: 0, warnings: 0 },
          });
        });

        // Process current files
        currentData.worstFiles?.forEach((file) => {
          if (changedFiles.has(file.file)) {
            changedFiles.get(file.file).current = { errors: file.errors, warnings: file.warnings };
          } else {
            changedFiles.set(file.file, {
              previous: { errors: 0, warnings: 0 },
              current: { errors: file.errors, warnings: file.warnings },
            });
          }
        });

        // Sort and display the most significant changes
        const significantChanges = Array.from(changedFiles.entries())
          .map(([file, data]) => ({
            file,
            totalChange: (data.previous.errors + data.previous.warnings) -
                        (data.current.errors + data.current.warnings),
            ...data,
          }))
          .sort((a, b) => Math.abs(b.totalChange) - Math.abs(a.totalChange))
          .slice(0, 5);

        significantChanges.forEach(({ file, totalChange, previous, current }) => {
          const changeSymbol = totalChange > 0 ? '↓' : totalChange < 0 ? '↑' : '=';
          const changeStyle = totalChange > 0 ? getCurrentTheme().successStyle : getCurrentTheme().errorStyle;

          console.log(changeStyle(`\n${changeSymbol} ${file}`));
          console.log(`  Previous: ${getCurrentTheme().errorStyle(previous.errors.toString())} errors, ${getCurrentTheme().warningStyle(previous.warnings.toString())} warnings`);
          console.log(`  Current:  ${getCurrentTheme().errorStyle(current.errors.toString())} errors, ${getCurrentTheme().warningStyle(current.warnings.toString())} warnings`);
        });

      } catch (error) {
        console.log(`${getCurrentTheme().warningStyle('\nCould not load detailed file comparison data')}`);
      }
    }

  } catch (error) {
    console.error(`\n${getCurrentTheme().errorStyle('Error comparing versions:')}`, error.message);
  }

  await waitForEnter();
};

/**
 * Format a change value with color coding and percentage
 */
function formatChange(diff, previous, current) {
  const theme = getCurrentTheme();
  const percent = ((diff / Math.max(1, previous)) * 100).toFixed(1);

  if (diff > 0) {
    return `${theme.successStyle(`${previous} → ${current}`)} (${theme.successStyle(`↓ -${diff} (-${percent}%)`)})`;
  } else if (diff < 0) {
    return `${theme.errorStyle(`${previous} → ${current}`)} (${theme.errorStyle(`↑ +${Math.abs(diff)} (+${Math.abs(percent)}%)`)})`;
  } else {
    return `${theme.infoStyle(`${previous} → ${current}`)} (${theme.infoStyle('no change')})`;
  }
}
