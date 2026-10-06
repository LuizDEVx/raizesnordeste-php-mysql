# Raízes do Nordeste — API Backend (PHP + MySQL)

Sistema de back-end em **PHP puro** estruturado no padrão de API REST, desenvolvido para gerenciar o fluxo de pedidos, multicanalidade, produtos, unidades, clientes e pagamentos da rede de restaurantes "Raízes do Nordeste".

---

## 🚀 Tecnologias Utilizadas

- **PHP 8+** (com tipagem estrita `declare(strict_types=1);`)
- **PDO (PHP Data Objects)** com Prepared Statements (segurança contra SQL Injection)
- **MySQL / MariaDB**
- **Servidor embutido do PHP** ou Apache (XAMPP)

---

## 📂 Estrutura do Projeto

```text
raizesnordeste-php-mysql/
│
├── api/                  <-- Endpoints da API REST
│   ├── _bootstrap.php    <-- Funções auxiliares e helpers globais
│   ├── clientes.php      <-- Gerenciamento de clientes
│   ├── dashboard.php     <-- Métricas e dados consolidados
│   ├── pagamentos.php    <-- Mock e registro de pagamentos
│   ├── pedidos.php       <-- Gestão de pedidos e multicanalidade
│   ├── produtos.php      <-- Cardápio e produtos
│   └── unidades.php      <-- Filiais da rede
│
├── css/                  <-- Folhas de estilo auxiliares
├── database/
│   └── database.sql      <-- Script de criação e carga do banco de dados
│
├── js/                   <-- Scripts de integração frontend
├── dbconfig.php          <-- Configuração centralizada da conexão PDO
├── index.php             <-- Painel de apoio visual
└── README.md             <-- Documentação do repositório

## 🔧 Como Configurar e Executar o Projeto

### 1. Clonar o repositório
```bash
git clone [https://github.com/LuizDEVx/raizesnordeste-php-mysql.git](https://github.com/LuizDEVx/raizesnordeste-php-mysql.git)
cd raizesnordeste-php-mysql
