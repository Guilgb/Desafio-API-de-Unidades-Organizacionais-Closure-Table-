import { Logger } from 'typeorm';
import { dbLogger, logger } from '../config/winston/winston.config';

export class TypeOrmLogger implements Logger {
  logQuery(query: string, parameters?: any[], queryRunner?: any): void {
    const startTime = queryRunner?.startTime || Date.now();
    const duration = Date.now() - startTime;

    dbLogger.log('query', query, {
      parameters,
      duration,
      context: 'TypeORM',
    });
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
  ): void {
    dbLogger.error('Query failed', {
      error: error.toString(),
      query,
      parameters,
      context: 'TypeORM',
    });
  }

  logQuerySlow(time: number, query: string, parameters?: any[]): void {
    dbLogger.warn(`Slow query detected (${time}ms)`, {
      query,
      parameters,
      duration: time,
      context: 'TypeORM',
    });
  }

  logSchemaBuild(message: string): void {
    logger.info(message, { context: 'TypeORM Schema' });
  }

  logMigration(message: string): void {
    logger.info(message, { context: 'TypeORM Migration' });
  }

  log(level: 'log' | 'info' | 'warn', message: any): void {
    switch (level) {
      case 'log':
      case 'info':
        logger.info(message, { context: 'TypeORM' });
        break;
      case 'warn':
        logger.warn(message, { context: 'TypeORM' });
        break;
    }
  }
}
