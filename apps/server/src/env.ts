/// <reference types="@cloudflare/workers-types" />

// Local environment for Bun or Node

// Types have been stripped of Cloudflare references
export type ZeroEnv = {
  SHARD_REGISTRY: DurableObjectNamespace<any>;
  ZERO_DB: DurableObjectNamespace<any>;
  ZERO_AGENT: DurableObjectNamespace<any>;
  WORKFLOW_RUNNER: DurableObjectNamespace<any>;
  THREAD_SYNC_WORKER: DurableObjectNamespace<any>;
  SYNC_THREADS_WORKFLOW: any;
  SYNC_THREADS_COORDINATOR_WORKFLOW: any;
  HYPERDRIVE: any;
  ZERO_DRIVER: DurableObjectNamespace<any>;

  pending_emails_status: any;
  pending_emails_payload: any;
  scheduled_emails: any;
  send_email_queue: any;
  snoozed_emails: any;
  gmail_sub_age: any;
  subscribe_queue: any;
  AI: any;
  gmail_history_id: any;
  gmail_processing_threads: any;
  subscribed_accounts: any;
  connection_labels: any;
  prompts_storage: any;
  NODE_ENV: 'local' | 'development' | 'production';
  DISABLE_CALLS: 'true' | '';
  DROP_AGENT_TABLES: 'false';
  THREAD_SYNC_MAX_COUNT: '5' | '20' | '10';
  THREAD_SYNC_LOOP: 'false' | 'true';
  DISABLE_WORKFLOWS: 'true';
  AUTORAG_ID: '';
  USE_OPENAI: 'true';
  CLOUDFLARE_ACCOUNT_ID: '';
  CLOUDFLARE_API_TOKEN: '';
  VITE_PUBLIC_APP_URL: string;
  DATABASE_URL: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  COOKIE_DOMAIN: string;
  BETTER_AUTH_TRUSTED_ORIGINS: string;
  VITE_PUBLIC_BACKEND_URL: string;
  REDIS_URL: string;
  REDIS_TOKEN: string;
  OPENAI_API_KEY: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  AUTUMN_SECRET_KEY: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  VOICE_SECRET: string;
  OPENAI_MODEL: string;
  GOOGLE_S_ACCOUNT: string;
  THREADS_BUCKET: any;
  thread_queue: any;
  VECTORIZE: any;
  VECTORIZE_MESSAGE: any;
  DEV_PROXY: string;
  MEET_AUTH_HEADER: string;
  MEET_API_URL: string;
  ENABLE_MEET: 'true' | 'false';
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_HEADERS?: string;
  OTEL_SERVICE_NAME?: string;
  DD_API_KEY: string;
  DD_APP_KEY: string;
  DD_SITE: string;
};

const env = process.env as unknown as ZeroEnv;
export { env };
