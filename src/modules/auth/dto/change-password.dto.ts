import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
    @IsString()
    @MinLength(6)
    oldPassword: string;
    newPassword: string;
  }