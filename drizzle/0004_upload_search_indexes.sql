-- Search indexes for cabinet uploads. rowid = document_chunks.id.
-- The vector table is partitioned by account so a cabinet's search never scans another's documents.
CREATE VIRTUAL TABLE `document_chunks_fts` USING fts5(text, tokenize = 'porter unicode61');
--> statement-breakpoint
CREATE VIRTUAL TABLE `document_chunks_vec` USING vec0(account_id text partition key, embedding int8[1024]);
