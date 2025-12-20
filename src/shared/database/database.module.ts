import { Module, Global } from '@nestjs/common';
import { databaseProviders } from './database.providers.js';

@Global()
@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
