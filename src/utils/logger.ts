type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  [key: string]: unknown;
}

const writeLog = (level: LogLevel, payload: LogPayload): void => {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  });

  if (level === 'error') {
    console.error(entry);
    return;
  }

  if (level === 'warn') {
    console.warn(entry);
    return;
  }

  console.log(entry);
};

export const logger = {
  info: (message: string, meta: Record<string, unknown> = {}) => writeLog('info', { message, ...meta }),
  warn: (message: string, meta: Record<string, unknown> = {}) => writeLog('warn', { message, ...meta }),
  error: (message: string, meta: Record<string, unknown> = {}) => writeLog('error', { message, ...meta }),
  debug: (message: string, meta: Record<string, unknown> = {}) => writeLog('debug', { message, ...meta }),
};
