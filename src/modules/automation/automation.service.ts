
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAutomationCodeDto } from './dto/create-automation-code.dto';
import { AutomationCode } from '../../shared/entity/automation-code.entity';

@Injectable()
export class AutomationService {

    async create(createDto: CreateAutomationCodeDto) {
        const { projectId, buildId, automationCode, variables, screenOrder } = createDto;

        // Check if an entry exists for this projectId and buildId
        let entry = await AutomationCode.findOne({
            where: { projectId, buildId }
        });

        if (entry) {
            // Update existing entry
            if (automationCode) {
                entry.setDataValue('automationCode', automationCode);
                // Explicitly mark as changed for JSON types
            }
            if (variables) {
                entry.setDataValue('variables', variables);
            }
            if (screenOrder) {
                entry.setDataValue('screenOrder', screenOrder);
            }
            await entry.save();
            await entry.reload();
            return { message: 'Automation code updated successfully', data: entry };
        } else {
            entry = await AutomationCode.create({
                projectId,
                buildId,
                automationCode,
                variables,
                screenOrder
            } as any);
            return { message: 'Automation code saved successfully', data: entry };
        }
    }

    async findOne(projectId: string, buildId: string) {
        if (!projectId || !buildId) {
            throw new NotFoundException('Project ID and Build ID are required');
        }

        const entry = await AutomationCode.findOne({
            where: { projectId, buildId }
        });

        if (!entry) {
            throw new NotFoundException('Automation code not found for this build');
        }

        return entry;
    }
}
