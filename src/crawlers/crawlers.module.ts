/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CrawlersController } from './crawlers.controller';
import { CrawlersService } from './crawlers.service';

@Module({
  controllers: [CrawlersController],
  providers: [CrawlersService],
})
export class CrawlersModule {}
