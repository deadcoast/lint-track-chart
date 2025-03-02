import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  // Core settings
  core: {
    version: '2.0.0',
    debug: false,
    quiet: false,
    maxConcurrency: os.cpus().length,
    timeout: 30000, // 30 seconds
    retries: 3,
    backoffFactor: 1.5,
  },

  // File paths and directories
  paths: {
    // Base directories
    root: path.resolve(__dirname, '..'),
    cache: path.join(os.tmpdir(), 'lint-track-chart'),
    reports: './reports',
    templates: path.join(__dirname, '..', 'templates'),

    // Specific files
    defaultTheme: path.join(__dirname, 'themes', 'default.json'),
    historyFile: '.lint-history.json',
    backupDir: '.lint-backups',

    // Report templates
    reportTemplates: {
      html: path.join(__dirname, '..', 'templates', 'report.html'),
      markdown: path.join(__dirname, '..', 'templates', 'report.md'),
      json: path.join(__dirname, '..', 'templates', 'report.json'),
    },
  },

  // ESLint configuration
  eslint: {
    configFile: '.eslintrc.js',
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    ignorePattern: ['node_modules/**', 'dist/**', 'build/**'],
    fix: false,
    cache: true,
    cacheLocation: path.join(os.tmpdir(), 'lint-track-chart', '.eslintcache'),
    maxWarnings: -1,
    reportUnusedDisableDirectives: true,
  },

  // Analysis settings
  analysis: {
    // Trend analysis
    trend: {
      periods: ['day', 'week', 'month', 'year'],
      defaultPeriod: 'month',
      dataPoints: 30,
      smoothing: true,
    },

    // Issue tracking
    issues: {
      severityLevels: {
        error: 2,
        warning: 1,
        info: 0,
      },
      maxIssuesPerFile: 50,
      groupByDirectory: true,
      includeSource: true,
    },

    // Comparison settings
    compare: {
      includeUnchanged: false,
      contextLines: 3,
      maxDiffSize: 1000000, // 1MB
    },
  },

  // Visualization settings
  visualization: {
    charts: {
      width: 800,
      height: 600,
      responsive: true,
      theme: 'default',
      types: ['trend', 'distribution', 'heatmap'],
      colors: {
        error: '#e74c3c',
        warning: '#f1c40f',
        info: '#3498db',
        success: '#2ecc71',
      },
    },

    // Progress indicators
    progress: {
      showSpinner: true,
      showBar: true,
      updateInterval: 100,
    },
  },

  // Theme configuration
  themes: {
    defaultTheme: 'default',
    userThemesDir: path.join(os.homedir(), '.lint-track-chart', 'themes'),
    builtinThemes: ['default', 'dark', 'light', 'contrast'],
    allowCustom: true,
  },

  // Output configuration
  output: {
    formats: ['console', 'json', 'html', 'markdown'],
    defaultFormat: 'console',
    colorOutput: true,
    verbosity: 1, // 0: quiet, 1: normal, 2: verbose
    timestamps: true,
  },

  // Fix command settings
  fix: {
    interactive: true,
    autofix: {
      safe: true,
      unsafe: false,
    },
    backup: true,
    types: ['problem', 'suggestion', 'layout'],
    maxSimultaneousFixes: 10,
  },

  // Performance settings
  performance: {
    caching: {
      enabled: true,
      duration: 86400000, // 24 hours
      maxSize: 100 * 1024 * 1024, // 100MB
    },
    throttling: {
      enabled: true,
      rate: 100,
      burst: 50,
    },
    batching: {
      enabled: true,
      size: 100,
      timeout: 1000,
    },
  },

  // Git integration
  git: {
    enabled: true,
    trackBranches: true,
    ignorePatterns: [
      '*.min.js',
      '*.bundle.js',
      'vendor/**',
    ],
    compareOptions: {
      ignoreWhitespace: true,
      contextLines: 3,
    },
  },

  // Notification settings
  notifications: {
    enabled: true,
    levels: ['error', 'warning', 'info'],
    channels: ['console', 'system'],
    throttle: {
      enabled: true,
      interval: 300000, // 5 minutes
    },
  },

  // Plugin system
  plugins: {
    directory: path.join(__dirname, '..', 'plugins'),
    autoload: true,
    allowThirdParty: true,
    safeMode: true,
  },

  // Security settings
  security: {
    allowGlobalInstall: false,
    allowRemoteConfigs: false,
    allowedDomains: [],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    timeoutMs: 30000, // 30 seconds
  },
};
