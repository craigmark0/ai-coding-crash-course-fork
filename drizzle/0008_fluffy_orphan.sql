CREATE TABLE `course_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instructor_id` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`sales_copy` text NOT NULL,
	`category_id` integer NOT NULL,
	`outline` text NOT NULL,
	`prep_guide` text NOT NULL,
	`course_id` integer,
	`started_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `course_suggestions_instructor_idx` ON `course_suggestions` (`instructor_id`);