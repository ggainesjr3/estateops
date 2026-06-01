import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import jwtConfig from '../../config/jwt.config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { AuthProvider } from './entities/auth-provider.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organization-memberships/entities/organization-membership.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthCoreModule } from '../../auth/auth-core.module';
import { JwtAccessStrategy } from '../../auth/strategies/jwt-access.strategy';
import { GoogleStrategy } from '../../auth/strategies/google.strategy';
import { CsrfGuard } from './guards/csrf.guard';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: (configService.get<string>('jwt.expiresIn') ?? '15m') as `${number}m`,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      OrganizationMembership,
      AuthProvider,
      RefreshToken,
    ]),
    AuditLogsModule,
    AuthCoreModule,
  ],
  controllers: [AuthController],
  providers: [
    TokenService,
    AuthService,
    CsrfGuard,
    JwtAccessStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
