CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password_hash` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '用户名',
  `user_image` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '用户头像',
  `is_guest` tinyint(1) DEFAULT '1' COMMENT '是否游客',
  `merged_into_user_id` bigint DEFAULT NULL COMMENT '游客合并进正式账号后的目标 users.id；非空表示本行仅作审计勿再计费',
  `visitor_id` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '关联 visitors.id，游客行填写；正式账号通常为空',
  `last_login_ip` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_merged_into` (`merged_into_user_id`),
  KEY `idx_users_visitor_id` (`visitor_id`),
  CONSTRAINT `users_ibfk_merged_into` FOREIGN KEY (`merged_into_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户表';