-- ============================================================
-- 005: unified in-app notification center (all roles)
-- Additive only. Never alters existing tables/data.
--
-- notifications: direct rows carry user_id; role broadcasts
-- use user_id NULL + target_role ('admin', 'lecturer',
-- 'student', ...). Readers see rows where user_id matches
-- them OR (user_id IS NULL AND target_role matches theirs).
-- (The server also self-creates this table on boot via
-- src/config/ensureSchema.js.)
-- Run once against the database, e.g.:
--   mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < 005_notifications.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `target_role` varchar(50) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'general',
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`, `is_read`),
  KEY `idx_notifications_role` (`target_role`, `is_read`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
