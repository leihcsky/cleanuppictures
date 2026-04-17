CREATE TABLE `visitors` (
  `id` char(36) NOT NULL COMMENT '稳定访客 UUID，与 cp_visitor_id cookie 一致',
  `primary_guest_user_id` bigint DEFAULT NULL COMMENT '当前可计费游客 users.id',
  `linked_user_id` bigint DEFAULT NULL COMMENT '最近一次登录的正式账号 users.id',
  `fingerprint_hash` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '可选：浏览器指纹辅助',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_seen_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visitors_primary_guest` (`primary_guest_user_id`),
  KEY `idx_visitors_linked` (`linked_user_id`),
  CONSTRAINT `visitors_ibfk_primary_guest` FOREIGN KEY (`primary_guest_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `visitors_ibfk_linked` FOREIGN KEY (`linked_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='浏览器访客：登出不换 visitor，游客 users 行按 visitor 复用或重建';
