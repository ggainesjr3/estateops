import { ApiProperty } from '@nestjs/swagger';
import { LeaseSignerRole } from '@estateops/shared';
import { IsEnum } from 'class-validator';

export class SignLeaseDto {
  @ApiProperty({ enum: LeaseSignerRole })
  @IsEnum(LeaseSignerRole)
  role!: LeaseSignerRole;
}
