import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import postgres from 'postgres';

/** Injection token of the postgres.js client (`@Inject(SQL) sql: Sql`). */
export const SQL = Symbol('SQL');
export type Sql = postgres.Sql;

// The API reads Supabase Postgres through its session pooler (ADR-0003); the schema lives in supabase/migrations.
@Global()
@Module({
  providers: [
    {
      provide: SQL,
      inject: [ConfigService],
      // One pool for the whole app. Small: the free instance has 512 MB and the Supabase session pooler caps the
      // connections all services share; idle connections close so a quiet API holds none.
      useFactory: (config: ConfigService): Sql =>
        postgres(config.getOrThrow<string>('DATABASE_URL'), {
          max: 5,
          idle_timeout: 20,
          connect_timeout: 10,
        }),
    },
  ],
  exports: [SQL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end();
  }
}
