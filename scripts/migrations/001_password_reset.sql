-- ============================================================
-- Migration 001: password reset support
-- Adds single-use, expiring reset-token fields to users.
--
-- Run against an EXISTING database with:
--   mysql -h <host> -u <user> -p <db> < 001_password_reset.sql
--
-- Fresh installs already include these columns in
-- scripts/smart_attendance_db.sql — do NOT run this file
-- on a freshly imported database.
-- ============================================================

ALTER TABLE `users`
  ADD COLUMN `password_reset_token_hash` varchar(255) DEFAULT NULL
    AFTER `password_hash`,
  ADD COLUMN `password_reset_expires_at` datetime DEFAULT NULL
    AFTER `password_reset_token_hash`;
