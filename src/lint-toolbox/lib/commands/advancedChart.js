import fs from 'fs';
import path from 'path';
import { getCurrentTheme } from '../themes.js';
import { waitForEnter } from '../cli.js';
import config from '../../config/default.js';
import { updateProgressBar } from '../cli.js';

/**
 * Create an advanced ASCII chart of ESLint/Prettier linting progress
 */
export const advancedChart = async (options = {}) => {
  console.clear();
  console.log('\n' + getCurrentTheme().titleStyle('✓ Advanced Progress Chart'));

  const { verbose = true, color = true } = options;

  try {
    // Get log file path from config
    const reportDir = path.join(process.cwd(), config.paths.reports);
    const logFile = path.join(reportDir, 'lint.log');

    // Check if log file exists
    if (!fs.existsSync(logFile)) {
      console.log(`${getCurrentTheme().warningStyle(`No log file found at ${logFile}`)}`);
      console.log('\nRun linting analysis first to create it');
      await waitForEnter();
      return;
    }

    // Read the log file
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());

    console.log(`Read ${logLines.length} lines from log file`);

    // Parse the log entries with progress bar
    const entries = [];
    let currentDate = '';

    console.log('Parsing log entries:');
    for (let i = 0; i < logLines.length; i++) {
      const line = logLines[i];
      if (process.stdout.isTTY) {
        updateProgressBar(i + 1, logLines.length, `Parsing line ${i + 1}/${logLines.length}`);
      } else {
        console.log(`Parsing line ${i + 1}/${logLines.length}`);
      }

      if (line.startsWith('===== ')) {
        // This is a date line
        currentDate = line.replace(/=+/g, '').trim();
      } else if (line.includes('problems')) {
        // This is a problems line from ESLint output
        const match = line.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?(?:, \d+ formatting)?\)/);
        if (match) {
          entries.push({
            date: currentDate,
            total: parseInt(match[1]),
            errors: parseInt(match[2]),
            warnings: parseInt(match[3]),
            formatting: 0 // Default to 0 if not specified
          });
        }
      }
    }

    if (entries.length === 0) {
      console.log(`\n${getCurrentTheme().warningStyle('No data entries found in log file')}`);
      console.log('Make sure you have run the linting analysis first');
      await waitForEnter();
      return;
    }

    // Find the maximum number of issues to scale the chart
    const maxIssues = Math.max(...entries.map(e => e.total));
    const scale = 50; // Maximum width of chart

    console.log(`\n${getCurrentTheme().titleStyle('=== ESLINT/PRETTIER LINTING PROGRESS CHART ===')}`);
    console.log(`${getCurrentTheme().titleStyle('Date       | Errors | Warnings | Format | Progress')}`);
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
      let progressColor = getCurrentTheme().errorStyle;
      if (progress >= 75) {
        progressColor = getCurrentTheme().successStyle;
      } else if (progress >= 50) {
        progressColor = getCurrentTheme().infoStyle;
      } else if (progress >= 25) {
        progressColor = getCurrentTheme().warningStyle;
      }

      console.log(
        `${dateStr} | ${getCurrentTheme().errorStyle(errorsStr)} | ${getCurrentTheme().warningStyle(warningsStr)} | ${formattingStr} | ${progressColor(bar + ' ' + progress + '%')}`
      );
    });

    // Show trend information
    if (entries.length >= 2) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      const reduction = first.total - last.total;
      const percentReduction = ((reduction / first.total) * 100).toFixed(1);

      console.log(`\n${getCurrentTheme().titleStyle('=== TREND ANALYSIS ===')}`);
      console.log(`Starting issues: ${getCurrentTheme().titleStyle(first.total.toString())}`);
      console.log(`Current issues: ${getCurrentTheme().titleStyle(last.total.toString())}`);

      const reductionText = `${reduction} (${percentReduction}%)`;
      if (reduction > 0) {
        console.log(`Issues fixed: ${getCurrentTheme().successStyle(reductionText)}`);
      } else {
        console.log(`Issues added: ${getCurrentTheme().errorStyle(reductionText)}`);
      }

      // Estimate completion
      if (reduction > 0) {
        const daysElapsed = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
        if (daysElapsed > 0) {
          const fixRate = reduction / daysElapsed;
          const daysRemaining = Math.ceil(last.total / fixRate);

          const completionDate = new Date();
          completionDate.setDate(completionDate.getDate() + daysRemaining);

          console.log(`Average fix rate: ${getCurrentTheme().infoStyle(fixRate.toFixed(1) + ' issues per day')}`);
          console.log(`Estimated completion: ${getCurrentTheme().titleStyle(daysRemaining + ' days')} (around ${getCurrentTheme().successStyle(completionDate.toLocaleDateString())})`);

          // Show detailed trend analysis if verbose mode is enabled
          if (verbose) {
            console.log(`\n${getCurrentTheme().titleStyle('=== DETAILED TREND ANALYSIS ===')}`);

            // Calculate error reduction rate
            const errorReduction = first.errors - last.errors;
            const errorPercentReduction = ((errorReduction / Math.max(1, first.errors)) * 100).toFixed(1);
            console.log(`Error reduction: ${getCurrentTheme().errorStyle(`${errorReduction} (${errorPercentReduction}%)`)}`);

            // Calculate warning reduction rate
            const warningReduction = first.warnings - last.warnings;
            const warningPercentReduction = ((warningReduction / Math.max(1, first.warnings)) * 100).toFixed(1);
            console.log(`Warning reduction: ${getCurrentTheme().warningStyle(`${warningReduction} (${warningPercentReduction}%)`)}`);
            
            // Project trend for the next 30 days
            const projectFuture = (days) => {
              const projectedTotal = Math.max(0, Math.round(last.total - (fixRate * days)));
              const projectedErrors = Math.max(0, Math.round(last.errors - ((first.errors - last.errors) / daysElapsed) * days));
              const projectedWarnings = Math.max(0, Math.round(last.warnings - ((first.warnings - last.warnings) / daysElapsed) * days));
              return {
                date: days,
                total: projectedTotal,
                errors: projectedErrors,
                warnings: projectedWarnings
              };
            };
            
            console.log(`\n${getCurrentTheme().titleStyle('=== PROJECTED TREND (NEXT 30 DAYS) ===')}`);
            console.log(`${getCurrentTheme().optionStyle('Days from now | Total | Errors | Warnings')}`);
            console.log('-'.repeat(50));
            
            const projections = [7, 14, 30];
            projections.forEach(days => {
              const projection = projectFuture(days);
              console.log(`${days.toString().padStart(13)} | ${projection.total.toString().padStart(5)} | ${projection.errors.toString().padStart(6)} | ${projection.warnings.toString().padStart(8)}`);
            });
            
            // Recommendations based on analysis
            console.log(`\n${getCurrentTheme().titleStyle('=== RECOMMENDATIONS ===')}`);

            // Calculate daily rates
            console.log(`\nDaily rates:`);
            console.log(`- Errors fixed per day: ${getCurrentTheme().errorStyle((errorReduction / daysElapsed).toFixed(2))}`);
            console.log(`- Warnings fixed per day: ${getCurrentTheme().warningStyle((warningReduction / daysElapsed).toFixed(2))}`);
            console.log(`- Total issues fixed per day: ${getCurrentTheme().infoStyle((reduction / daysElapsed).toFixed(2))}`);

            // Show progress over time
            console.log(`\nProgress over time:`);
            for (let i = 1; i < entries.length; i++) {
              const prev = entries[i - 1];
              const curr = entries[i];
              const daysBetween = (new Date(curr.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24);
              const issueReduction = prev.total - curr.total;

              if (daysBetween > 0) {
                const dailyRate = (issueReduction / daysBetween).toFixed(2);
                if (issueReduction > 0) {
                  console.log(`${prev.date.substring(0, 10)} → ${curr.date.substring(0, 10)}: ${getCurrentTheme().successStyle(dailyRate + ' issues/day')}`);
                } else {
                  console.log(`${prev.date.substring(0, 10)} → ${curr.date.substring(0, 10)}: ${getCurrentTheme().errorStyle(dailyRate + ' issues/day')}`);
                }
              }
            }
          }
        }
      }
    }

    // Show the worst files list
    try {
      const jsonPath = path.join(reportDir, 'lint-results.json');
      if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (jsonData.worstFiles && jsonData.worstFiles.length > 0) {
          console.log(`\n${getCurrentTheme().titleStyle('=== FILES WITH MOST ISSUES ===')}`);
          jsonData.worstFiles.slice(0, 5).forEach((file, index) => {
            console.log(`${index + 1}. ${file.file}: ${getCurrentTheme().errorStyle(file.errors.toString())} errors, ${getCurrentTheme().warningStyle(file.warnings.toString())} warnings`);
          });
        }

        if (jsonData.issuesByDirectory && jsonData.issuesByDirectory.length > 0) {
          console.log(`\n${getCurrentTheme().titleStyle('=== DIRECTORY BREAKDOWN ===')}`);
          jsonData.issuesByDirectory.slice(0, 5).forEach((dir, index) => {
            const barLength = Math.floor((dir.total / jsonData.issuesByDirectory[0].total) * 20);
            const bar = '█'.repeat(barLength);
            console.log(`${index + 1}. ${dir.directory.padEnd(25)} : ${bar} ${dir.total} (${getCurrentTheme().errorStyle(dir.errors.toString())} errors, ${getCurrentTheme().warningStyle(dir.warnings.toString())} warnings)`);
          });
        }
      }
    } catch (jsonError) {
      console.log(`${getCurrentTheme().warningStyle('Could not load additional data from JSON file:')}`);
      console.log(jsonError.message);
    }

    // Add improvement suggestions section
    console.log(`\n${getCurrentTheme().titleStyle('=== IMPROVEMENT SUGGESTIONS ===')}`); 
    
    try {
      const jsonPath = path.join(reportDir, 'lint-results.json');
      if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const worstFiles = jsonData.worstFiles || [];
        const directoryStats = {};
        
        if (jsonData.issuesByDirectory) {
          jsonData.issuesByDirectory.forEach(dir => {
            directoryStats[dir.directory] = {
              total: dir.total,
              errors: dir.errors,
              warnings: dir.warnings
            };
          });
        }
        
        if (entries.length > 0 && worstFiles.length > 0) {
          // Focus on files with highest error count first
          console.log(`${getCurrentTheme().infoStyle('1.')} Focus on fixing errors in ${worstFiles[0].file} (${worstFiles[0].errors} errors)`);
          
          // Recommend consistent addressing of warnings
          console.log(`${getCurrentTheme().infoStyle('2.')} Set aside time to address warnings systematically`);
          
          // Suggest CI integration if fixing rate is slow
          if (entries.length >= 2) {
            const first = entries[0];
            const last = entries[entries.length - 1];
            if (((last.total - first.total) / first.total) > -0.1) {
              console.log(`${getCurrentTheme().infoStyle('3.')} Consider integrating linting into your CI/CD pipeline`);
            }
          }
          
          // Suggest rule configuration adjustments
          console.log(`${getCurrentTheme().infoStyle('4.')} Review rule configurations for frequently violated rules`);
          
          // Recommend codebase structure improvements
          if (Object.keys(directoryStats).length > 3) {
            const dirWithMostIssues = Object.keys(directoryStats).sort((a, b) => 
              directoryStats[b].total - directoryStats[a].total)[0];
            console.log(`${getCurrentTheme().infoStyle('5.')} Consider refactoring code in ${dirWithMostIssues}`);
          }
        } else {
          console.log(`${getCurrentTheme().successStyle('Great job!')} Your codebase has no major linting issues.`);
        }
      }
    } catch (err) {
      console.log(`${getCurrentTheme().warningStyle('Could not generate improvement suggestions:')}`);
      console.log(err.message);
    }

  } catch (error) {
    console.error(`\n${getCurrentTheme().errorStyle('Error generating advanced chart:')}`, error.message);
  }

  await waitForEnter();
};
