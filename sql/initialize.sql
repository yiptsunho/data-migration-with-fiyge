CREATE TABLE `tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL DEFAULT '',
  `realm_id` varchar(255) NOT NULL DEFAULT '',
  `access_token` varchar(5000) NOT NULL DEFAULT '',
  `refresh_token` varchar(5000) NOT NULL DEFAULT '',
  `token_type` varchar(50) NOT NULL DEFAULT '',
  `expire_date_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `refresh_token_expire_date_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;