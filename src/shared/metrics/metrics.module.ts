import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule as NestPrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  imports: [
    NestPrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'api_unidades_',
        },
      },
    }),
  ],
  providers: [
    MetricsService,
    MetricsInterceptor,
    makeCounterProvider({
      name: 'users_created_total',
      help: 'Total number of users created',
      labelNames: ['status'],
    }),

    makeCounterProvider({
      name: 'groups_created_total',
      help: 'Total number of groups created',
      labelNames: ['status'],
    }),

    makeCounterProvider({
      name: 'user_group_associations_total',
      help: 'Total number of user-group associations',
      labelNames: ['action', 'status'],
    }),

    makeHistogramProvider({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'entity'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    }),

    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),

    makeGaugeProvider({
      name: 'database_connections_active',
      help: 'Number of active database connections',
    }),

    makeGaugeProvider({
      name: 'total_users',
      help: 'Total number of users in the system',
    }),

    makeGaugeProvider({
      name: 'total_groups',
      help: 'Total number of groups in the system',
    }),

    makeCounterProvider({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'endpoint'],
    }),
  ],
  exports: [NestPrometheusModule, MetricsService, MetricsInterceptor],
})
export class MetricsModule {}
