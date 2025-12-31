import { IsInt, IsNumber, IsString, IsDateString, Min, IsPositive, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for creating a new work entry
 * Date format follows ISO 8601 standard (YYYY-MM-DD)
 */
export class CreateWorkDto {
  @IsDateString({}, { message: 'Date must be in ISO 8601 format (YYYY-MM-DD)' })
  date: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @IsPositive({ message: 'Quantity must be positive' })
  quantity: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Price per unit must be a number' })
  @IsPositive({ message: 'Price per unit must be positive' })
  pricePerUnit: number;

  @IsString({ message: 'Description is required' })
  @Transform(({ value }) => value?.trim())
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  descriptionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'User ID must be an integer' })
  userId?: number;
}
