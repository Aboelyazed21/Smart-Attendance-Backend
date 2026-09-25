-- ============================================================
-- 003: weekly email attendance reports (Resend)
-- Additive only. Never alters existing tables/data.
--
-- weekly_email_settings: admin-configurable schedule
--   (DB values override WEEKLY_REPORT_* env defaults).
-- weekly_email_logs: per-student send log. UNIQUE KEY
--   (student_id, period_start, period_end) prevents sending
--   the same weekly report twice.
-- weekly_reports.* permissions granted to the admin role.
-- (The server also self-creates these tables on boot via
-- src/config/ensureSchema.js, so this file mainly documents
-- the schema and covers manual/offline setups.)
-- Run once against the database, e.g.:
--   mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < 003_weekly_email_reports.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `weekly_email_settings` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` varchar(255) NOT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_setting_key` (`key`),
  CONSTRAINT `fk_weekly_email_settings_user`
    FOREIGN KEY (`updated_by`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `weekly_email_logs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  `sent_at` datetime DEFAULT NULL,
  `error` text DEFAULT NULL,
  `provider_message_id` varchar(255) DEFAULT NULL,
  `total_sessions` int(11) NOT NULL DEFAULT 0,
  `present_count` int(11) NOT NULL DEFAULT 0,
  `absent_count` int(11) NOT NULL DEFAULT 0,
  `attendance_rate` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_student_period` (`student_id`, `period_start`, `period_end`),
  KEY `idx_email_status` (`status`),
  KEY `idx_email_period` (`period_start`, `period_end`),
  CONSTRAINT `fk_weekly_email_log_student`
    FOREIGN KEY (`student_id`)
    REFERENCES `student_profiles` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default schedule: enabled, Friday (5), 18:00, Africa/Cairo.
-- INSERT IGNORE keeps admin-configured values on re-runs.
INSERT IGNORE INTO `weekly_email_settings` (`key`, `value`) VALUES
('enabled', 'true'),
('day', '5'),
('time', '18:00'),
('timezone', 'Africa/Cairo');

-- Granular admin permissions for the weekly email system.
INSERT IGNORE INTO `permissions` (`name`, `description`) VALUES
('weekly_reports.view', 'View weekly email report settings, status and logs'),
('weekly_reports.manage', 'Enable/disable and reschedule weekly email reports'),
('weekly_reports.send', 'Manually send weekly email reports'),
('weekly_reports.retry', 'Retry failed weekly email reports'),
('weekly_reports.test', 'Send weekly email report test emails');

-- Grant all weekly email permissions to the admin role.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.name LIKE 'weekly_reports.%'
WHERE r.name = 'admin';
