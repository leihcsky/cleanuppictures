-- 一次消耗（credit_transactions 中 type=consume_*）可从多个桶按 FIFO 扣减；本表记录每个桶扣了多少。
-- 执行顺序：在 A1_credit_transactions、A10_credit_buckets 之后执行；末尾 ALTER 为 credit_transactions.bucket_id 增加外键（若已存在可跳过）。
CREATE TABLE `credit_consumption_allocations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `credit_transaction_id` bigint NOT NULL,
  `bucket_id` bigint NOT NULL,
  `amount` int NOT NULL COMMENT '从该桶扣减的积分数，>0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaction` (`credit_transaction_id`),
  KEY `idx_bucket` (`bucket_id`),
  CONSTRAINT `cca_ibfk_tx` FOREIGN KEY (`credit_transaction_id`) REFERENCES `credit_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cca_ibfk_bucket` FOREIGN KEY (`bucket_id`) REFERENCES `credit_buckets` (`id`),
  CONSTRAINT `cca_chk_amount` CHECK ((`amount` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='FIFO 多桶扣减明细';

-- 单笔发放/整桶退款可在 credit_transactions.bucket_id 指向对应桶（consume 类通常 NULL，以本表为准）
ALTER TABLE `credit_transactions`
  ADD CONSTRAINT `credit_transactions_ibfk_bucket` FOREIGN KEY (`bucket_id`) REFERENCES `credit_buckets` (`id`);
