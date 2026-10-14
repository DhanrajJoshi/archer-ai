type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const activeLevel = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= activeLevel;
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  debug(message: string): void {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message));
    }
  },
  info(message: string): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message));
    }
  },
  warn(message: string): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message));
    }
  },
  error(message: string): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message));
    }
  },
};
