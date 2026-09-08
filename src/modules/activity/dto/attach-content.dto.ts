import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AttachContentDto {
  @IsUUID()
  contentId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
