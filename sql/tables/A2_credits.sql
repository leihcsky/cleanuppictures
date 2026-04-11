CREATE TABLE `credits` (
  `user_id` bigint NOT NULL,
  `balance` int DEFAULT '0' COMMENT '冗余总余额；应与 SUM(credit_buckets.remaining_credits) 在 active/depleted 桶上一致，事务内同步更新',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `credits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='积分账户表：每用户一行；配合 credit_buckets 分桶与 FIFO';