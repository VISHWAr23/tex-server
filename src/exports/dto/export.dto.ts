import { IsString, IsNumber, IsDateString, IsOptional, Min, MinLength, IsBoolean } from 'class-validator';

/**
 * DTO for creating an export entry
 */
export class CreateExportDto {
  @IsDateString()
  date: string;

  @IsString()
  @MinLength(1, { message: 'Company name is required' })
  companyName: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsNumber()
  @Min(0.01, { message: 'Price per unit must be greater than 0' })
  pricePerUnit: number;

  @IsOptional()
  @IsNumber()
  descriptionId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  updateDescriptionPrice?: boolean; // If true, update WorkDescription pricePerUnit
}

/**
 * DTO for updating an export entry
 */
export class UpdateExportDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  pricePerUnit?: number;

  @IsOptional()
  @IsNumber()
  descriptionId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  updateDescriptionPrice?: boolean;
}

/**
 * DTO for querying exports
 */
export class ExportQueryDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
