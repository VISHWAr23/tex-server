import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for creating a new work description
 * Descriptions are stored in a separate table for reuse across workers
 */
export class CreateDescriptionDto {
  @IsString({ message: 'Description text is required' })
  @MinLength(2, { message: 'Description must be at least 2 characters' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  text: string;
}
