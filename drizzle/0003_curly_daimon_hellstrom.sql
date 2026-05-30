ALTER TABLE `voters` ADD `isVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `voters` ADD `otpCode` varchar(6);--> statement-breakpoint
ALTER TABLE `voters` ADD `otpExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `voters` ADD `otpAttempts` int DEFAULT 0 NOT NULL;