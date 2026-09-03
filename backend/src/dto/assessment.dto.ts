import { Type } from 'class-transformer';
import { IsOptional, IsString, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';

export class AssessmentAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsString()
  @IsNotEmpty()
  selectedAnswer!: string;
}

export class SubmitAssessmentDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers?: AssessmentAnswerDto[];
}
