import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { TenantMiddleware } from './tenant.middleware';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
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
  ],
  providers: [TenantMiddleware],
  exports: [JwtModule, TenantMiddleware],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth', method: RequestMethod.ALL },
        { path: 'auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/health', method: RequestMethod.ALL },
        { path: 'api/health/(.*)', method: RequestMethod.ALL },
        { path: 'api/docs', method: RequestMethod.ALL },
        { path: 'api/docs/(.*)', method: RequestMethod.ALL },
        {
          path: 'webhooks/stripe',
          method: RequestMethod.POST,
        },
        {
          path: 'payments/webhooks/stripe',
          method: RequestMethod.POST,
        },
        {
          path: 'notifications/webhooks/sendgrid',
          method: RequestMethod.POST,
        },
        {
          path: 'notifications/webhooks/twilio',
          method: RequestMethod.POST,
        },
        {
          path: 'webhooks/zoom',
          method: RequestMethod.POST,
        },
        { path: 'admin/queues', method: RequestMethod.ALL },
        { path: 'admin/queues/(.*)', method: RequestMethod.ALL },
        { path: 'metrics/queues', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
