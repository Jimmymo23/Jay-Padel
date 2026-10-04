declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    JAY_PADEL_ADMIN_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
