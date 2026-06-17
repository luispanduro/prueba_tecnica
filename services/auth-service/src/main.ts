import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createGlobalValidationPipe } from '@user-management/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Global validation pipe with standardized error format
  app.useGlobalPipes(createGlobalValidationPipe());

  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
