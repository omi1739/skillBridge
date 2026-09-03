import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsArray, IsBoolean, IsIn } from 'class-validator';

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

export class AddJobSourceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @IsIn(['API', 'RSS', 'XML_FEED', 'PARTNER_FEED', 'EMPLOYER', 'PERMITTED_CRAWLER'])
  sourceType?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['API', 'PARTNER_FEED', 'MANUAL_CURATED'])
  accessMethod!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsString()
  feedUrl?: string;

  @IsOptional()
  @IsString()
  careerUrl?: string;

  @IsOptional()
  @IsBoolean()
  crawlAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  redistributionAllowed?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['GRANTED', 'PENDING', 'DENIED', 'NOT_REQUIRED'])
  permissionStatus?: string;

  @IsOptional()
  @IsString()
  permissionReference?: string;

  @IsOptional()
  @IsString()
  licenseNotes?: string;
}

export class UpdateJobSourceDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['GRANTED', 'PENDING', 'DENIED', 'NOT_REQUIRED'])
  permissionStatus?: string;

  @IsOptional()
  @IsBoolean()
  crawlAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  redistributionAllowed?: boolean;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsString()
  feedUrl?: string;

  @IsOptional()
  @IsString()
  careerUrl?: string;

  @IsOptional()
  @IsString()
  permissionReference?: string;

  @IsOptional()
  @IsString()
  licenseNotes?: string;
}
