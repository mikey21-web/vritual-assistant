import { IsOptional, IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class UpdateAgentConfigDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  toneStyle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualificationQuestions?: string[];

  @IsOptional()
  @IsString()
  customPrompt?: string;
}
