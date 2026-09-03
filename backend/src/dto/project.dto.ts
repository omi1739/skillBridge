import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl } from 'class-validator';

export class ProjectSubmissionDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUrl({ require_protocol: true }, { message: 'repoUrl must be a valid URL.' })
  repoUrl!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primarySkills?: string[];
}
