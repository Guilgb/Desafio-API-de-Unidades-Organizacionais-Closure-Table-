import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

type RequestWithRoute = Request & {
  route?: {
    path?: string;
  };
};

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithRoute>();
    const { method, route } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const response = context.switchToHttp().getResponse<Response>();
          const statusCode = response.statusCode;

          this.metricsService.observeHttpRequestDuration(
            duration,
            method,
            route?.path || request.url,
            statusCode,
          );
        },
        error: (error: Error | HttpException) => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode =
            error instanceof HttpException ? error.getStatus() : 500;

          this.metricsService.observeHttpRequestDuration(
            duration,
            method,
            route?.path || request.url,
            statusCode,
          );

          this.metricsService.incrementErrors(
            error.constructor.name,
            route?.path || request.url,
          );
        },
      }),
    );
  }
}
