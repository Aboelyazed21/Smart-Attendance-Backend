-- ============================================================
-- 002: weekly WhatsApp summary delivery log
-- Additive only. Prevents sending the same weekly summary
-- twice via UNIQUE KEY (student_id, week_start).
-- Run once against the database, e.g.:
--   mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < 002_attendance_summary_notifications.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `attendance_summary_notifications` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `week_start` date NOT NULL,
  `channel` varchar(20) NOT NULL DEFAULT 'whatsapp',
  `status` enum('sent','failed','skipped') NOT NULL DEFAULT 'skipped',
  `provider_message_id` varchar(100) DEFAULT NULL,
  `error` text DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_student_week` (`student_id`, `week_start`),
  KEY `idx_week_status` (`week_start`, `status`),
  CONSTRAINT `fk_summary_notification_student`
    FOREIGN KEY (`student_id`)
    REFERENCES `student_profiles` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
