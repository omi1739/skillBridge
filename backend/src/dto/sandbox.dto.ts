import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RunSqlDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class RunCodeDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
