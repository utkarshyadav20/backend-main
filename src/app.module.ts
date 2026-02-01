import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './shared/database/database.module'; // consistent extension if possible, but let's just add ProjectModule
import { ProjectModule } from './modules/project/project.module';
import { FigmaModule } from './modules/figma/figma.module';

import { CompareModule } from './modules/compare/compare.module';

import { ResultModule } from './modules/result/result.module';

import { ScreenshotModule } from './modules/screenshot/screenshot.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ProjectModule,
    FigmaModule,
    CompareModule,
    ResultModule,
    ScreenshotModule,
    AuthModule,
    UsersModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
