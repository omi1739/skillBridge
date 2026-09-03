import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, IsNumber, Max, Min, IsIn, Matches } from 'class-validator';

export const CURRENT_STATUSES = ['STUDENT', 'JOB_HOLDER', 'JOB_SEEKER', 'OTHER'] as const;
export type CurrentStatusValue = (typeof CURRENT_STATUSES)[number];

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one number.'
  })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Please confirm your password.' })
  confirmPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName!: string;

  @IsOptional()
  @IsString()
  targetRoleId?: string;

  @IsOptional()
  @IsIn(CURRENT_STATUSES as unknown as string[], { message: 'Please choose a valid current status.' })
  currentStatus?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password!: string;
}

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty({ message: 'idToken is required.' })
  idToken!: string;

  @IsOptional()
  @IsIn(CURRENT_STATUSES as unknown as string[], { message: 'Please choose a valid current status.' })
  currentStatus?: string;
}

export class DeclareSkillDto {
  @IsString()
  @IsNotEmpty({ message: 'skillId is required.' })
  skillId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  proficiencyScore?: number;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  targetRoleId?: string;

  @IsOptional()
  @IsString()
  githubUrl?: string;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
