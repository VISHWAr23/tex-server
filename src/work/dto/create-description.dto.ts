import { IsString, MinLength, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';
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

  @IsOptional()
  @IsNumber({}, { message: 'Price per unit must be a valid number' })
  @Min(0, { message: 'Price per unit must be greater than or equal to 0' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  pricePerUnit?: number;
}
