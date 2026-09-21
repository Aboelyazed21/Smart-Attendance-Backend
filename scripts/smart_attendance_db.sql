-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 21, 2026 at 10:34 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smart_attendance_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance_events`
--

CREATE TABLE `attendance_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `session_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('present','absent','late','excused') NOT NULL DEFAULT 'present',
  `source` enum('qr','manual','system','correction') DEFAULT 'qr',
  `validation_status` enum('accepted','rejected','expired','duplicate','invalid','wrong_session','not_enrolled','too_early','too_late') DEFAULT 'accepted',
  `scanned_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `qr_version` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_flags`
--

CREATE TABLE `attendance_flags` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED DEFAULT NULL,
  `session_id` bigint(20) UNSIGNED DEFAULT NULL,
  `flag_type` varchar(100) NOT NULL,
  `severity` enum('low','medium','high') DEFAULT 'medium',
  `reason` text NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `is_resolved` tinyint(1) DEFAULT 0,
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_sessions`
--

CREATE TABLE `attendance_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `section_id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `opened_by` bigint(20) UNSIGNED DEFAULT NULL,
  `session_date` date NOT NULL,
  `scheduled_start` time DEFAULT NULL,
  `scheduled_end` time DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `status` enum('scheduled','active','closed','cancelled') DEFAULT 'scheduled',
  `qr_secret_hash` varchar(255) DEFAULT NULL,
  `qr_version` int(11) DEFAULT 1,
  `qr_expires_at` datetime DEFAULT NULL,
  `qr_rotation_seconds` int(11) DEFAULT 10,
  `allow_late_minutes` int(11) DEFAULT 15,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendance_sessions`
--

INSERT INTO `attendance_sessions` (`id`, `section_id`, `room_id`, `opened_by`, `session_date`, `scheduled_start`, `scheduled_end`, `actual_start`, `actual_end`, `status`, `qr_secret_hash`, `qr_version`, `qr_expires_at`, `qr_rotation_seconds`, `allow_late_minutes`, `created_at`, `updated_at`) VALUES
(1, 6, 2, 43, '2026-09-01', '04:20:00', '02:19:00', '2026-09-21 01:20:10', '2026-09-21 01:54:05', 'closed', NULL, 11, '2026-09-21 01:54:06', 10, 15, '2026-09-20 22:19:05', '2026-09-20 22:54:05');

-- --------------------------------------------------------

--
-- Stand-in structure for view `attendance_summary`
-- (See below for the actual view)
--
CREATE TABLE `attendance_summary` (
`student_id` bigint(20) unsigned
,`student_code` varchar(50)
,`student_name` varchar(201)
,`total_attendance` bigint(21)
,`present_count` decimal(22,0)
,`late_count` decimal(22,0)
,`absent_count` decimal(22,0)
,`excused_count` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `audit_events`
--

CREATE TABLE `audit_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `actor_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `before_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before_data`)),
  `after_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_data`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `correction_requests`
--

CREATE TABLE `correction_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `attendance_event_id` bigint(20) UNSIGNED DEFAULT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `requested_status` enum('present','absent','late','excused') NOT NULL,
  `reason` text NOT NULL,
  `evidence_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewer_comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `course_code` varchar(50) NOT NULL,
  `course_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `credit_hours` int(11) DEFAULT 3,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `course_code`, `course_name`, `description`, `credit_hours`, `created_at`, `updated_at`) VALUES
(1, 'CS201', 'Data Structures', 'Data Structures course', 3, '2026-09-19 16:04:02', '2026-09-19 16:04:02'),
(2, 'CS202', 'Operating Systems', 'Operating Systems course', 3, '2026-09-19 16:04:02', '2026-09-19 16:04:02'),
(3, 'CS203', 'Web Development', 'Web Development course', 3, '2026-09-19 16:04:02', '2026-09-19 16:04:02'),
(4, 'CS204', 'Machine Learning', 'Machine Learning course', 3, '2026-09-19 16:04:02', '2026-09-19 16:04:02'),
(5, 'CS205', 'Database Systems', 'Database Systems course', 3, '2026-09-19 16:04:02', '2026-09-19 16:04:02');

-- --------------------------------------------------------

--
-- Stand-in structure for view `course_attendance_summary`
-- (See below for the actual view)
--
CREATE TABLE `course_attendance_summary` (
`course_id` bigint(20) unsigned
,`course_code` varchar(50)
,`course_name` varchar(200)
,`section_id` bigint(20) unsigned
,`section_name` varchar(50)
,`enrolled_students` bigint(21)
,`total_sessions` bigint(21)
,`present_records` decimal(22,0)
,`late_records` decimal(22,0)
,`absent_records` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `section_id` bigint(20) UNSIGNED NOT NULL,
  `enrolled_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('active','dropped','completed') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `enrollments`
--

INSERT INTO `enrollments` (`id`, `student_id`, `section_id`, `enrolled_at`, `status`) VALUES
(1, 1, 1, '2026-09-19 20:20:15', 'active'),
(2, 1, 2, '2026-09-19 20:20:15', 'active'),
(3, 1, 3, '2026-09-19 20:20:15', 'active'),
(4, 1, 4, '2026-09-19 20:20:15', 'active'),
(5, 1, 5, '2026-09-19 20:20:15', 'active'),
(6, 2, 1, '2026-09-19 20:20:15', 'active'),
(7, 2, 2, '2026-09-19 20:20:15', 'active'),
(8, 2, 3, '2026-09-19 20:20:15', 'active'),
(9, 2, 4, '2026-09-19 20:20:15', 'active'),
(10, 2, 5, '2026-09-19 20:20:15', 'active'),
(11, 3, 1, '2026-09-19 20:20:15', 'active'),
(12, 3, 2, '2026-09-19 20:20:15', 'active'),
(13, 3, 3, '2026-09-19 20:20:15', 'active'),
(14, 3, 4, '2026-09-19 20:20:15', 'active'),
(15, 3, 5, '2026-09-19 20:20:15', 'active'),
(16, 4, 1, '2026-09-19 20:20:15', 'active'),
(17, 4, 2, '2026-09-19 20:20:15', 'active'),
(18, 4, 3, '2026-09-19 20:20:15', 'active'),
(19, 4, 4, '2026-09-19 20:20:15', 'active'),
(20, 4, 5, '2026-09-19 20:20:15', 'active'),
(21, 5, 1, '2026-09-19 20:20:15', 'active'),
(22, 5, 2, '2026-09-19 20:20:15', 'active'),
(23, 5, 3, '2026-09-19 20:20:15', 'active'),
(24, 5, 4, '2026-09-19 20:20:15', 'active'),
(25, 5, 5, '2026-09-19 20:20:15', 'active'),
(26, 6, 1, '2026-09-19 20:20:15', 'active'),
(27, 6, 2, '2026-09-19 20:20:15', 'active'),
(28, 6, 3, '2026-09-19 20:20:15', 'active'),
(29, 6, 4, '2026-09-19 20:20:15', 'active'),
(30, 6, 5, '2026-09-19 20:20:15', 'active'),
(31, 7, 1, '2026-09-19 20:20:15', 'active'),
(32, 7, 2, '2026-09-19 20:20:15', 'active'),
(33, 7, 3, '2026-09-19 20:20:15', 'active'),
(34, 7, 4, '2026-09-19 20:20:15', 'active'),
(35, 7, 5, '2026-09-19 20:20:15', 'active'),
(36, 8, 1, '2026-09-19 20:20:15', 'active'),
(37, 8, 2, '2026-09-19 20:20:15', 'active'),
(38, 8, 3, '2026-09-19 20:20:15', 'active'),
(39, 8, 4, '2026-09-19 20:20:15', 'active'),
(40, 8, 5, '2026-09-19 20:20:15', 'active'),
(41, 9, 1, '2026-09-19 20:20:15', 'active'),
(42, 9, 2, '2026-09-19 20:20:15', 'active'),
(43, 9, 3, '2026-09-19 20:20:15', 'active'),
(44, 9, 4, '2026-09-19 20:20:15', 'active'),
(45, 9, 5, '2026-09-19 20:20:15', 'active'),
(46, 10, 1, '2026-09-19 20:20:15', 'active'),
(47, 10, 2, '2026-09-19 20:20:15', 'active'),
(48, 10, 3, '2026-09-19 20:20:15', 'active'),
(49, 10, 4, '2026-09-19 20:20:15', 'active'),
(50, 10, 5, '2026-09-19 20:20:15', 'active'),
(51, 11, 1, '2026-09-19 20:20:15', 'active'),
(52, 11, 2, '2026-09-19 20:20:15', 'active'),
(53, 11, 3, '2026-09-19 20:20:15', 'active'),
(54, 11, 4, '2026-09-19 20:20:15', 'active'),
(55, 11, 5, '2026-09-19 20:20:15', 'active'),
(56, 12, 1, '2026-09-19 20:20:15', 'active'),
(57, 12, 2, '2026-09-19 20:20:15', 'active'),
(58, 12, 3, '2026-09-19 20:20:15', 'active'),
(59, 12, 4, '2026-09-19 20:20:15', 'active'),
(60, 12, 5, '2026-09-19 20:20:15', 'active'),
(61, 13, 1, '2026-09-19 20:20:15', 'active'),
(62, 13, 2, '2026-09-19 20:20:15', 'active'),
(63, 13, 3, '2026-09-19 20:20:15', 'active'),
(64, 13, 4, '2026-09-19 20:20:15', 'active'),
(65, 13, 5, '2026-09-19 20:20:15', 'active'),
(66, 14, 1, '2026-09-19 20:20:15', 'active'),
(67, 14, 2, '2026-09-19 20:20:15', 'active'),
(68, 14, 3, '2026-09-19 20:20:15', 'active'),
(69, 14, 4, '2026-09-19 20:20:15', 'active'),
(70, 14, 5, '2026-09-19 20:20:15', 'active'),
(71, 15, 1, '2026-09-19 20:20:15', 'active'),
(72, 15, 2, '2026-09-19 20:20:15', 'active'),
(73, 15, 3, '2026-09-19 20:20:15', 'active'),
(74, 15, 4, '2026-09-19 20:20:15', 'active'),
(75, 15, 5, '2026-09-19 20:20:15', 'active'),
(76, 16, 1, '2026-09-19 20:20:15', 'active'),
(77, 16, 2, '2026-09-19 20:20:15', 'active'),
(78, 16, 3, '2026-09-19 20:20:15', 'active'),
(79, 16, 4, '2026-09-19 20:20:15', 'active'),
(80, 16, 5, '2026-09-19 20:20:15', 'active'),
(81, 17, 1, '2026-09-19 20:20:15', 'active'),
(82, 17, 2, '2026-09-19 20:20:15', 'active'),
(83, 17, 3, '2026-09-19 20:20:15', 'active'),
(84, 17, 4, '2026-09-19 20:20:15', 'active'),
(85, 17, 5, '2026-09-19 20:20:15', 'active'),
(86, 18, 1, '2026-09-19 20:20:15', 'active'),
(87, 18, 2, '2026-09-19 20:20:15', 'active'),
(88, 18, 3, '2026-09-19 20:20:15', 'active'),
(89, 18, 4, '2026-09-19 20:20:15', 'active'),
(90, 18, 5, '2026-09-19 20:20:15', 'active'),
(91, 19, 1, '2026-09-19 20:20:15', 'active'),
(92, 19, 2, '2026-09-19 20:20:15', 'active'),
(93, 19, 3, '2026-09-19 20:20:15', 'active'),
(94, 19, 4, '2026-09-19 20:20:15', 'active'),
(95, 19, 5, '2026-09-19 20:20:15', 'active'),
(96, 20, 1, '2026-09-19 20:20:15', 'active'),
(97, 20, 2, '2026-09-19 20:20:15', 'active'),
(98, 20, 3, '2026-09-19 20:20:15', 'active'),
(99, 20, 4, '2026-09-19 20:20:15', 'active'),
(100, 20, 5, '2026-09-19 20:20:15', 'active'),
(101, 21, 1, '2026-09-19 20:20:15', 'active'),
(102, 21, 2, '2026-09-19 20:20:15', 'active'),
(103, 21, 3, '2026-09-19 20:20:15', 'active'),
(104, 21, 4, '2026-09-19 20:20:15', 'active'),
(105, 21, 5, '2026-09-19 20:20:15', 'active'),
(106, 22, 1, '2026-09-19 20:20:15', 'active'),
(107, 22, 2, '2026-09-19 20:20:15', 'active'),
(108, 22, 3, '2026-09-19 20:20:15', 'active'),
(109, 22, 4, '2026-09-19 20:20:15', 'active'),
(110, 22, 5, '2026-09-19 20:20:15', 'active'),
(111, 23, 1, '2026-09-19 20:20:15', 'active'),
(112, 23, 2, '2026-09-19 20:20:15', 'active'),
(113, 23, 3, '2026-09-19 20:20:15', 'active'),
(114, 23, 4, '2026-09-19 20:20:15', 'active'),
(115, 23, 5, '2026-09-19 20:20:15', 'active'),
(116, 24, 1, '2026-09-19 20:20:15', 'active'),
(117, 24, 2, '2026-09-19 20:20:15', 'active'),
(118, 24, 3, '2026-09-19 20:20:15', 'active'),
(119, 24, 4, '2026-09-19 20:20:15', 'active'),
(120, 24, 5, '2026-09-19 20:20:15', 'active'),
(121, 25, 1, '2026-09-19 20:20:15', 'active'),
(122, 25, 2, '2026-09-19 20:20:15', 'active'),
(123, 25, 3, '2026-09-19 20:20:15', 'active'),
(124, 25, 4, '2026-09-19 20:20:15', 'active'),
(125, 25, 5, '2026-09-19 20:20:15', 'active'),
(126, 26, 1, '2026-09-19 20:20:15', 'active'),
(127, 26, 2, '2026-09-19 20:20:15', 'active'),
(128, 26, 3, '2026-09-19 20:20:15', 'active'),
(129, 26, 4, '2026-09-19 20:20:15', 'active'),
(130, 26, 5, '2026-09-19 20:20:15', 'active'),
(141, 29, 1, '2026-09-19 20:20:15', 'active'),
(142, 29, 2, '2026-09-19 20:20:15', 'active'),
(143, 29, 3, '2026-09-19 20:20:15', 'active'),
(144, 29, 4, '2026-09-19 20:20:15', 'active'),
(145, 29, 5, '2026-09-19 20:20:15', 'active'),
(146, 30, 1, '2026-09-19 20:20:15', 'active'),
(147, 30, 2, '2026-09-19 20:20:15', 'active'),
(148, 30, 3, '2026-09-19 20:20:15', 'active'),
(149, 30, 4, '2026-09-19 20:20:15', 'active'),
(150, 30, 5, '2026-09-19 20:20:15', 'active'),
(151, 1, 6, '2026-09-20 22:59:50', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'attendance.view', 'View attendance', '2026-09-19 16:04:02'),
(2, 'attendance.create', 'Create attendance', '2026-09-19 16:04:02'),
(3, 'attendance.update', 'Update attendance', '2026-09-19 16:04:02'),
(4, 'attendance.delete', 'Delete attendance', '2026-09-19 16:04:02'),
(5, 'session.view', 'View sessions', '2026-09-19 16:04:02'),
(6, 'session.create', 'Create attendance session', '2026-09-19 16:04:02'),
(7, 'session.update', 'Update session', '2026-09-19 16:04:02'),
(8, 'session.close', 'Close session', '2026-09-19 16:04:02'),
(9, 'student.view', 'View students', '2026-09-19 16:04:02'),
(10, 'student.create', 'Create students', '2026-09-19 16:04:02'),
(11, 'student.update', 'Update students', '2026-09-19 16:04:02'),
(12, 'student.delete', 'Delete students', '2026-09-19 16:04:02'),
(13, 'course.view', 'View courses', '2026-09-19 16:04:02'),
(14, 'course.create', 'Create courses', '2026-09-19 16:04:02'),
(15, 'course.update', 'Update courses', '2026-09-19 16:04:02'),
(16, 'course.delete', 'Delete courses', '2026-09-19 16:04:02'),
(17, 'report.view', 'View reports', '2026-09-19 16:04:02'),
(18, 'report.export', 'Export reports', '2026-09-19 16:04:02'),
(19, 'correction.create', 'Create correction request', '2026-09-19 16:04:02'),
(20, 'correction.review', 'Review correction request', '2026-09-19 16:04:02'),
(21, 'audit.view', 'View audit logs', '2026-09-19 16:04:02'),
(22, 'user.manage', 'Manage users', '2026-09-19 16:04:02'),
(23, 'room.view', 'View rooms', '2026-09-20 22:18:16');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'student', 'Student user', '2026-09-19 16:04:02'),
(2, 'lecturer', 'Lecturer user', '2026-09-19 16:04:02'),
(3, 'ta', 'Teaching Assistant', '2026-09-19 16:04:02'),
(4, 'admin', 'System Administrator', '2026-09-19 16:04:02'),
(5, 'auditor', 'System Auditor', '2026-09-19 16:04:02');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 1),
(1, 5),
(1, 19),
(2, 1),
(2, 2),
(2, 3),
(2, 5),
(2, 6),
(2, 7),
(2, 8),
(2, 9),
(2, 13),
(2, 17),
(2, 18),
(2, 20),
(2, 23),
(3, 1),
(3, 2),
(3, 3),
(3, 5),
(3, 6),
(3, 8),
(3, 9),
(3, 13),
(3, 17),
(3, 20),
(4, 1),
(4, 2),
(4, 3),
(4, 4),
(4, 5),
(4, 6),
(4, 7),
(4, 8),
(4, 9),
(4, 10),
(4, 11),
(4, 12),
(4, 13),
(4, 14),
(4, 15),
(4, 16),
(4, 17),
(4, 18),
(4, 19),
(4, 20),
(4, 21),
(4, 22),
(5, 1),
(5, 5),
(5, 17),
(5, 18),
(5, 21);

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `building` varchar(100) NOT NULL,
  `room_name` varchar(100) NOT NULL,
  `room_type` enum('classroom','lab','hall') DEFAULT 'classroom',
  `capacity` int(11) DEFAULT 100,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `building`, `room_name`, `room_type`, `capacity`, `latitude`, `longitude`, `created_at`) VALUES
(1, 'Building A', 'LAB-1', 'lab', 40, NULL, NULL, '2026-09-19 16:04:02'),
(2, 'Building A', 'LAB-2', 'lab', 40, NULL, NULL, '2026-09-19 16:04:02');

-- --------------------------------------------------------

--
-- Table structure for table `sections`
--

CREATE TABLE `sections` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `course_id` bigint(20) UNSIGNED NOT NULL,
  `section_name` varchar(50) NOT NULL,
  `academic_year` varchar(50) NOT NULL,
  `semester` enum('first','second','summer') NOT NULL,
  `lecturer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `capacity` int(11) DEFAULT 100,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sections`
--

INSERT INTO `sections` (`id`, `course_id`, `section_name`, `academic_year`, `semester`, `lecturer_id`, `capacity`, `created_at`) VALUES
(1, 1, 'A', '2026-2027', 'first', 43, 40, '2026-09-19 20:15:10'),
(2, 2, 'A', '2026-2027', 'first', 43, 40, '2026-09-19 20:15:10'),
(3, 3, 'A', '2026-2027', 'first', 43, 40, '2026-09-19 20:15:10'),
(4, 4, 'A', '2026-2027', 'first', 43, 40, '2026-09-19 20:15:10'),
(5, 5, 'A', '2026-2027', 'first', 43, 40, '2026-09-19 20:15:10'),
(6, 5, 'B', '2026/2027', 'first', 43, 100, '2026-09-20 17:31:35');

-- --------------------------------------------------------

--
-- Table structure for table `staff_profiles`
--

CREATE TABLE `staff_profiles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `staff_code` varchar(50) NOT NULL,
  `department` varchar(150) DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_profiles`
--

INSERT INTO `staff_profiles` (`id`, `user_id`, `staff_code`, `department`, `job_title`, `created_at`) VALUES
(1, 2, 'LEC001', 'Computer Science', 'Lecturer', '2026-09-19 20:13:14');

-- --------------------------------------------------------

--
-- Table structure for table `student_profiles`
--

CREATE TABLE `student_profiles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `student_code` varchar(50) NOT NULL,
  `university_id` varchar(100) DEFAULT NULL,
  `department` varchar(150) DEFAULT NULL,
  `level` int(11) DEFAULT NULL,
  `academic_year` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_profiles`
--

INSERT INTO `student_profiles` (`id`, `user_id`, `student_code`, `university_id`, `department`, `level`, `academic_year`, `created_at`) VALUES
(1, 1, '20260001', NULL, 'Computer Science', 3, '2026/2027', '2026-09-19 16:12:38'),
(2, 4, 'STU0004', 'UNI000004', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(3, 5, 'STU0005', 'UNI000005', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(4, 6, 'STU0006', 'UNI000006', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(5, 7, 'STU0007', 'UNI000007', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(6, 8, 'STU0008', 'UNI000008', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(7, 9, 'STU0009', 'UNI000009', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(8, 10, 'STU0010', 'UNI000010', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(9, 11, 'STU0011', 'UNI000011', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(10, 12, 'STU0012', 'UNI000012', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(11, 13, 'STU0013', 'UNI000013', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(12, 14, 'STU0014', 'UNI000014', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(13, 15, 'STU0015', 'UNI000015', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(14, 16, 'STU0016', 'UNI000016', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(15, 17, 'STU0017', 'UNI000017', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(16, 18, 'STU0018', 'UNI000018', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(17, 19, 'STU0019', 'UNI000019', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(18, 20, 'STU0020', 'UNI000020', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(19, 21, 'STU0021', 'UNI000021', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(20, 22, 'STU0022', 'UNI000022', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(21, 23, 'STU0023', 'UNI000023', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(22, 24, 'STU0024', 'UNI000024', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(23, 25, 'STU0025', 'UNI000025', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(24, 26, 'STU0026', 'UNI000026', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(25, 27, 'STU0027', 'UNI000027', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(26, 28, 'STU0028', 'UNI000028', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(29, 31, 'STU0031', 'UNI000031', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(30, 32, 'STU0032', 'UNI000032', 'Computer Science', 3, '2026-2027', '2026-09-19 20:19:48'),
(31, 36, '4343443', NULL, NULL, NULL, NULL, '2026-09-20 11:19:25'),
(32, 37, '12375236512', NULL, NULL, NULL, NULL, '2026-09-20 11:24:40'),
(33, 38, '2023009171', NULL, NULL, NULL, NULL, '2026-09-20 11:34:37'),
(34, 41, 'ST999', NULL, NULL, NULL, NULL, '2026-09-20 19:30:50'),
(35, 42, '44444', NULL, NULL, NULL, NULL, '2026-09-20 20:14:45');

-- --------------------------------------------------------

--
-- Table structure for table `timetable_slots`
--

CREATE TABLE `timetable_slots` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `section_id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `day_of_week` enum('saturday','sunday','monday','tuesday','wednesday','thursday','friday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `timetable_slots`
--

INSERT INTO `timetable_slots` (`id`, `section_id`, `room_id`, `day_of_week`, `start_time`, `end_time`, `start_date`, `end_date`, `created_at`) VALUES
(1, 1, 1, 'saturday', '10:00:00', '12:00:00', '2026-09-20', '2027-01-31', '2026-09-19 20:17:44'),
(2, 2, 1, 'sunday', '12:00:00', '14:00:00', '2026-09-20', '2027-01-31', '2026-09-19 20:17:44'),
(3, 3, 2, 'monday', '10:00:00', '12:00:00', '2026-09-20', '2027-01-31', '2026-09-19 20:17:44'),
(4, 4, 2, 'tuesday', '12:00:00', '14:00:00', '2026-09-20', '2027-01-31', '2026-09-19 20:17:44'),
(5, 5, NULL, 'wednesday', '10:00:00', '12:00:00', '2026-09-20', '2027-01-31', '2026-09-19 20:17:44');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `role_id`, `first_name`, `last_name`, `email`, `password_hash`, `phone`, `status`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'Ahmed', 'Student', '20260001@student.edu', '$2b$10$rXGLrEnWpitsN7E49s2nhepKQvRp5VvsjISSbO/BPHvxtPKHWsO02', NULL, 'active', '2026-09-19 19:36:36', '2026-09-19 16:12:38', '2026-09-19 16:36:36'),
(2, 2, 'Mohamed', 'Lecturer', 'lecturer@smartattendance.com', '$2b$10$AFGCZUyWU1KmIExUF6GfZuXf5UrInZI53iy4Kix7wIbwUFnRn58ZW', NULL, 'active', NULL, '2026-09-19 16:45:20', '2026-09-19 16:45:20'),
(4, 1, 'Student01', 'Test', 'student01@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000001', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(5, 1, 'Student02', 'Test', 'student02@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000002', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(6, 1, 'Student03', 'Test', 'student03@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000003', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(7, 1, 'Student04', 'Test', 'student04@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000004', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(8, 1, 'Student05', 'Test', 'student05@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000005', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(9, 1, 'Student06', 'Test', 'student06@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000006', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(10, 1, 'Student07', 'Test', 'student07@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000007', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(11, 1, 'Student08', 'Test', 'student08@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000008', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(12, 1, 'Student09', 'Test', 'student09@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000009', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(13, 1, 'Student10', 'Test', 'student10@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000010', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(14, 1, 'Student11', 'Test', 'student11@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000011', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(15, 1, 'Student12', 'Test', 'student12@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000012', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(16, 1, 'Student13', 'Test', 'student13@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000013', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(17, 1, 'Student14', 'Test', 'student14@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000014', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(18, 1, 'Student15', 'Test', 'student15@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000015', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(19, 1, 'Student16', 'Test', 'student16@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000016', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(20, 1, 'Student17', 'Test', 'student17@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000017', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(21, 1, 'Student18', 'Test', 'student18@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000018', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(22, 1, 'Student19', 'Test', 'student19@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000019', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(23, 1, 'Student20', 'Test', 'student20@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000020', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(24, 1, 'Student21', 'Test', 'student21@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000021', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(25, 1, 'Student22', 'Test', 'student22@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000022', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(26, 1, 'Student23', 'Test', 'student23@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000023', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(27, 1, 'Student24', 'Test', 'student24@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000024', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(28, 1, 'Student25', 'Test', 'student25@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000025', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(31, 1, 'Student28', 'Test', 'student28@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000028', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(32, 1, 'Student29', 'Test', 'student29@smartattendance.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC8u8Zg6wK9JQ7l3Q6m', '01000000029', 'active', NULL, '2026-09-19 20:19:33', '2026-09-19 20:19:33'),
(35, 4, 'System', 'Admin', 'admin@smartattendance.com', '$2b$10$eHugFXBxpC.AZVwCrsaX1OyFQyAmcdaMQvSRbpaYtfzg3P3lCIH4i', NULL, 'active', '2026-09-21 01:40:40', '2026-09-19 20:46:12', '2026-09-20 22:40:40'),
(36, 1, 'Aboelyazed', 'Aboelyazed', 'engzezo943@gmail.com', '$2a$10$DlhCFPhAbAn8R8VR6BbIv.XtnGybKZTpaJawAdlkYIakOiER/H4Au', NULL, 'active', NULL, '2026-09-20 11:19:25', '2026-09-20 11:19:25'),
(37, 1, 'TADRES', 'FARAG', 'RADEWS@gmai.com', '$2a$10$IhVr/CXY5.hZ0mRaPbQRb.5wCItgJ516crwMcz94Yx9XDKSfekrZa', NULL, 'active', NULL, '2026-09-20 11:24:40', '2026-09-20 11:24:40'),
(38, 1, 'joly', 'hany', 'jolyhany0@gmail.com', '$2a$10$OSs0wO9hiVHQQli401tDQ.KqQ4JWxz419QTY3VJbRdyOZIdi97.IW', NULL, 'active', NULL, '2026-09-20 11:34:37', '2026-09-20 11:34:37'),
(39, 1, 'Aboelyazed', 'Aboelyazed', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbxxxxx@gmail.com', '$2a$10$n3JGdJiqVoYYHNC/OHCu1urXpaB6FRZL/BmpUS9A5xPMmamP8fpay', '01060965014', 'active', NULL, '2026-09-20 12:11:29', '2026-09-20 12:15:19'),
(40, 2, 'Omar', 'Ahmed', 'czczfsztsr@gmail.com', '$2a$10$u.OUD64MHpjJDKJcUyLkL.q4ss4WEDWhtq3ET4Ra0kq5v94wzuYjm', NULL, 'active', NULL, '2026-09-20 12:45:01', '2026-09-20 12:45:01'),
(41, 1, 'Test', 'Student', 'test999@gmail.com', '$2a$10$FtvVAI7PHXB1O0FG35huvOllJhwaf3iJib2jCinmBxQVksFh.wVBq', NULL, 'active', '2026-09-21 01:39:25', '2026-09-20 19:30:50', '2026-09-20 22:39:25'),
(42, 1, 'Aboelyazed', 'Aboelyazed', '43@gmail.com', '$2a$10$tvwaN.20PTKS93ZLQA5Lm.IK51jQkxI7AaFKdbphd3apxxWFbN.fO', '01060965014', 'active', '2026-09-20 23:21:20', '2026-09-20 20:14:45', '2026-09-20 20:53:53'),
(43, 2, 'Aboelyazed', 'Aboelyazed', 'vvvxx43@gmail.com', '$2a$10$tTKh9aeBjHYdZwvysaFYAOgOGitczhJIT3j3SIngn8TLV4zAM1u76', '01060965014', 'active', '2026-09-21 01:46:50', '2026-09-20 21:21:15', '2026-09-20 22:46:50');

-- --------------------------------------------------------

--
-- Structure for view `attendance_summary`
--
DROP TABLE IF EXISTS `attendance_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `attendance_summary`  AS SELECT `sp`.`id` AS `student_id`, `sp`.`student_code` AS `student_code`, concat(`u`.`first_name`,' ',`u`.`last_name`) AS `student_name`, count(`ae`.`id`) AS `total_attendance`, sum(case when `ae`.`status` = 'present' then 1 else 0 end) AS `present_count`, sum(case when `ae`.`status` = 'late' then 1 else 0 end) AS `late_count`, sum(case when `ae`.`status` = 'absent' then 1 else 0 end) AS `absent_count`, sum(case when `ae`.`status` = 'excused' then 1 else 0 end) AS `excused_count` FROM ((`student_profiles` `sp` join `users` `u` on(`u`.`id` = `sp`.`user_id`)) left join `attendance_events` `ae` on(`ae`.`student_id` = `sp`.`id`)) GROUP BY `sp`.`id`, `sp`.`student_code`, `u`.`first_name`, `u`.`last_name` ;

-- --------------------------------------------------------

--
-- Structure for view `course_attendance_summary`
--
DROP TABLE IF EXISTS `course_attendance_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `course_attendance_summary`  AS SELECT `c`.`id` AS `course_id`, `c`.`course_code` AS `course_code`, `c`.`course_name` AS `course_name`, `sec`.`id` AS `section_id`, `sec`.`section_name` AS `section_name`, count(distinct `e`.`student_id`) AS `enrolled_students`, count(distinct `ses`.`id`) AS `total_sessions`, sum(case when `ae`.`status` = 'present' then 1 else 0 end) AS `present_records`, sum(case when `ae`.`status` = 'late' then 1 else 0 end) AS `late_records`, sum(case when `ae`.`status` = 'absent' then 1 else 0 end) AS `absent_records` FROM ((((`courses` `c` join `sections` `sec` on(`sec`.`course_id` = `c`.`id`)) left join `enrollments` `e` on(`e`.`section_id` = `sec`.`id`)) left join `attendance_sessions` `ses` on(`ses`.`section_id` = `sec`.`id`)) left join `attendance_events` `ae` on(`ae`.`session_id` = `ses`.`id` and `ae`.`student_id` = `e`.`student_id`)) GROUP BY `c`.`id`, `c`.`course_code`, `c`.`course_name`, `sec`.`id`, `sec`.`section_name` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance_events`
--
ALTER TABLE `attendance_events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`,`session_id`),
  ADD KEY `idx_attendance_student` (`student_id`),
  ADD KEY `idx_attendance_session` (`session_id`),
  ADD KEY `idx_attendance_status` (`status`);

--
-- Indexes for table `attendance_flags`
--
ALTER TABLE `attendance_flags`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_flag_student` (`student_id`),
  ADD KEY `fk_flag_session` (`session_id`),
  ADD KEY `fk_flag_reviewer` (`reviewed_by`);

--
-- Indexes for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_session_room` (`room_id`),
  ADD KEY `fk_session_opener` (`opened_by`),
  ADD KEY `idx_sessions_section` (`section_id`),
  ADD KEY `idx_sessions_date` (`session_date`),
  ADD KEY `idx_sessions_status` (`status`);

--
-- Indexes for table `audit_events`
--
ALTER TABLE `audit_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_audit_actor` (`actor_id`);

--
-- Indexes for table `correction_requests`
--
ALTER TABLE `correction_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_correction_attendance` (`attendance_event_id`),
  ADD KEY `fk_correction_student` (`student_id`),
  ADD KEY `fk_correction_reviewer` (`reviewed_by`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_code` (`course_code`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`,`section_id`),
  ADD KEY `fk_enrollment_section` (`section_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notification_user` (`user_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_rp_permission` (`permission_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `building` (`building`,`room_name`);

--
-- Indexes for table `sections`
--
ALTER TABLE `sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_id` (`course_id`,`section_name`,`academic_year`,`semester`),
  ADD KEY `fk_sections_lecturer` (`lecturer_id`);

--
-- Indexes for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `staff_code` (`staff_code`);

--
-- Indexes for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `student_code` (`student_code`),
  ADD KEY `idx_student_code` (`student_code`);

--
-- Indexes for table `timetable_slots`
--
ALTER TABLE `timetable_slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_timetable_section` (`section_id`),
  ADD KEY `fk_timetable_room` (`room_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_role` (`role_id`),
  ADD KEY `idx_users_status` (`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance_events`
--
ALTER TABLE `attendance_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_flags`
--
ALTER TABLE `attendance_flags`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `audit_events`
--
ALTER TABLE `audit_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `correction_requests`
--
ALTER TABLE `correction_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=152;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sections`
--
ALTER TABLE `sections`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `student_profiles`
--
ALTER TABLE `student_profiles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `timetable_slots`
--
ALTER TABLE `timetable_slots`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance_events`
--
ALTER TABLE `attendance_events`
  ADD CONSTRAINT `fk_attendance_session` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_flags`
--
ALTER TABLE `attendance_flags`
  ADD CONSTRAINT `fk_flag_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_flag_session` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_flag_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD CONSTRAINT `fk_session_opener` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_session_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_session_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_events`
--
ALTER TABLE `audit_events`
  ADD CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `correction_requests`
--
ALTER TABLE `correction_requests`
  ADD CONSTRAINT `fk_correction_attendance` FOREIGN KEY (`attendance_event_id`) REFERENCES `attendance_events` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_correction_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_correction_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollment_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_enrollment_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sections`
--
ALTER TABLE `sections`
  ADD CONSTRAINT `fk_sections_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sections_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `timetable_slots`
--
ALTER TABLE `timetable_slots`
  ADD CONSTRAINT `fk_timetable_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_timetable_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
