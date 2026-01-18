import { IsString, IsObject } from 'class-validator';

export class UpdateModelResultItemDto {
    @IsString()
    itemId: string;

    @IsObject()
    updates: Record<string, any>; // Key-value pairs to update
}
