import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Challange API de unidades organizacionais - Closure Table')
    .setDescription(
      'API para a gestão de unidades organizacionais utilizando a técnica Closure Table',
    )
    .setVersion('1.0')
    .addTag('Autenticação', 'Operações de login e autenticação')
    .addTag('Usuários', 'Operações relacionadas aos usuários')
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

  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📚 Documentação disponível em http://localhost:${port}/api`);
}

bootstrap();
