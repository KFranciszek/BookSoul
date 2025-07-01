const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

class Logger {
  constructor() {
    this.colors = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[90m',   // Gray
      reset: '\x1b[0m'     // Reset
    };
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const color = this.colors[level] || '';
    const reset = this.colors.reset;
    
    let formatted = `${color}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`;
    
    if (data) {
      formatted += `\n${JSON.stringify(data, null, 2)}`;
    }
    
    return formatted;
  }

  error(message, data = null) {
    if (CURRENT_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  warn(message, data = null) {
    if (CURRENT_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  info(message, data = null) {
    if (CURRENT_LEVEL >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  debug(message, data = null) {
    if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();