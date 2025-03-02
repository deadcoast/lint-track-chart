import fs from 'fs';
import path from 'path';
import { getCurrentTheme } from '../themes.js';
import { waitForEnter, updateProgressBar } from '../cli.js';
import config from '../../config/default.js';
import { advancedChart } from './advancedChart.js';

/**
 * Generate and display progress chart with detailed analytics
 */
export const chart = async (options) => {
  const viewType = options.type || 'trend';
  
  // Use the advanced chart for trend analysis
  if (viewType === 'trend') {
    return advancedChart(options);
  }
  
  console.clear();
  console.log('\n' + getCurrentTheme().titleStyle('✓ Viewing Progress & Statistics'));

  try {
    // Construct the log file path
    const reportDir = path.join(process.cwd(), config.paths.reports);
    const logFile = path.join(reportDir, 'lint.log');
    
    // Check if log file exists
    if (!fs.existsSync(logFile)) {
      console.log(getCurrentTheme().warningStyle(`No ${logFile} file found.`));
      console.log('\nRun the linting analysis first to create it.');
      await waitForEnter();
      return;
    }

    // Read and parse log file
    const logContent = fs.readFileSync(logFile, 'utf8');
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

    if (entries.length === 0) {
      console.log(`\n${getCurrentTheme().warningStyle(`No data entries found in ${logFile}`)}`);
      console.log('Make sure the file contains entries in the correct format:');
      console.log('===== DATE =====');
      console.log('X problems (Y errors, Z warnings)');
      await waitForEnter();
      return;
    }

    // Find the maximum number of issues to scale the chart
    const maxIssues = Math.max(...entries.map((e) => e.total));
    const scale = 40; // Maximum width of chart

    console.log(`\n${getCurrentTheme().titleStyle('=== ESLINT/PRETTIER LINTING PROGRESS CHART ===')}`);
    console.log(`${getCurrentTheme().optionStyle('Date       | Errors | Warnings | Format | Progress')}`);
    console.log('-'.repeat(70));

    entries.forEach((entry) => {
      const dateStr = entry.date.substring(0, 10);
      const errorsStr = entry.errors.toString().padStart(6);
      const warningsStr = entry.warnings.toString().padStart(8);
      const formattingStr = (entry.formatting || 0).toString().padStart(6);

      // Calculate bar length proportional to issues
      const progress = Math.floor((1 - entry.total / maxIssues) * 100);
      const barLength = Math.floor((scale * entry.total) / maxIssues);
      const bar = '█'.repeat(scale - barLength) + '░'.repeat(barLength);

      // Color-code based on progress
      let progressStyle = getCurrentTheme().errorStyle;
      if (progress >= 75) {
        progressStyle = getCurrentTheme().successStyle;
      } else if (progress >= 50) {
        progressStyle = getCurrentTheme().infoStyle;
      } else if (progress >= 25) {
        progressStyle = getCurrentTheme().warningStyle;
      }

      console.log(
        `${dateStr} | ${getCurrentTheme().errorStyle(errorsStr)} | ${getCurrentTheme().warningStyle(warningsStr)} | ${getCurrentTheme().infoStyle(formattingStr)} | ${progressStyle(`${bar} ${progress}%`)}`,
      );
    });

    // Show trend information
    if (entries.length >= 2) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      const reduction = first.total - last.total;
      const percentReduction = ((reduction / first.total) * 100).toFixed(1);

      console.log(`\n${getCurrentTheme().titleStyle('=== TREND ANALYSIS ===')}`);
      console.log(`Starting issues: ${getCurrentTheme().optionStyle(`${first.total}`)}`);
      console.log(`Current issues: ${getCurrentTheme().optionStyle(`${last.total}`)}`);

      const reductionStyle = reduction > 0 ? getCurrentTheme().successStyle : getCurrentTheme().errorStyle;
      console.log(`Issues fixed: ${reductionStyle(`${reduction} (${percentReduction}%)`)}`);

      // Estimate completion
      if (reduction > 0) {
        const daysElapsed = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
        const fixRate = reduction / Math.max(1, daysElapsed);
        const daysRemaining = Math.ceil(last.total / fixRate);

        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysRemaining);

        console.log(
          `Average fix rate: ${getCurrentTheme().infoStyle(`${fixRate.toFixed(1)} issues per day`)}`,
        );
        console.log(
          `Estimated completion: ${getCurrentTheme().optionStyle(`${daysRemaining} days`)} (around ${getCurrentTheme().successStyle(`${completionDate.toLocaleDateString()}`)})`,
        );

        // Show additional stats
        console.log(`\n${getCurrentTheme().titleStyle('=== DETAILED ANALYSIS ===')}`);

        // Error reduction
        const errorReduction = first.errors - last.errors;
        const errorPercentReduction = ((errorReduction / Math.max(1, first.errors)) * 100).toFixed(1);
        console.log(
          `Error reduction: ${getCurrentTheme().errorStyle(`${errorReduction} (${errorPercentReduction}%)`)}`,
        );

        // Warning reduction
        const warningReduction = first.warnings - last.warnings;
        const warningPercentReduction = ((warningReduction / Math.max(1, first.warnings)) * 100).toFixed(1);
        console.log(
          `Warning reduction: ${getCurrentTheme().warningStyle(`${warningReduction} (${warningPercentReduction}%)`)}`,
        );

        // Formatting reduction if available
        if (first.formatting || last.formatting) {
          const formattingReduction = (first.formatting || 0) - (last.formatting || 0);
          const formattingPercentReduction = (
            (formattingReduction / Math.max(1, first.formatting || 1)) * 100
          ).toFixed(1);
          console.log(
            `Formatting reduction: ${getCurrentTheme().infoStyle(`${formattingReduction} (${formattingPercentReduction}%)`)}`,
          );
        }
      }
    }

    // Check if detailed data is available
    const jsonPath = path.join(reportDir, 'lint-results.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        // Display file statistics
        if (jsonData.worstFiles && jsonData.worstFiles.length > 0) {
          console.log(`\n${getCurrentTheme().titleStyle('=== FILES WITH MOST ISSUES ===')}`);
          jsonData.worstFiles.slice(0, 5).forEach((file, index) => {
            console.log(`${index + 1}. ${file.file}: ${getCurrentTheme().errorStyle(file.errors.toString())} errors, ${getCurrentTheme().warningStyle(file.warnings.toString())} warnings`);
          });
        }

        // Display directory statistics
        if (jsonData.issuesByDirectory && jsonData.issuesByDirectory.length > 0) {
          console.log(`\n${getCurrentTheme().titleStyle('=== DIRECTORY BREAKDOWN ===')}`);
          const topDirs = jsonData.issuesByDirectory.slice(0, 5);

          // Find max issues for bar scaling
          const maxDirIssues = Math.max(...topDirs.map((d) => d.total));
          const barScale = 20; // Scale for the bar chart

          topDirs.forEach((dir, index) => {
            const barLength = Math.floor((dir.total / maxDirIssues) * barScale);
            const bar = '█'.repeat(barLength);
            console.log(`${index + 1}. ${dir.directory.padEnd(30)}: ${bar} ${dir.total} (${dir.errors} errors, ${dir.warnings} warnings)`);
          });
        }
      } catch (error) {
        console.log(`${getCurrentTheme().warningStyle('Could not load detailed statistics')}`);
      }
    }
  } catch (error) {
    console.error(`\n${getCurrentTheme().errorStyle('Error processing log file:')}`, error.message);
  }

  await waitForEnter();
};
