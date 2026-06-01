import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMembership } from './entities/organization-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMembership])],
  exports: [TypeOrmModule],
})
export class OrganizationMembershipsModule {}
