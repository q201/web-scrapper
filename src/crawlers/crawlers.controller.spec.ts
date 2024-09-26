/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { CrawlersController } from './crawlers.controller';

describe('CrawlersController', () => {
  let controller: CrawlersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrawlersController],
    }).compile();

    controller = module.get<CrawlersController>(CrawlersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
