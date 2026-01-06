import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface TracedRequest extends Request {
  traceId?: string;
  spanId?: string;
}

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const tracer = trace.getTracer('api-unidades-organizacionais');
    const request = executionContext.switchToHttp().getRequest<TracedRequest>();
    const { method, url } = request;

    const spanName = `${executionContext.getClass().name}.${executionContext.getHandler().name}`;

    return tracer.startActiveSpan(spanName, (span: Span) => {
      span.setAttributes({
        'http.method': method,
        'http.url': url,
        'http.route': executionContext.getHandler().name,
        'controller.name': executionContext.getClass().name,
      });

      request.traceId = span.spanContext().traceId;
      request.spanId = span.spanContext().spanId;

      return next.handle().pipe(
        tap({
          next: () => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.setAttribute('http.status_code', 200);
            span.end();
          },
          error: (error: Error) => {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            span.recordException(error);
            span.end();
          },
        }),
      );
    });
  }
}
