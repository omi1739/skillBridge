import { IsString, IsNotEmpty } from 'class-validator';

export class RunSqlDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  query!: string;
}

export class RunCodeDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
