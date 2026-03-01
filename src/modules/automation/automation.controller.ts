import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateAutomationCodeDto } from './dto/create-automation-code.dto';
import { AutomationService } from './automation.service';

@Controller('automation')
export class AutomationController {

    constructor(private readonly automationService: AutomationService) { }

    @Post('save')
    async create(@Body() createDto: CreateAutomationCodeDto) {
        return await this.automationService.create(createDto);
    }

    @Get('fetch')
    async findOne(
        @Query('projectId') projectId: string,
        @Query('buildId') buildId: string
    ) {
        return await this.automationService.findOne(projectId, buildId);
    }
}
