
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_settings` (
  `setting_key` varchar(60) NOT NULL,
  `setting_value` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `application_status_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_status_log` (
  `id` varchar(36) NOT NULL,
  `application_id` varchar(36) DEFAULT NULL,
  `application_type` enum('job','internship') NOT NULL DEFAULT 'job',
  `old_status` varchar(30) DEFAULT NULL,
  `new_status` varchar(30) DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `note` text,
  `changed_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `application_status_log_ibfk_1` FOREIGN KEY (`changed_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` enum('team','client','project','request') NOT NULL,
  `entity_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `assigned_by` int DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `subtype` enum('member','lead','collaborator') DEFAULT 'member',
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `category` enum('audit','communication','note','system') DEFAULT 'audit',
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `auth_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `refresh_token_hash` char(64) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refresh_hash` (`refresh_token_hash`),
  KEY `idx_employee_active` (`employee_id`,`revoked_at`),
  CONSTRAINT `fk_sessions_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `booking_attendees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_attendees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` varchar(36) NOT NULL,
  `employee_id` int NOT NULL,
  `role_in_meeting` varchar(50) DEFAULT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_booking_emp` (`booking_id`,`employee_id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_employee` (`employee_id`),
  CONSTRAINT `fk_ba_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ba_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `company` varchar(100) DEFAULT NULL,
  `client_role` varchar(50) DEFAULT NULL,
  `services` text,
  `notes` text,
  `guests` text,
  `booking_date` date NOT NULL,
  `booking_time` varchar(10) NOT NULL,
  `zoom_link` varchar(255) DEFAULT NULL,
  `zoom_meeting_id` varchar(100) DEFAULT NULL,
  `cal_booking_id` varchar(100) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'confirmed',
  `fallback_used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_to` int DEFAULT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`assigned_to`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_addons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `addon_id` varchar(40) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `status` enum('active','scheduled_removal') NOT NULL DEFAULT 'active',
  `activated_at` date DEFAULT NULL,
  `ends_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ca_client` (`client_id`),
  CONSTRAINT `fk_ca_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `name` varchar(160) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(120) DEFAULT NULL,
  `can_approve` tinyint(1) DEFAULT '1',
  `can_bill` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cc` (`client_id`,`email`),
  KEY `idx_cc_client` (`client_id`),
  CONSTRAINT `fk_cc_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `project_id` int DEFAULT NULL,
  `sender` enum('client','team') NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `idx_cm_project` (`project_id`),
  CONSTRAINT `client_messages_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client_ticket_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_ticket_replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `sender` enum('client','team') NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  CONSTRAINT `client_ticket_replies_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `client_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `subject` varchar(255) NOT NULL,
  `category` enum('Technical Issue','Billing Question','General Inquiry','Revision Request','Feature Request') NOT NULL,
  `priority` enum('Low','Normal','High','Urgent') DEFAULT 'Normal',
  `description` text NOT NULL,
  `status` enum('Open','In Progress','Resolved','Closed') DEFAULT 'Open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `client_tickets_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(2048) DEFAULT NULL,
  `plan` enum('startup','business','enterprise') NOT NULL DEFAULT 'startup',
  `billing` enum('weekly','monthly') NOT NULL DEFAULT 'weekly',
  `whitelabel` tinyint(1) DEFAULT '0',
  `status` enum('active','paused','cancelled') NOT NULL DEFAULT 'active',
  `payment_ref` varchar(50) DEFAULT NULL,
  `referral_code` varchar(20) DEFAULT NULL,
  `subscribed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `next_payment_due` date DEFAULT NULL,
  `last_payment_date` date DEFAULT NULL,
  `notes` text,
  `password_hash` varchar(255) DEFAULT NULL,
  `notify_prefs` json DEFAULT NULL,
  `portal_onboarding_version` int NOT NULL DEFAULT '0',
  `portal_role` enum('admin','member') NOT NULL DEFAULT 'member',
  `onboarding_completed_at` datetime DEFAULT NULL,
  `password_reset_token_hash` char(64) DEFAULT NULL,
  `password_reset_expires_at` datetime DEFAULT NULL,
  `account_setup_token_hash` char(64) DEFAULT NULL,
  `account_setup_expires_at` datetime DEFAULT NULL,
  `account_setup_completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_prt_hash` (`password_reset_token_hash`),
  KEY `idx_client_setup_token` (`account_setup_token_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dashboard_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('booking','payment','newsletter','referral','application','system','error','support','message') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text,
  `link` varchar(500) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `two_factor_secret` varchar(255) DEFAULT NULL,
  `two_factor_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `two_factor_verified_at` datetime DEFAULT NULL,
  `two_factor_backup_codes` json DEFAULT NULL,
  `password_setup_token_hash` char(64) DEFAULT NULL,
  `password_setup_expires_at` datetime DEFAULT NULL,
  `role` enum('owner','admin','head_of_design','head_of_development','head_of_delivery','project_manager','account_manager','designer','motion_designer','illustrator','copywriter','video_editor','frontend_developer','backend_developer','fullstack_developer','mobile_developer','devops','qa_engineer','sales','marketing_manager','seo_specialist','social_media_manager','content_writer','operations_manager','finance','hr','legal','executive_assistant','support','viewer') DEFAULT NULL,
  `level` enum('intern','junior','mid','senior','lead','head','director') DEFAULT NULL,
  `max_capacity` int DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `status` enum('active','on_leave','inactive') NOT NULL DEFAULT 'active',
  `joined_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `phone` varchar(30) DEFAULT NULL,
  `avatar_url` text,
  `emergency_contact` varchar(255) DEFAULT NULL,
  `notes` text,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_last_seen` (`last_seen_at`),
  KEY `idx_employee_setup_token` (`password_setup_token_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` enum('software','salary','marketing','infrastructure','misc') NOT NULL DEFAULT 'misc',
  `description` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `date` date NOT NULL,
  `added_by` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `added_by` (`added_by`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`added_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `request_id` int DEFAULT NULL,
  `uploaded_by` int DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_url` text,
  `file_type` varchar(100) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `version` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `message_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `project_id` (`project_id`),
  KEY `request_id` (`request_id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_files_message` (`message_id`),
  CONSTRAINT `files_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `files_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `files_ibfk_3` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`),
  CONSTRAINT `files_ibfk_4` FOREIGN KEY (`uploaded_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `files_ibfk_message` FOREIGN KEY (`message_id`) REFERENCES `client_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `internship_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `internship_applications` (
  `id` varchar(36) NOT NULL,
  `job_id` varchar(36) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `university` varchar(150) DEFAULT NULL,
  `program` varchar(100) DEFAULT NULL,
  `enrollment_status` varchar(30) DEFAULT NULL,
  `graduation_year` year DEFAULT NULL,
  `year_of_study` varchar(30) DEFAULT NULL,
  `area_of_interest` varchar(50) DEFAULT NULL,
  `portfolio_url` varchar(255) DEFAULT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL,
  `resume_url` varchar(255) DEFAULT NULL,
  `availability_start` date DEFAULT NULL,
  `availability_duration` varchar(30) DEFAULT NULL,
  `hours_per_week` varchar(10) DEFAULT NULL,
  `skills` text,
  `referral_source` varchar(50) DEFAULT NULL,
  `why_clockwrk` text,
  `strongest_skill` text,
  `improvement_area` text,
  `work_style` varchar(80) DEFAULT NULL,
  `extra_note` text,
  `status` varchar(30) DEFAULT 'new',
  `notes` text,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_applications` (
  `id` varchar(36) NOT NULL,
  `job_id` varchar(36) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `availability_type` varchar(50) DEFAULT NULL,
  `availability_start` date DEFAULT NULL,
  `experience_yrs` varchar(20) DEFAULT NULL,
  `linkedin_url` varchar(500) DEFAULT NULL,
  `seniority_level` varchar(30) DEFAULT NULL,
  `current_role` varchar(150) DEFAULT NULL,
  `remote_experience` varchar(60) DEFAULT NULL,
  `has_shipped_work` varchar(60) DEFAULT NULL,
  `additional_links` text,
  `resume_url` varchar(255) DEFAULT NULL,
  `skills` text,
  `best_work_description` text,
  `hardest_part` text,
  `why_clockwrk` text,
  `strongest_skill` text,
  `improvement_area` text,
  `work_style` varchar(80) DEFAULT NULL,
  `extra_note` text,
  `status` varchar(30) DEFAULT 'new',
  `notes` text,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_listings` (
  `id` varchar(36) NOT NULL,
  `title` varchar(150) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `status` enum('open','closed') DEFAULT 'open',
  `location` varchar(100) DEFAULT NULL,
  `description` text,
  `requirements` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `newsletter_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `newsletter_subscribers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `type` varchar(20) NOT NULL,
  `source` varchar(50) DEFAULT 'footer',
  `status` varchar(20) DEFAULT 'active',
  `subscribed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email_type` (`email`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_predictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_predictions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `client_id` int unsigned NOT NULL,
  `predicted_amount` decimal(10,2) NOT NULL,
  `predicted_date` date NOT NULL,
  `confidence` tinyint unsigned NOT NULL,
  `signals` json NOT NULL DEFAULT (json_object()),
  `status` enum('pending','confirmed','missed') NOT NULL DEFAULT 'pending',
  `outcome_payment_id` int unsigned DEFAULT NULL,
  `outcome_at` datetime DEFAULT NULL,
  `view_scope` enum('yearly','monthly','both') NOT NULL DEFAULT 'both',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client` (`client_id`),
  KEY `idx_date` (`predicted_date`),
  KEY `idx_status` (`status`),
  KEY `idx_scope` (`view_scope`)
) ENGINE=InnoDB AUTO_INCREMENT=494 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_releases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_releases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `requested_by` int NOT NULL,
  `amount_usd` decimal(10,2) NOT NULL,
  `fee_usd` decimal(10,2) DEFAULT '30.00',
  `notes` text,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `exchange_rate` decimal(10,4) DEFAULT NULL,
  `received_pkr` decimal(14,2) DEFAULT NULL,
  `screenshot_url` varchar(500) DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `released_at` timestamp NULL DEFAULT NULL,
  `released_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_requested_by` (`requested_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `plan` enum('startup','business','enterprise') NOT NULL,
  `billing` enum('weekly','monthly') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `fee_usd` decimal(10,2) DEFAULT '30.00',
  `received_usd` decimal(10,2) DEFAULT NULL,
  `exchange_rate` decimal(10,4) DEFAULT '275.6200',
  `received_pkr` decimal(14,2) DEFAULT NULL,
  `whitelabel` tinyint(1) DEFAULT '0',
  `payment_ref` varchar(50) DEFAULT NULL,
  `txn_id` varchar(255) DEFAULT NULL,
  `referral_code` varchar(20) DEFAULT NULL,
  `status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prediction_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prediction_runs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ran_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `clients_scored` int unsigned NOT NULL DEFAULT '0',
  `predictions_created` int unsigned NOT NULL DEFAULT '0',
  `predictions_updated` int unsigned NOT NULL DEFAULT '0',
  `duration_ms` int unsigned DEFAULT NULL,
  `error` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=167 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `project_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `kind` enum('production','staging','figma','github','appstore','docs','prototype','other') NOT NULL DEFAULT 'other',
  `label` varchar(120) NOT NULL,
  `url` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pl_project` (`project_id`),
  CONSTRAINT `fk_pl_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `project_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_resources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `client_id` int DEFAULT NULL,
  `kind` enum('brand','website','requirements','competitor','figma','drive','research','other') NOT NULL DEFAULT 'other',
  `title` varchar(200) NOT NULL,
  `url` text,
  `file_url` text,
  `file_name` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pr_project` (`project_id`),
  CONSTRAINT `fk_pr_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(60) DEFAULT NULL,
  `icon_emoji` varchar(16) DEFAULT NULL,
  `logo_url` text,
  `status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
  `notes` text,
  `goal` text,
  `audience` varchar(255) DEFAULT NULL,
  `success_measure` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `project_manager_id` int DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `progress_percent` int DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `estimated_hours` decimal(8,2) DEFAULT '0.00',
  `github_repo` text,
  `staging_url` text,
  `live_url` text,
  `tech_stack` text,
  `health_status` enum('healthy','warning','critical') DEFAULT 'healthy',
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referrals` (
  `id` varchar(36) NOT NULL,
  `referrer_id` varchar(36) DEFAULT NULL,
  `client_name` varchar(100) DEFAULT NULL,
  `client_email` varchar(100) DEFAULT NULL,
  `plan_tier` varchar(20) DEFAULT NULL,
  `order_amount` decimal(10,2) DEFAULT NULL,
  `reward_amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `converted_at` timestamp NULL DEFAULT NULL,
  `rewarded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `referrers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referrers` (
  `id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `referral_code` varchar(20) NOT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `referral_code` (`referral_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `request_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_activity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `actor_type` enum('client','employee','system') NOT NULL DEFAULT 'system',
  `actor_id` int DEFAULT NULL,
  `event_type` varchar(80) NOT NULL,
  `label` varchar(255) NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_request_activity_request` (`request_id`,`created_at`),
  CONSTRAINT `fk_request_activity_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `request_breakdown_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_breakdown_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_request_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` varchar(100) DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `position` int NOT NULL,
  `depends_on_part_id` int DEFAULT NULL,
  `child_request_id` int DEFAULT NULL,
  `created_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_breakdown_parent_position` (`parent_request_id`,`position`),
  UNIQUE KEY `uq_breakdown_child` (`child_request_id`),
  KEY `idx_breakdown_dependency` (`depends_on_part_id`),
  KEY `idx_breakdown_creator` (`created_by_employee_id`),
  CONSTRAINT `fk_breakdown_child` FOREIGN KEY (`child_request_id`) REFERENCES `requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_breakdown_creator` FOREIGN KEY (`created_by_employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_breakdown_dependency` FOREIGN KEY (`depends_on_part_id`) REFERENCES `request_breakdown_parts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_breakdown_parent` FOREIGN KEY (`parent_request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `request_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `employee_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `comment` text NOT NULL,
  `visibility` enum('internal','client') DEFAULT 'internal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  KEY `employee_id` (`employee_id`),
  KEY `idx_rc_client` (`client_id`),
  CONSTRAINT `request_comments_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`),
  CONSTRAINT `request_comments_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `client_id` int NOT NULL,
  `assigned_to` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` varchar(100) DEFAULT NULL,
  `status` enum('queue','in_progress','in_review','revision','completed') NOT NULL DEFAULT 'queue',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `delivery_files` text,
  `revision_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `estimated_hours` decimal(8,2) DEFAULT '0.00',
  `completion_percent` int DEFAULT '0',
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `request_kind` enum('normal','parent','child') NOT NULL DEFAULT 'normal',
  `parent_request_id` int DEFAULT NULL,
  `scope_status` enum('none','reviewing','proposed','approved') NOT NULL DEFAULT 'none',
  `queue_position` bigint DEFAULT NULL,
  `part_number` int DEFAULT NULL,
  `depends_on_request_id` int DEFAULT NULL,
  `breakdown_approved_at` datetime DEFAULT NULL,
  `breakdown_approved_by_client_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_requests_parent_part` (`parent_request_id`,`part_number`),
  KEY `project_id` (`project_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `idx_requests_parent` (`parent_request_id`),
  KEY `idx_requests_queue` (`client_id`,`status`,`queue_position`),
  KEY `idx_requests_dependency` (`depends_on_request_id`),
  KEY `fk_requests_breakdown_client` (`breakdown_approved_by_client_id`),
  CONSTRAINT `fk_requests_breakdown_client` FOREIGN KEY (`breakdown_approved_by_client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_requests_dependency` FOREIGN KEY (`depends_on_request_id`) REFERENCES `requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_requests_parent` FOREIGN KEY (`parent_request_id`) REFERENCES `requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `requests_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subscription_changes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_changes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `kind` enum('plan','addon','cadence','retainer') NOT NULL,
  `direction` enum('upgrade','downgrade','add','remove','switch') NOT NULL DEFAULT 'upgrade',
  `mode` enum('prorate_now','at_renewal','fresh_cycle') NOT NULL DEFAULT 'prorate_now',
  `from_value` varchar(80) DEFAULT NULL,
  `to_value` varchar(80) NOT NULL,
  `target_cadence` enum('weekly','monthly') DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `full_price` decimal(10,2) DEFAULT '0.00',
  `credit_applied` decimal(10,2) DEFAULT '0.00',
  `amount_due` decimal(10,2) DEFAULT '0.00',
  `amount_received` decimal(10,2) DEFAULT '0.00',
  `payment_ref` varchar(30) NOT NULL,
  `status` enum('awaiting_payment','payment_reported','partially_paid','active','scheduled','cancelled','expired','rejected') NOT NULL DEFAULT 'awaiting_payment',
  `effective_date` date DEFAULT NULL,
  `new_billing_date` date DEFAULT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reported_at` timestamp NULL DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_ref` (`payment_ref`),
  KEY `idx_sc_client` (`client_id`),
  KEY `idx_sc_status` (`status`),
  CONSTRAINT `fk_sc_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `lead_id` int DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `time_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `time_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `employee_id` int NOT NULL,
  `hours` decimal(5,2) NOT NULL,
  `description` text,
  `log_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  KEY `project_id` (`project_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `time_logs_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`),
  CONSTRAINT `time_logs_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `time_logs_ibfk_3` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

