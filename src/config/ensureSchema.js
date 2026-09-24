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

async function ensureSchema(pool, logger = console) {
  try {
    await ensureSummaryLogTable(pool);

    logger.log(
      "Schema self-check: attendance_summary_notifications ready."
    );
  } catch (error) {
    logger.log(
      "Schema self-check skipped: " +
        (error.message ||
          "database is not ready yet.")
    );
  }
}

module.exports = {
  ensureSchema,
};
