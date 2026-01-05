import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { httpLogger } from '../config/winston/winston.config';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;
    const startTime = Date.now();

    const traceId = request.headers['x-trace-id'] || uuidv4();
    const spanId = uuidv4();

    request.traceId = traceId;
    request.spanId = spanId;

    response.setHeader('X-Trace-Id', traceId);
    response.setHeader('X-Span-Id', spanId);

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        httpLogger.log('http', '', {
          method,
          url,
          statusCode,
          responseTime,
          ip,
          traceId,
          spanId,
        });
      }),
    );
  }
}
