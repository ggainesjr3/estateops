import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMembership } from '../modules/organization-memberships/entities/organization-membership.entity';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMembership])],
  providers: [RolesGuard],
  exports: [RolesGuard, TypeOrmModule],
})
export class AuthCoreModule {}
