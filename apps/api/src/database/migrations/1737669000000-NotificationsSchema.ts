import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationsSchema1737669000000 implements MigrationInterface {
  name = 'NotificationsSchema1737669000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_channel" AS ENUM ('email', 'sms', 'push', 'in_app')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_priority" AS ENUM ('low', 'normal', 'high', 'emergency')
    `);
    await queryRunner.query(`
      CREATE TYPE "push_subscription_platform" AS ENUM ('web', 'expo')
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "phone" character varying(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "organizations"
        ADD COLUMN IF NOT EXISTS "branding_primary_color" character varying(32)
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid,
        "name" character varying(120) NOT NULL,
        "channel" "notification_channel" NOT NULL,
        "subject" character varying(500),
        "body" text NOT NULL,
        "variables" jsonb NOT NULL DEFAULT '[]',
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_templates_org" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_templates_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_notification_templates_system_name_channel"
        ON "notification_templates" ("name", "channel")
        WHERE "org_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_notification_templates_org_name_channel"
        ON "notification_templates" ("org_id", "name", "channel")
        WHERE "org_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "tenant_id" uuid,
        "channel" "notification_channel" NOT NULL,
        "template_id" uuid,
        "subject" character varying(500),
        "body" text NOT NULL,
        "status" "notification_status" NOT NULL DEFAULT 'pending',
        "priority" "notification_priority" NOT NULL DEFAULT 'normal',
        "reference_type" character varying(100),
        "reference_id" uuid,
        "provider_message_id" character varying(255),
        "sent_at" TIMESTAMPTZ,
        "delivered_at" TIMESTAMPTZ,
        "read_at" TIMESTAMPTZ,
        "failure_reason" text,
        "retry_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_org" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_template" FOREIGN KEY ("template_id")
          REFERENCES "notification_templates"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_org_user_created"
        ON "notifications" ("org_id", "user_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_unread"
        ON "notifications" ("org_id", "user_id", "status")
        WHERE "channel" = 'in_app' AND "read_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_opt_outs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "channel" "notification_channel" NOT NULL,
        "opted_out_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_opt_outs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_opt_outs_org" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_opt_outs_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_notification_opt_outs_user_channel" UNIQUE ("org_id", "user_id", "channel")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_push_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "platform" "push_subscription_platform" NOT NULL,
        "endpoint" text NOT NULL,
        "keys" jsonb,
        "expo_push_token" character varying(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_push_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_push_subscriptions_org" FOREIGN KEY ("org_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_push_subscriptions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notification_push_subscriptions_user"
        ON "notification_push_subscriptions" ("org_id", "user_id")
        WHERE "is_active" = true
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_delivery_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "notification_id" uuid NOT NULL,
        "provider" character varying(50) NOT NULL,
        "event_type" character varying(100) NOT NULL,
        "external_id" character varying(255),
        "payload" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_delivery_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_delivery_events_notification"
          FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notification_delivery_events_notification"
        ON "notification_delivery_events" ("notification_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_provider_message_id"
        ON "notifications" ("provider_message_id")
        WHERE "provider_message_id" IS NOT NULL
    `);

    await this.seedSystemTemplates(queryRunner);
  }

  private async seedSystemTemplates(queryRunner: QueryRunner): Promise<void> {
    const templates: Array<{
      name: string;
      channel: string;
      subject: string | null;
      body: string;
      variables: string;
    }> = [
      {
        name: 'lease-signed',
        channel: 'email',
        subject: 'Lease signed — {{propertyName}}',
        body: '<p>Hello {{recipientName}},</p><p>Your lease for {{propertyName}} unit {{unitNumber}} has been signed.</p>',
        variables: '["recipientName","propertyName","unitNumber"]',
      },
      {
        name: 'lease-signed',
        channel: 'in_app',
        subject: 'Lease signed',
        body: 'Lease signed for {{propertyName}} · {{unitNumber}}',
        variables: '["propertyName","unitNumber"]',
      },
      {
        name: 'rent-due',
        channel: 'email',
        subject: 'Rent due {{dueDate}}',
        body: '<p>Hi {{recipientName}}, rent of {{amount}} is due on {{dueDate}}.</p>',
        variables: '["recipientName","amount","dueDate"]',
      },
      {
        name: 'rent-due',
        channel: 'sms',
        subject: null,
        body: 'Rent {{amount}} due {{dueDate}}. Reply STOP to opt out.',
        variables: '["amount","dueDate"]',
      },
      {
        name: 'payment-received',
        channel: 'email',
        subject: 'Payment received',
        body: '<p>We received your payment of {{amount}} on {{paidAt}}.</p>',
        variables: '["amount","paidAt"]',
      },
      {
        name: 'payment-received',
        channel: 'in_app',
        subject: 'Payment received',
        body: 'Payment of {{amount}} received',
        variables: '["amount"]',
      },
      {
        name: 'maintenance-update',
        channel: 'email',
        subject: 'Maintenance update: {{ticketTitle}}',
        body: '<p>Ticket <strong>{{ticketTitle}}</strong> is now {{status}}.</p>',
        variables: '["ticketTitle","status"]',
      },
      {
        name: 'maintenance-update',
        channel: 'in_app',
        subject: 'Maintenance update',
        body: '{{ticketTitle}} — {{status}}',
        variables: '["ticketTitle","status"]',
      },
      {
        name: 'maintenance-update',
        channel: 'push',
        subject: 'Maintenance update',
        body: '{{ticketTitle}}: {{status}}',
        variables: '["ticketTitle","status"]',
      },
      {
        name: 'maintenance-assigned',
        channel: 'email',
        subject: 'Work order assigned: {{ticketTitle}}',
        body: '<p>You have been assigned to {{ticketTitle}} ({{priority}}).</p>',
        variables: '["ticketTitle","priority"]',
      },
      {
        name: 'maintenance-assigned',
        channel: 'sms',
        subject: null,
        body: 'Assigned: {{ticketTitle}} ({{priority}}). STOP to opt out.',
        variables: '["ticketTitle","priority"]',
      },
      {
        name: 'late-fee-applied',
        channel: 'email',
        subject: 'Late fee applied',
        body: '<p>A late fee of {{amount}} was applied to your account.</p>',
        variables: '["amount"]',
      },
      {
        name: 'lease-expiry-warning-30d',
        channel: 'email',
        subject: 'Lease expiring in 30 days',
        body: '<p>Your lease for {{propertyName}} expires on {{endDate}} (30 days).</p>',
        variables: '["propertyName","endDate"]',
      },
      {
        name: 'lease-expiry-warning-7d',
        channel: 'email',
        subject: 'Lease expiring in 7 days',
        body: '<p>Your lease for {{propertyName}} expires on {{endDate}} (7 days).</p>',
        variables: '["propertyName","endDate"]',
      },
      {
        name: 'welcome',
        channel: 'email',
        subject: 'Welcome to {{orgName}}',
        body: '<p>Welcome {{recipientName}}! Your {{orgName}} account is ready.</p>',
        variables: '["recipientName","orgName"]',
      },
      {
        name: 'welcome',
        channel: 'in_app',
        subject: 'Welcome',
        body: 'Welcome to {{orgName}}!',
        variables: '["orgName"]',
      },
    ];

    for (const t of templates) {
      await queryRunner.query(
        `
        INSERT INTO "notification_templates" ("org_id", "name", "channel", "subject", "body", "variables")
        SELECT NULL, $1::varchar, $2::notification_channel, $3::text, $4::text, $5::jsonb
        WHERE NOT EXISTS (
          SELECT 1 FROM "notification_templates"
          WHERE "org_id" IS NULL AND "name" = $1::varchar AND "channel" = $2::notification_channel
        )
        `,
        [t.name, t.channel, t.subject, t.body, t.variables],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_delivery_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_push_subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_opt_outs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN IF EXISTS "branding_primary_color"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "push_subscription_platform"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_priority"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel"`);
  }
}
