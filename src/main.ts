import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from '@shared/filters/all-exceptions.filter';
import { DomainErrorFilter } from '@shared/filters/domain-error.filter';
import { MetricsInterceptor } from '@shared/metrics/metrics.interceptor';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { startTracing } from '@shared/tracing/otel.config';
import { TracingInterceptor } from '@shared/tracing/tracing.interceptor';
import { AppModule } from './app.module';

// Initialize OpenTelemetry before anything else
startTracing();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(WinstonLoggerService);

  // Global filters
  app.useGlobalFilters(
    new DomainErrorFilter(),
    new AllExceptionsFilter(logger),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    app.get(TracingInterceptor),
    app.get(MetricsInterceptor),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API de Unidades Organizacionais - Closure Table')
    .setDescription(
      'API para a gestão de unidades organizacionais utilizando a técnica Closure Table com observabilidade completa (OpenTelemetry, Prometheus, Jaeger)',
    )
    .setVersion('1.0')
    .addTag('Autenticação', 'Operações de login e autenticação')
    .addTag('Usuários', 'Operações relacionadas aos usuários')
    .addTag('Grupos', 'Operações relacionadas aos grupos')
    .addTag('Métricas', 'Endpoint de métricas Prometheus')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Servidor rodando na porta ${port}`, 'Bootstrap');
  logger.log(
    `📚 Documentação disponível em http://localhost:${port}/api`,
    'Bootstrap',
  );
  logger.log(
    `📊 Métricas disponíveis em http://localhost:${port}/metrics`,
    'Bootstrap',
  );
  logger.log(`🔍 Jaeger UI disponível em http://localhost:16686`, 'Bootstrap');
  logger.log(`📈 Prometheus disponível em http://localhost:9090`, 'Bootstrap');
  logger.log(`🔎 Kibana disponível em http://localhost:5601`, 'Bootstrap');
}

bootstrap();
