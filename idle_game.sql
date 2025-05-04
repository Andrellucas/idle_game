-- phpMyAdmin SQL Dump
-- Versão otimizada para Idle Industrial Game
-- Banco de dados: `idle_game`

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Limpeza de tabelas existentes (caso existam)
-- --------------------------------------------------------

DROP TABLE IF EXISTS `trade_history`;
DROP TABLE IF EXISTS `player_resources`;
DROP TABLE IF EXISTS `player_factories`;
DROP TABLE IF EXISTS `global_market`;
DROP TABLE IF EXISTS `players`;

-- --------------------------------------------------------
-- Estrutura da tabela `players`
-- --------------------------------------------------------

CREATE TABLE `players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_rate` decimal(5,2) NOT NULL DEFAULT 0.10,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `global_market`
-- --------------------------------------------------------

CREATE TABLE `global_market` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `resource_name` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_resource_timestamp` (`resource_name`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `player_factories`
-- --------------------------------------------------------

CREATE TABLE `player_factories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `factory_name` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_player_factory` (`player_id`,`factory_name`),
  CONSTRAINT `player_factories_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `player_resources`
-- --------------------------------------------------------

CREATE TABLE `player_resources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `resource_name` varchar(50) NOT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT 0.00,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_resource` (`player_id`,`resource_name`),
  CONSTRAINT `player_resources_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Estrutura da tabela `trade_history`
-- --------------------------------------------------------

CREATE TABLE `trade_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `resource_name` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `total_amount` decimal(15,2) GENERATED ALWAYS AS (quantity * price) STORED,
  `trade_type` enum('sell','buy') NOT NULL,
  `trade_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_player_id` (`player_id`),
  KEY `idx_resource_type` (`resource_name`, `trade_type`),
  KEY `idx_trade_date` (`trade_date`),
  CONSTRAINT `trade_history_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dados iniciais para testes (opcional)
-- --------------------------------------------------------

-- Inserindo dois jogadores para teste
INSERT INTO `players` (`username`, `password`, `balance`, `tax_rate`, `created_at`) VALUES
('admin', '$2y$10$pnXM7U4o5meY9ec13TUNdeu.vqNiKEvEMxGIoqG5Ilj2jPuEmTpbu', 2000.00, 0.00, CURRENT_TIMESTAMP),
('teste', '$2y$10$3Cwr.AdjJo9kjbhTDILyJuO5HQixIbxWHk07C3fvUK6KEwesZx8Y6', 500.00, 0.10, CURRENT_TIMESTAMP);

-- Inserindo fábricas iniciais
INSERT INTO `player_factories` (`player_id`, `factory_name`, `quantity`) VALUES
(1, 'Madeireira', 1),
(2, 'Madeireira', 1);

-- Inserindo recursos iniciais para os jogadores
INSERT INTO `player_resources` (`player_id`, `resource_name`, `quantity`) VALUES
(1, 'Madeira', 500.00),
(1, 'Pedra', 0.00),
(1, 'Ferro', 0.00),
(1, 'Trigo', 0.00),
(1, 'Ouro', 0.00),
(1, 'Tábuas', 0.00),
(1, 'Carvão', 0.00),
(1, 'Tijolos', 0.00),
(1, 'BarraFerro', 0.00),
(2, 'Madeira', 100.00),
(2, 'Pedra', 0.00),
(2, 'Ferro', 0.00),
(2, 'Trigo', 0.00),
(2, 'Ouro', 0.00),
(2, 'Tábuas', 0.00),
(2, 'Carvão', 0.00),
(2, 'Tijolos', 0.00),
(2, 'BarraFerro', 0.00);

-- Valores iniciais do mercado
INSERT INTO `global_market` (`resource_name`, `quantity`, `price`) VALUES
('Madeira', 1000, 5.00),
('Pedra', 500, 7.00),
('Ferro', 200, 10.00),
('Trigo', 800, 3.00),
('Ouro', 50, 50.00),
('Tábuas', 200, 15.00),
('Carvão', 300, 8.00),
('Tijolos', 150, 12.00),
('BarraFerro', 100, 25.00);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;