import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createGlobalValidationPipe } from '@user-management/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(createGlobalValidationPipe());

  const port = process.env.PORT || 3005;
  await app.listen(port);
}
bootstrap();
