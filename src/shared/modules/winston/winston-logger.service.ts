import { Injectable } from '@nestjs/common';
import { logger } from '../config/winston/winston.config';

@Injectable()
export class WinstonLoggerService {
  log(message: string, context?: string, meta?: any): void {
    logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any): void {
    logger.error(message, { context, stack: trace, ...meta });
  }

  warn(message: string, context?: string, meta?: any): void {
    logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any): void {
    logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any): void {
    logger.verbose(message, { context, ...meta });
  }
}
