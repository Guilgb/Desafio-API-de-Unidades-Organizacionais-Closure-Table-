import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from '@shared/metrics/metrics.interceptor';
import { MetricsModule } from '@shared/metrics/metrics.module';
import { DatabaseModule } from '@shared/modules/database/database.module';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { LoggingInterceptor } from '@shared/modules/winston/winston.interceptor';
import { WinstonModule } from '@shared/modules/winston/winston.module';
import { TracingInterceptor } from '@shared/tracing/tracing.interceptor';
import { TracingModule } from '@shared/tracing/tracing.module';
import { GroupsModule } from './modules/groups/groups.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule,
    TracingModule,
    MetricsModule,
    DatabaseModule,
    UsersModule,
    GroupsModule,
    NodesModule,
  ],
  providers: [
    WinstonLoggerService,
    TracingInterceptor,
    MetricsInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
