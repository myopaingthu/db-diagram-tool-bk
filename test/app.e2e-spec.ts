import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let appController: AppController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    appController = app.get<AppController>(AppController);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should bootstrap app and resolve root handler', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });
});
