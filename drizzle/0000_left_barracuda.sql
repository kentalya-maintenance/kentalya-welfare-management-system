CREATE TABLE `app_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`username` varchar(100) NOT NULL,
	`password_hash` varchar(255),
	`one_login_subject` varchar(255),
	`role` varchar(100) NOT NULL DEFAULT 'welfare_staff',
	`is_active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_users_username_unique` UNIQUE(`username`),
	CONSTRAINT `app_users_onelogin_subject_unique` UNIQUE(`one_login_subject`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`one_login_employee_id` varchar(100),
	`one_login_subject` varchar(255),
	`employee_number` varchar(50) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`designation` varchar(255),
	`department` varchar(255),
	`section` varchar(255),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`raw_data` text,
	`last_synced_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_number_unique` UNIQUE(`employee_number`),
	CONSTRAINT `employees_onelogin_id_unique` UNIQUE(`one_login_employee_id`)
);
--> statement-breakpoint
CREATE TABLE `job_card_equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_card_id` int NOT NULL,
	`equipment_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`issued_at` datetime,
	`returned_at` datetime,
	`condition_on_issue` varchar(100),
	`condition_on_return` varchar(100),
	`remarks` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_card_equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `welfare_job_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_card_number` varchar(50) NOT NULL,
	`employee_id` int NOT NULL,
	`employee_name` varchar(255) NOT NULL,
	`employee_number` varchar(50) NOT NULL,
	`designation` varchar(255),
	`job_date` datetime NOT NULL,
	`job_description` text NOT NULL,
	`section` varchar(255),
	`start_time` varchar(10),
	`end_time` varchar(10),
	`lunch_information` text,
	`after_lunch_work` text,
	`after_lunch_start_time` varchar(10),
	`after_lunch_end_time` varchar(10),
	`defects_encountered` text,
	`employee_job_status` varchar(100),
	`employee_signature` text,
	`employee_signed_at` datetime,
	`supervisor_name` varchar(255),
	`supervisor_signature` text,
	`supervisor_signed_at` datetime,
	`language` enum('en','sw') NOT NULL DEFAULT 'en',
	`status` enum('draft','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `welfare_job_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_card_number_unique` UNIQUE(`job_card_number`)
);
--> statement-breakpoint
ALTER TABLE `app_users` ADD CONSTRAINT `app_users_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_card_equipment` ADD CONSTRAINT `job_card_equipment_job_card_id_welfare_job_cards_id_fk` FOREIGN KEY (`job_card_id`) REFERENCES `welfare_job_cards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `welfare_job_cards` ADD CONSTRAINT `welfare_job_cards_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `welfare_job_cards` ADD CONSTRAINT `welfare_job_cards_created_by_app_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `app_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `employees_name_idx` ON `employees` (`full_name`);--> statement-breakpoint
CREATE INDEX `employees_status_idx` ON `employees` (`status`);--> statement-breakpoint
CREATE INDEX `job_equipment_job_idx` ON `job_card_equipment` (`job_card_id`);--> statement-breakpoint
CREATE INDEX `job_card_employee_idx` ON `welfare_job_cards` (`employee_id`);--> statement-breakpoint
CREATE INDEX `job_card_date_idx` ON `welfare_job_cards` (`job_date`);--> statement-breakpoint
CREATE INDEX `job_card_status_idx` ON `welfare_job_cards` (`status`);