import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, IsNumber, Max, Min } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName!: string;

  @IsOptional()
  @IsString()
  targetRoleId?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password!: string;
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
