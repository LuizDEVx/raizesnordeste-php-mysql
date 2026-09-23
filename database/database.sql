CREATE DATABASE IF NOT EXISTS pedido_facil
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pedido_facil;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS movimentacoes_estoque;
DROP TABLE IF EXISTS estoque_cozinha;
DROP TABLE IF EXISTS itens_carrinho;
DROP TABLE IF EXISTS itens_pedido;
DROP TABLE IF EXISTS pagamentos;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS cupons;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS unidades;
DROP TABLE IF EXISTS clientes;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE clientes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
  pontos INT UNSIGNED NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE unidades (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  cnpj VARCHAR(30) NULL UNIQUE,
  endereco VARCHAR(255) NULL,
  ativa TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE produtos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  estoque INT UNSIGNED NOT NULL DEFAULT 0,
  emoji VARCHAR(16) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE cupons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  tipo ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pedidos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(60) NOT NULL UNIQUE,
  cliente_id BIGINT UNSIGNED NOT NULL,
  unidade_id BIGINT UNSIGNED NULL,
  cliente_nome VARCHAR(120) NOT NULL,
  cliente_telefone VARCHAR(30) NOT NULL,
  canalPedido ENUM('APP','TOTEM','BALCAO','PICKUP','WEB') NOT NULL DEFAULT 'APP',
  forma_pagamento VARCHAR(40) NOT NULL,
  cupom_id BIGINT UNSIGNED NULL,
  cupom_codigo VARCHAR(60) NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Recebido',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_pedidos_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  CONSTRAINT fk_pedidos_cupom FOREIGN KEY (cupom_id) REFERENCES cupons(id) ON DELETE SET NULL,
  INDEX idx_pedidos_cliente_data (cliente_id, criado_em),
  INDEX idx_pedidos_status (status),
  INDEX idx_pedidos_canal (canalPedido)
) ENGINE=InnoDB;

CREATE TABLE itens_pedido (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  produto_id BIGINT UNSIGNED NULL,
  produto_nome VARCHAR(150) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  quantidade INT UNSIGNED NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_itens_pedido_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_itens_pedido_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE itens_carrinho (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id BIGINT UNSIGNED NOT NULL,
  produto_id BIGINT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carrinho_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_carrinho_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  UNIQUE KEY uq_carrinho_cliente_produto (cliente_id, produto_id)
) ENGINE=InnoDB;

CREATE TABLE pagamentos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  forma_pagamento VARCHAR(40) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'APROVADO',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagamentos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE estoque_cozinha (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  unidade VARCHAR(20) NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL DEFAULT 0,
  estoque_minimo DECIMAL(12,3) NOT NULL DEFAULT 0,
  custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  fornecedor VARCHAR(150) NULL,
  localizacao VARCHAR(150) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE movimentacoes_estoque (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT UNSIGNED NULL,
  item_nome VARCHAR(150) NOT NULL,
  tipo ENUM('Entrada','Saída') NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL,
  unidade VARCHAR(20) NOT NULL,
  observacao VARCHAR(255) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimentacoes_item FOREIGN KEY (item_id) REFERENCES estoque_cozinha(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO clientes (nome, telefone, email, senha, perfil) VALUES
('Administrador', '(67) 99999-0000', 'admin@admin.com', '$2y$12$2WGeIiCY.NEs7i1oqEArduJZwF99skR/vgEDhtTTO3SceyfrPwgAC', 'admin');

INSERT INTO unidades (nome, endereco) VALUES ('Unidade Centro', 'Endereço principal');

INSERT INTO produtos (nome, descricao, preco, estoque, emoji) VALUES
('X-Burger', 'Pão, carne, queijo, salada e molho da casa.', 24.90, 30, '🍔'),
('Pizza Calabresa', 'Molho, mussarela, calabresa e cebola.', 42.00, 20, '🍕'),
('Batata Frita', 'Porção crocante de batata frita.', 18.50, 40, '🍟'),
('Refrigerante', 'Lata 350ml.', 7.00, 60, '🥤'),
('Marmita Executiva', 'Arroz, feijão, carne, salada e acompanhamento.', 29.90, 25, '🍱'),
('Sobremesa', 'Sobremesa do dia.', 12.00, 18, '🍰');

INSERT INTO cupons (codigo, tipo, valor, ativo) VALUES ('BEMVINDO10', 'percent', 10.00, 1);

INSERT INTO estoque_cozinha (nome, categoria, unidade, quantidade, estoque_minimo, custo_unitario, fornecedor, localizacao) VALUES
('Arroz', 'Alimento', 'kg', 18, 8, 6.50, 'Distribuidora Central', 'Despensa'),
('Carne bovina', 'Alimento', 'kg', 9, 10, 34.90, 'Frigorífico Bom Corte', 'Freezer 1'),
('Óleo de soja', 'Alimento', 'un', 12, 6, 8.90, 'Atacado Sul', 'Despensa'),
('Embalagem marmita', 'Descartável', 'un', 85, 50, 0.85, 'Embalagens MS', 'Prateleira 3'),
('Luvas descartáveis', 'Higiene', 'cx', 3, 4, 22.00, 'Higiene Pro', 'Armário cozinha'),
('Detergente', 'Limpeza', 'un', 7, 4, 3.80, 'Atacado Sul', 'Área de limpeza');

INSERT INTO movimentacoes_estoque (item_id, item_nome, tipo, quantidade, unidade, observacao)
SELECT id, nome, 'Entrada', quantidade, unidade, 'Estoque inicial'
FROM estoque_cozinha WHERE quantidade > 0;
