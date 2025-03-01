import fs from 'fs';
import path from 'path';
import { getCurrentTheme } from '../themes.js';
import { waitForEnter } from '../cli.js';
import { ensureDirectoryExists } from '../utils.js';
import { safeExec } from '../cli.js';
import config from '../../config/default.js';

/**
 * Generate HTML report
 */
export const html = async (options = {}) => {
  console.clear();
  console.log('\n' + getCurrentTheme().titleStyle('✓ Generating HTML Report'));

  try {
    // Construct the report directory path
    const reportDir = path.join(process.cwd(), config.paths.reports);
    
    // Check if the report directory exists
    if (!fs.existsSync(reportDir)) {
      console.log(`${getCurrentTheme().warningStyle(`The report directory '${reportDir}' does not exist.`)}`);
      console.log('\nPlease run linting analysis first to create it.');
      await waitForEnter();
      return;
    }
    
    // Check if JSON data exists
    const jsonPath = path.join(reportDir, 'lint-results.json');
    if (!fs.existsSync(jsonPath)) {
      console.log(`${getCurrentTheme().warningStyle(`No data available at '${jsonPath}'. Please run linting analysis first.`)}`);
      await waitForEnter();
      return;
    }

    // Read the JSON data
    let jsonData;
    try {
      jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log(`Successfully loaded JSON data from ${jsonPath}`);
      console.log('JSON data structure:', Object.keys(jsonData));
      if (jsonData.stats) console.log('Stats available:', Object.keys(jsonData.stats));
      if (jsonData.ruleStats) console.log('Rule stats length:', jsonData.ruleStats.length);
      if (jsonData.worstFiles) console.log('Worst files length:', jsonData.worstFiles.length);
      if (jsonData.issuesByDirectory) console.log('Directory issues length:', jsonData.issuesByDirectory.length);
    } catch (jsonError) {
      console.log(`${getCurrentTheme().errorStyle('Error parsing JSON data:')} ${jsonError.message}`);
      await waitForEnter();
      return;
    }

    // Create the HTML report
    const htmlPath = path.join(reportDir, 'lint-report.html');
    const chartJsScript = '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';

    // Get historical data from log file
    const logFile = path.join(reportDir, 'lint.log');
    if (!fs.existsSync(logFile)) {
      console.log(`${getCurrentTheme().warningStyle(`No log file found at '${logFile}'.`)}`);
      console.log('\nRun the linting analysis first to create it.');
      await waitForEnter();
      return;
    }
    
    const logContent = fs.readFileSync(logFile, 'utf8');
    console.log('Log file content loaded successfully.');
    
    // Parse the log file
    const entries = [];
    let currentDate = '';
    
    logContent.split('\n').forEach(line => {
      // Check for date headers
      const dateMatch = line.match(/===== (.+) =====/); 
      if (dateMatch) {
        currentDate = dateMatch[1];
        console.log(`Found date entry: ${currentDate}`);
      } else {
        // Check for issue counts
        const issueMatch = line.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?(?:, (\d+) formatting)?\)/);
        if (issueMatch) {
          entries.push({
            date: new Date(currentDate).toLocaleString(),
            total: parseInt(issueMatch[1], 10), 
            errors: parseInt(issueMatch[2], 10),
            warnings: parseInt(issueMatch[3], 10),
            formatting: issueMatch[4] ? parseInt(issueMatch[4], 10) : 0,
            files: 0 // Files count not available in this format
          });
          console.log(`Added entry with ${issueMatch[1]} total issues`);
        }
      }
    });
    
    if (entries.length === 0) {
      console.log(`${getCurrentTheme().warningStyle('No entries found in log file. The format may be incorrect.')}`);
      console.log('Log file contents:');
      console.log(logContent.substring(0, 200) + '...');
      await waitForEnter();
      return;
    }
    
    console.log(`Parsed ${entries.length} entries from the log file.`);

    // Make sure jsonData has the expected structure
    if (!jsonData.stats) jsonData.stats = { errors: 0, warnings: 0, totalFiles: 0, filesWithIssues: 0 };
    if (!jsonData.worstFiles) jsonData.worstFiles = [];
    if (!jsonData.issuesByDirectory) jsonData.issuesByDirectory = [];
    if (!jsonData.ruleStats) jsonData.ruleStats = [];
    if (!jsonData.issuesByRule) jsonData.issuesByRule = [];
    
    // Create safe versions of arrays for the charts
    const safeEntries = Array.isArray(entries) ? entries : [];
    const safeRuleStats = Array.isArray(jsonData.ruleStats) ? jsonData.ruleStats : [];
    const safeWorstFiles = Array.isArray(jsonData.worstFiles) ? jsonData.worstFiles : [];
    const safeDirectoryIssues = Array.isArray(jsonData.issuesByDirectory) ? jsonData.issuesByDirectory : [];
    const safeIssuesByRule = Array.isArray(jsonData.issuesByRule) ? jsonData.issuesByRule : [];
    
    // Create HTML content
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Linting Report</title>
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
    h1, h2, h3 { color: #2c3e50; }
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
    .error { color: #e74c3c; font-weight: bold; }
    .warning { color: #f39c12; font-weight: bold; }
    .info { color: #3498db; font-weight: bold; }
    .success { color: #2ecc71; font-weight: bold; }
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
    th { background-color: #f2f2f2; }
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
    <h1>Linting Report</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary-box">
    <h2>Summary</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <h3>Total Issues</h3>
        <p style="font-size: 2rem;">${jsonData.stats.errors + jsonData.stats.warnings}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: 100%"></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Errors</h3>
        <p class="error" style="font-size: 2rem;">${jsonData.stats.errors}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${jsonData.stats.errors / (jsonData.stats.errors + jsonData.stats.warnings) * 100}%; background-color: #e74c3c;"></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Warnings</h3>
        <p class="warning" style="font-size: 2rem;">${jsonData.stats.warnings}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${jsonData.stats.warnings / (jsonData.stats.errors + jsonData.stats.warnings) * 100}%; background-color: #f39c12;"></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Formatting Issues</h3>
        <p class="info" style="font-size: 2rem;">0</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: 0%; background-color: #3498db;"></div>
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
      ${entries.length >= 2 ? `
        <p>Starting with <strong>${entries[0].total}</strong> issues on ${entries[0].date}</p>
        <p>Currently at <strong>${entries[entries.length-1].total}</strong> issues on ${entries[entries.length-1].date}</p>
        <p class="${entries[0].total - entries[entries.length-1].total > 0 ? 'success' : 'error'}">
          ${entries[0].total - entries[entries.length-1].total > 0 ? 'Reduced by' : 'Increased by'} 
          <strong>${Math.abs(entries[0].total - entries[entries.length-1].total)}</strong> issues
          (${(Math.abs(entries[0].total - entries[entries.length-1].total) / entries[0].total * 100).toFixed(1)}%)
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
        ${safeIssuesByRule.map((rule, index) => `
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
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
      });
      
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
    function sortTable(table, column, isNumeric = true) {
      const rows = Array.from(table.getElementsByTagName('tr')).slice(1);
      rows.sort((a, b) => {
        let aValue = a.cells[column].textContent;
        let bValue = b.cells[column].textContent;
        if (isNumeric) {
          return parseInt(bValue) - parseInt(aValue);
        }
        return aValue.localeCompare(bValue);
      });
      
      while (table.rows.length > 1) {
        table.deleteRow(1);
      }
      
      rows.forEach(row => table.appendChild(row));
    }
    
    function sortRules() {
      const sortBy = document.getElementById('ruleSortBy').value;
      const table = document.getElementById('rulesTable');
      switch(sortBy) {
        case 'count': sortTable(table, 1); break;
        case 'errors': sortTable(table, 2); break;
        case 'warnings': sortTable(table, 3); break;
        case 'name': sortTable(table, 0, false); break;
      }
    }
    
    function sortFiles() {
      const sortBy = document.getElementById('fileSortBy').value;
      const table = document.getElementById('filesTable');
      switch(sortBy) {
        case 'total': sortTable(table, 1); break;
        case 'errors': sortTable(table, 2); break;
        case 'warnings': sortTable(table, 3); break;
        case 'name': sortTable(table, 0, false); break;
      }
    }
    
    function sortDirectories() {
      const sortBy = document.getElementById('dirSortBy').value;
      const table = document.getElementById('directoriesTable');
      switch(sortBy) {
        case 'total': sortTable(table, 1); break;
        case 'errors': sortTable(table, 2); break;
        case 'warnings': sortTable(table, 3); break;
        case 'name': sortTable(table, 0, false); break;
      }
    }
    
    // Charts initialization
    window.onload = function() {
      // Trend chart
      const trendCtx = document.getElementById('trendChart').getContext('2d');
      const trendData = ${JSON.stringify(safeEntries)};
      
      new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: Array.isArray(trendData) ? trendData.map(entry => entry.date || 'Unknown') : [],
          datasets: [
            {
              label: 'Total Issues',
              data: Array.isArray(trendData) ? trendData.map(entry => entry.total || 0) : [],
              borderColor: '#2c3e50',
              backgroundColor: 'rgba(44, 62, 80, 0.1)',
              tension: 0.1,
              fill: true
            },
            {
              label: 'Errors',
              data: Array.isArray(trendData) ? trendData.map(entry => entry.errors || 0) : [],
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              tension: 0.1
            },
            {
              label: 'Warnings',
              data: Array.isArray(trendData) ? trendData.map(entry => entry.warnings || 0) : [],
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
      const rulesData = ${JSON.stringify(safeRuleStats.slice(0, 10))};
      
      new Chart(rulesCtx, {
        type: 'bar',
        data: {
          labels: Array.isArray(rulesData) ? rulesData.map(rule => rule.rule || 'Unknown') : [],
          datasets: [
            {
              label: 'Occurrences',
              data: Array.isArray(rulesData) ? rulesData.map(rule => rule.count || 0) : [],
              backgroundColor: 'rgba(243, 156, 18, 0.7)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true },
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
      const filesData = ${JSON.stringify(safeWorstFiles.slice(0, 10))};
      
      new Chart(filesCtx, {
        type: 'bar',
        data: {
          labels: Array.isArray(filesData) ? filesData.map(file => file.file || 'Unknown') : [],
          datasets: [
            {
              label: 'Errors',
              data: Array.isArray(filesData) ? filesData.map(file => file.errors || 0) : [],
              backgroundColor: 'rgba(231, 76, 60, 0.7)',
            },
            {
              label: 'Warnings',
              data: Array.isArray(filesData) ? filesData.map(file => file.warnings || 0) : [],
              backgroundColor: 'rgba(243, 156, 18, 0.7)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true },
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
      const dirData = ${JSON.stringify(safeDirectoryIssues.slice(0, 10))};
      
      new Chart(dirCtx, {
        type: 'bar',
        data: {
          labels: Array.isArray(dirData) ? dirData.map(dir => dir.directory || 'Unknown') : [],
          datasets: [
            {
              label: 'Errors',
              data: Array.isArray(dirData) ? dirData.map(dir => dir.errors || 0) : [],
              backgroundColor: 'rgba(231, 76, 60, 0.7)',
            },
            {
              label: 'Warnings',
              data: Array.isArray(dirData) ? dirData.map(dir => dir.warnings || 0) : [],
              backgroundColor: 'rgba(243, 156, 18, 0.7)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true },
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
</html>`;

    // Write HTML report
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    console.log(`${getCurrentTheme().successStyle(`HTML report generated at: ${htmlPath}`)}`);
    console.log('Open this file in your browser to view interactive charts and statistics.');

  } catch (error) {
    console.error(`\n${getCurrentTheme().errorStyle('Error generating HTML report:')}`, error.message);
    if (error.stack) {
      console.error('Error location:', error.stack.split('\n')[1]);
    }
  }

  await waitForEnter();
}
