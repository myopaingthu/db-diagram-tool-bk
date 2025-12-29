import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { CONFIG } from "@src/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  app.enableCors({
    origin: CONFIG.CORS_ORIGIN ? CONFIG.CORS_ORIGIN.split(",") : [],
    credentials: true,
  });
  await app.listen(CONFIG.PORT);
  console.log(`Application is running on: http://localhost:${CONFIG.PORT}`);
}
bootstrap();
