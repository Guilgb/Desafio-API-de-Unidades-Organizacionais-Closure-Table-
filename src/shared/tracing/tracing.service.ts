import { Injectable } from '@nestjs/common';
import {
  AttributeValue,
  Attributes,
  Span,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';

@Injectable()
export class TracingService {
  private readonly tracer = trace.getTracer('api-unidades-organizacionais');

  async withSpan<T>(
    spanName: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Attributes,
  ): Promise<T> {
    return this.tracer.startActiveSpan(spanName, async (span: Span) => {
      try {
        if (attributes) {
          span.setAttributes(attributes);
        }

        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err.message,
        });
        span.recordException(err);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  addEvent(name: string, attributes?: Attributes) {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  setAttribute(key: string, value: AttributeValue) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  }

  getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }

  getCurrentSpanId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().spanId;
  }
}
