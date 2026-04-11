CREATE TABLE `credit_transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `amount` int DEFAULT NULL COMMENT '变动量：发放为正，消耗为负',
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'free_daily consume_standard consume_hd consume_pro purchase grant_bucket refund_bucket refund 等',
  `reference_id` bigint DEFAULT NULL COMMENT '关联 jobs.id / orders.id 等，视 type 而定',
  `bucket_id` bigint DEFAULT NULL COMMENT '发放/整桶退款等单笔对应桶；consume_* 通常 NULL，扣减明细见 credit_consumption_allocations',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `bucket_id` (`bucket_id`),
  CONSTRAINT `credit_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='积分流水表；多桶 FIFO 消耗见 credit_consumption_allocations';