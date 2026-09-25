-- ============================================================
-- 004: platform-wide settings (platform name + maintenance)
-- Additive only. Never alters existing tables/data.
--
-- platform_settings: single source of truth for public
-- platform configuration. Only non-sensitive keys live
-- here (platformName, maintenanceMode, maintenanceMessage,
-- maintenanceUntil). NEVER store secrets in this table.
-- (The server also self-creates this table on boot via
-- src/config/ensureSchema.js.)
-- Run once against the database, e.g.:
--   mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < 004_platform_settings.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_platform_key` (`setting_key`),
  CONSTRAINT `fk_platform_settings_user`
    FOREIGN KEY (`updated_by`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Defaults preserve current behavior until an Admin
-- changes them. INSERT IGNORE keeps admin values on re-runs.
INSERT IGNORE INTO `platform_settings` (`setting_key`, `setting_value`) VALUES
('platformName', 'Attendify'),
('maintenanceMode', 'false'),
('maintenanceMessage', 'The platform is currently under maintenance. Please check back soon.'),
('maintenanceUntil', NULL);

-- Granular permissions for platform settings.
INSERT IGNORE INTO `permissions` (`name`, `description`) VALUES
('settings.view', 'View platform settings'),
('settings.manage', 'Manage platform name and settings'),
('maintenance.manage', 'Manage maintenance mode');

-- Grant platform settings permissions to the admin role.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permissions` p ON p.name IN ('settings.view', 'settings.manage', 'maintenance.manage')
WHERE r.name = 'admin';
