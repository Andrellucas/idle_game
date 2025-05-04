-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 05/05/2025 às 00:56
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `idle_game`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `factories_config`
--

CREATE TABLE `factories_config` (
  `factory_name` varchar(50) NOT NULL,
  `produces` varchar(50) NOT NULL,
  `production_rate` decimal(10,2) NOT NULL,
  `cost` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`cost`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `factories_config`
--

INSERT INTO `factories_config` (`factory_name`, `produces`, `production_rate`, `cost`) VALUES
('Carpintaria', 'Tábuas', 0.20, '{\"Madeira\": 200}'),
('Fornalha', 'Carvão', 0.30, '{\"Tábuas\": 50}'),
('Fundição', 'BarraFerro', 0.10, '{\"Ferro\": 50, \"Carvão\": 20}'),
('Madeireira', 'Madeira', 1.00, '{\"Madeira\": 50}'),
('Olaria', 'Tijolos', 0.25, '{\"Pedra\": 100, \"Madeira\": 50}'),
('Pedreira', 'Pedra', 0.50, '{\"Madeira\": 100}');

-- --------------------------------------------------------

--
-- Estrutura para tabela `global_market`
--

CREATE TABLE `global_market` (
  `id` int(11) NOT NULL,
  `resource_name` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `players`
--

CREATE TABLE `players` (
  `id` int(11) NOT NULL,
  `balance` decimal(10,2) DEFAULT 100.00,
  `tax_rate` decimal(5,2) DEFAULT 0.10
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `player_factories`
--

CREATE TABLE `player_factories` (
  `player_id` int(11) NOT NULL,
  `factory_name` varchar(50) NOT NULL,
  `quantity` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `player_resources`
--

CREATE TABLE `player_resources` (
  `player_id` int(11) NOT NULL,
  `resource_name` varchar(50) NOT NULL,
  `quantity` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `resources_config`
--

CREATE TABLE `resources_config` (
  `resource_name` varchar(50) NOT NULL,
  `category` enum('primary','secondary') NOT NULL,
  `basePrice` decimal(10,2) NOT NULL,
  `recipe` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recipe`)),
  `required_factory` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `resources_config`
--

INSERT INTO `resources_config` (`resource_name`, `category`, `basePrice`, `recipe`, `required_factory`) VALUES
('BarraFerro', 'secondary', 25.00, '{\"Ferro\": 5}', 'Fundição'),
('Carvão', 'secondary', 8.00, '{\"Madeira\": 20}', 'Fornalha'),
('Ferro', 'primary', 10.00, NULL, NULL),
('Madeira', 'primary', 5.00, NULL, NULL),
('Ouro', 'primary', 50.00, NULL, NULL),
('Pedra', 'primary', 7.00, NULL, NULL),
('Tábuas', 'secondary', 15.00, '{\"Madeira\": 10}', 'Carpintaria'),
('Tijolos', 'secondary', 12.00, '{\"Pedra\": 15}', 'Olaria'),
('Trigo', 'primary', 3.00, NULL, NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `trade_history`
--

CREATE TABLE `trade_history` (
  `id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `resource_name` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `trade_type` enum('buy','sell') NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `factories_config`
--
ALTER TABLE `factories_config`
  ADD PRIMARY KEY (`factory_name`),
  ADD KEY `produces` (`produces`);

--
-- Índices de tabela `global_market`
--
ALTER TABLE `global_market`
  ADD PRIMARY KEY (`id`),
  ADD KEY `resource_name` (`resource_name`);

--
-- Índices de tabela `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `player_factories`
--
ALTER TABLE `player_factories`
  ADD PRIMARY KEY (`player_id`,`factory_name`),
  ADD KEY `factory_name` (`factory_name`);

--
-- Índices de tabela `player_resources`
--
ALTER TABLE `player_resources`
  ADD PRIMARY KEY (`player_id`,`resource_name`),
  ADD KEY `resource_name` (`resource_name`);

--
-- Índices de tabela `resources_config`
--
ALTER TABLE `resources_config`
  ADD PRIMARY KEY (`resource_name`);

--
-- Índices de tabela `trade_history`
--
ALTER TABLE `trade_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `player_id` (`player_id`),
  ADD KEY `resource_name` (`resource_name`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `global_market`
--
ALTER TABLE `global_market`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `trade_history`
--
ALTER TABLE `trade_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `factories_config`
--
ALTER TABLE `factories_config`
  ADD CONSTRAINT `factories_config_ibfk_1` FOREIGN KEY (`produces`) REFERENCES `resources_config` (`resource_name`);

--
-- Restrições para tabelas `global_market`
--
ALTER TABLE `global_market`
  ADD CONSTRAINT `global_market_ibfk_1` FOREIGN KEY (`resource_name`) REFERENCES `resources_config` (`resource_name`);

--
-- Restrições para tabelas `players`
--
ALTER TABLE `players`
  ADD CONSTRAINT `players_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `player_factories`
--
ALTER TABLE `player_factories`
  ADD CONSTRAINT `player_factories_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `player_factories_ibfk_2` FOREIGN KEY (`factory_name`) REFERENCES `factories_config` (`factory_name`);

--
-- Restrições para tabelas `player_resources`
--
ALTER TABLE `player_resources`
  ADD CONSTRAINT `player_resources_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `player_resources_ibfk_2` FOREIGN KEY (`resource_name`) REFERENCES `resources_config` (`resource_name`);

--
-- Restrições para tabelas `trade_history`
--
ALTER TABLE `trade_history`
  ADD CONSTRAINT `trade_history_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`),
  ADD CONSTRAINT `trade_history_ibfk_2` FOREIGN KEY (`resource_name`) REFERENCES `resources_config` (`resource_name`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
