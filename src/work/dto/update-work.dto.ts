import { IsInt, IsNumber, IsString, IsOptional, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for updating an existing work entry
 */
export class UpdateWorkDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @IsPositive({ message: 'Quantity must be positive' })
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Price per unit must be a number' })
  @IsPositive({ message: 'Price per unit must be positive' })
  pricePerUnit?: number;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  descriptionId?: number;
}
