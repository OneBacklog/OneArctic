DROP INDEX `attachments_note_id_idx`;--> statement-breakpoint
CREATE INDEX `attachments_note_id_position_idx` ON `attachments` (`note_id`,`position`);--> statement-breakpoint
DROP INDEX `checklist_items_note_id_idx`;--> statement-breakpoint
CREATE INDEX `checklist_items_note_id_position_idx` ON `checklist_items` (`note_id`,`position`);--> statement-breakpoint
DROP INDEX `note_labels_note_id_idx`;--> statement-breakpoint
-- Remove duplicate links left by earlier versions before enforcing uniqueness
DELETE FROM `note_labels` WHERE rowid NOT IN (SELECT MIN(rowid) FROM `note_labels` GROUP BY `note_id`, `label_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `note_labels_note_id_label_id_unique` ON `note_labels` (`note_id`,`label_id`);--> statement-breakpoint
DROP INDEX `notes_is_archived_idx`;--> statement-breakpoint
DROP INDEX `notes_is_trashed_idx`;--> statement-breakpoint
CREATE INDEX `notes_list_idx` ON `notes` (`is_trashed`,`is_archived`,`created_at`);
