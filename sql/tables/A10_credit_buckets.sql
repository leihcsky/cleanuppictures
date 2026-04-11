-- 积分分桶：每笔发放（积分包购买、订阅周期发放等）一行；FIFO 消费按 id ASC 选择 remaining_credits>0 且 status=active 的桶。
-- 建议执行顺序：在 A6_orders、A9_users 之后，在 A1_credit_transactions（含 bucket_id 列）之前或之后均可；完整外键见 A11。
CREATE TABLE `credit_buckets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `order_id` bigint DEFAULT NULL COMMENT '积分包购买对应 orders.id；订阅发放等非订单来源可为 NULL',
  `subscription_id` bigint DEFAULT NULL COMMENT '若为订阅周期发放，可关联 subscriptions.id',
  `source_type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'purchase_pack | subscription_grant | promo | admin_adjust | refund_reversal',
  `granted_credits` int NOT NULL COMMENT '本桶初始发放积分',
  `remaining_credits` int NOT NULL COMMENT '剩余可消费积分；与 credits.balance 联动更新',
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active' COMMENT 'active | depleted | refunded | expired | void',
  `expires_at` datetime DEFAULT NULL COMMENT '订阅赠送等可设周期末失效；积分包常 NULL',
  `external_payment_ref` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '无 order_id 时（如订阅发放）Creem 侧交易引用；有 order_id 时以 orders 为准',
  `refund_requested_at` datetime DEFAULT NULL,
  `refunded_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_fifo` (`user_id`,`status`,`id`),
  KEY `idx_user_remaining` (`user_id`,`remaining_credits`),
  KEY `order_id` (`order_id`),
  KEY `subscription_id` (`subscription_id`),
  CONSTRAINT `credit_buckets_ibfk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `credit_buckets_ibfk_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `credit_buckets_ibfk_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `credit_buckets_chk_remaining` CHECK (((`remaining_credits` >= 0) and (`remaining_credits` <= `granted_credits`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='积分分桶：按单退款、FIFO 扣减';
