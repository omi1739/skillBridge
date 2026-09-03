import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsArray } from 'class-validator';

export class AddAliasDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @IsString()
  @IsNotEmpty()
  alias!: string;
}

export class UpdateRoleWeightsDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  roleWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  marketDemandFrequency?: number;
}

export class AddQuestionDto {
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsString()
  @IsNotEmpty()
  correctAnswer!: string;

  @IsString()
  @IsNotEmpty()
  subSkill!: string;

  @IsOptional()
  @IsString()
  codeSnippet?: string;

  @IsOptional()
  @IsString()
  questionType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsNumber()
  points?: number;
}
