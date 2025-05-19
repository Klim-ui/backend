const winston = require('winston');
const { createLogger, format, transports } = winston;
const path = require('path');
const fs = require('fs');

// Создаем директорию для логов, если она не существует
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Определяем форматы логирования
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(info => {
    return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`;
  })
);

// Дополнительный формат для цветного вывода в консоль
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(info => {
    return `${info.timestamp} [${info.level}]: ${info.message}`;
  })
);

// Создаем логгер
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'lira-exchange-api' },
  transports: [
    // Записываем все логи с уровнем info и выше в combined.log
    new transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Записываем все логи с уровнем error в error.log
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Логирование в консоль в разработке
    new transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  ],
  exceptionHandlers: [
    new transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.Console({
      format: consoleFormat
    })
  ],
  exitOnError: false // не завершаем приложение при ошибке логирования
});

// Добавляем обработчик uncaughtRejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Promise Rejection at: ${promise}, reason: ${reason}`);
});

module.exports = logger; 