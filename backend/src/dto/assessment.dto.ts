import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsIn,
  IsNumber,
  IsObject
} from 'class-validator';

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

// ---- Skill-centric assessment DTOs ----

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  easyCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  mediumCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  hardCount?: number;
}

export class SubmitAnswerDto {
  @IsNotEmpty()
  answer!: any;
}

export class SubmitAnswerByIdDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsNotEmpty()
  answer!: any;
}

export class GenerateQuestionsDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsIn(DIFFICULTIES)
  difficulty!: 'easy' | 'medium' | 'hard';

  @IsIn(['MCQ', 'multiple_select', 'true_false', 'code_output'])
  questionType!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  count!: number;
}

export class UpdateQuestionStatusDto {
  @IsString()
  @IsIn(['pending_review', 'approved', 'rejected'])
  status!: string;
}
