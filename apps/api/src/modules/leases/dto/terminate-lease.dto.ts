import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class TerminateLeaseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
