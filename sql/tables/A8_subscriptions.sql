CREATE TABLE `subscriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `provider` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'creem | stripe',
  `provider_subscription_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '支付侧订阅ID',
  `plan` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `credits_per_month` int DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscriptions_user_id` (`user_id`),
  KEY `idx_subscriptions_provider_sub_id` (`provider`,`provider_subscription_id`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='管理用户订阅计划';