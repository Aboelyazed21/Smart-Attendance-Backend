// ============================================================
// SCHEMA SELF-CHECK
// Creates additive helper tables IF NOT EXISTS on boot so a
// fresh deploy works without manual SQL. Never alters or
// drops existing tables/columns/data. Failures are logged
// and never crash the server (the Railway deploy must stay
// green even if this step cannot run).
// ============================================================

async function ensureSummaryLogTable(pool) {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS \`attendance_summary_notifications\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`student_id\` bigint(20) UNSIGNED NOT NULL,
      \`week_start\` date NOT NULL,
      \`channel\` varchar(20) NOT NULL DEFAULT 'whatsapp',
      \`status\` enum('sent','failed','skipped') NOT NULL DEFAULT 'skipped',
      \`provider_message_id\` varchar(100) DEFAULT NULL,
      \`error\` text DEFAULT NULL,
      \`sent_at\` datetime DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_student_week\` (\`student_id\`, \`week_start\`),
      KEY \`idx_week_status\` (\`week_start\`, \`status\`),
      CONSTRAINT \`fk_summary_notification_student\`
        FOREIGN KEY (\`student_id\`)
        REFERENCES \`student_profiles\` (\`id\`)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );
}

// Mirrors scripts/migrations/003_weekly_email_reports.sql so a
// fresh deploy works without manual SQL. Idempotent
// (IF NOT EXISTS / INSERT IGNORE); never touches existing data.
async function ensureWeeklyEmailTables(pool) {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS \`weekly_email_settings\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`key\` varchar(100) NOT NULL,
      \`value\` varchar(255) NOT NULL,
      \`updated_by\` bigint(20) UNSIGNED DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
      \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
        ON UPDATE current_timestamp(),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_setting_key\` (\`key\`),
      CONSTRAINT \`fk_weekly_email_settings_user\`
        FOREIGN KEY (\`updated_by\`)
        REFERENCES \`users\` (\`id\`)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );

  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS \`weekly_email_logs\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`student_id\` bigint(20) UNSIGNED NOT NULL,
      \`period_start\` date NOT NULL,
      \`period_end\` date NOT NULL,
      \`email\` varchar(255) DEFAULT NULL,
      \`status\` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
      \`sent_at\` datetime DEFAULT NULL,
      \`error\` text DEFAULT NULL,
      \`provider_message_id\` varchar(255) DEFAULT NULL,
      \`total_sessions\` int(11) NOT NULL DEFAULT 0,
      \`present_count\` int(11) NOT NULL DEFAULT 0,
      \`absent_count\` int(11) NOT NULL DEFAULT 0,
      \`attendance_rate\` decimal(5,2) DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
      \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
        ON UPDATE current_timestamp(),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_student_period\` (\`student_id\`, \`period_start\`, \`period_end\`),
      KEY \`idx_email_status\` (\`status\`),
      KEY \`idx_email_period\` (\`period_start\`, \`period_end\`),
      CONSTRAINT \`fk_weekly_email_log_student\`
        FOREIGN KEY (\`student_id\`)
        REFERENCES \`student_profiles\` (\`id\`)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );
}

async function ensureWeeklyEmailDefaults(pool) {
  await pool.query(
    `
    INSERT IGNORE INTO \`weekly_email_settings\` (\`key\`, \`value\`)
    VALUES
      ('enabled', 'true'),
      ('day', '5'),
      ('time', '18:00'),
      ('timezone', 'Africa/Cairo')
    `
  );
}

async function ensureWeeklyEmailPermissions(pool) {
  await pool.query(
    `
    INSERT IGNORE INTO \`permissions\` (\`name\`, \`description\`)
    VALUES
      ('weekly_reports.view', 'View weekly email report settings, status and logs'),
      ('weekly_reports.manage', 'Enable/disable and reschedule weekly email reports'),
      ('weekly_reports.send', 'Manually send weekly email reports'),
      ('weekly_reports.retry', 'Retry failed weekly email reports'),
      ('weekly_reports.test', 'Send weekly email report test emails')
    `
  );

  await pool.query(
    `
    INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
    SELECT r.id, p.id
    FROM \`roles\` r
    JOIN \`permissions\` p ON p.name LIKE 'weekly_reports.%'
    WHERE r.name = 'admin'
    `
  );
}

// Mirrors scripts/migrations/004_platform_settings.sql.
// Non-sensitive keys only — never secrets.
async function ensurePlatformSettings(pool) {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS \`platform_settings\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`setting_key\` varchar(100) NOT NULL,
      \`setting_value\` text,
      \`updated_by\` bigint(20) UNSIGNED DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
      \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
        ON UPDATE current_timestamp(),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_platform_key\` (\`setting_key\`),
      CONSTRAINT \`fk_platform_settings_user\`
        FOREIGN KEY (\`updated_by\`)
        REFERENCES \`users\` (\`id\`)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );

  await pool.query(
    `
    INSERT IGNORE INTO \`platform_settings\`
      (\`setting_key\`, \`setting_value\`)
    VALUES
      ('platformName', 'Attendify'),
      ('maintenanceMode', 'false'),
      ('maintenanceMessage', 'The platform is currently under maintenance. Please check back soon.'),
      ('maintenanceUntil', NULL)
    `
  );

  await pool.query(
    `
    INSERT IGNORE INTO \`permissions\` (\`name\`, \`description\`)
    VALUES
      ('settings.view', 'View platform settings'),
      ('settings.manage', 'Manage platform name and settings'),
      ('maintenance.manage', 'Manage maintenance mode')
    `
  );

  await pool.query(
    `
    INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
    SELECT r.id, p.id
    FROM \`roles\` r
    JOIN \`permissions\` p
      ON p.name IN ('settings.view', 'settings.manage', 'maintenance.manage')
    WHERE r.name = 'admin'
    `
  );
}

async function ensureSchema(pool, logger = console) {
  try {
    await ensureSummaryLogTable(pool);
    await ensureWeeklyEmailTables(pool);
    await ensureWeeklyEmailDefaults(pool);
    await ensureWeeklyEmailPermissions(pool);

    logger.log(
      "Schema self-check: attendance_summary_notifications ready."
    );

    logger.log(
      "Schema self-check: weekly email report tables ready."
    );

    await ensurePlatformSettings(pool);

    logger.log(
      "Schema self-check: platform settings ready."
    );

    await ensureNotificationsTable(pool);

    logger.log(
      "Schema self-check: notifications ready."
    );
  } catch (error) {
    logger.log(
      "Schema self-check skipped: " +
        (error.message ||
          "database is not ready yet.")
    );
  }
}

// ============================================================
// NOTIFICATIONS
// Unified in-app notification center for all roles.
// user_id NULL + target_role set  => visible to every user
// with that role. Direct rows always carry user_id.
// ============================================================

async function ensureNotificationsTable(pool) {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` bigint(20) UNSIGNED DEFAULT NULL,
      \`target_role\` varchar(50) DEFAULT NULL,
      \`type\` varchar(50) NOT NULL DEFAULT 'general',
      \`title\` varchar(255) NOT NULL,
      \`message\` text DEFAULT NULL,
      \`link\` varchar(255) DEFAULT NULL,
      \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
      \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (\`id\`),
      KEY \`idx_notifications_user\` (\`user_id\`, \`is_read\`),
      KEY \`idx_notifications_role\` (\`target_role\`, \`is_read\`),
      CONSTRAINT \`fk_notifications_user\`
        FOREIGN KEY (\`user_id\`)
        REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );
}

module.exports = {
  ensureSchema,
};
