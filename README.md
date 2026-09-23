# Raizes do Nordeste — PHP + MySQL/MariaDB

Versão do sistema de pedidos usando:

- PHP puro 8+ com extensão `pdo_mysql` habilitada
- API JSON com `fetch`
- PDO e queries preparadas
- Sessão PHP para autenticação
- MySQL ou MariaDB
- HTML, CSS e JavaScript puro no frontend

## Funcionalidades

### Cliente

- cadastro e login;
- identificação do usuário logado no topo;
- cardápio;
- carrinho persistido no banco;
- alterar quantidade e remover itens;
- cupom de desconto;
- checkout com nome, telefone e forma de pagamento;
- histórico de pedidos.

### Administrador

- dashboard separado;
- gerenciamento de pedidos e status;
- cadastro, edição e exclusão de pratos;
- controle da disponibilidade do cardápio;
- estoque da cozinha com alimentos e suprimentos;
- estoque mínimo e alerta de reposição;
- entrada e saída de insumos;
- histórico de movimentações;
- cadastro e ativação/desativação de cupons;
- fluxo de caixa por pedido e forma de pagamento.

## Banco de dados

1. Crie/importe o banco usando:

```text
database/database.sql
```

O próprio script cria o banco `raizesnordeste`.

2. Abra `dbconfig.php` e configure seu ambiente:

```php
$dbHost = '127.0.0.1';
$dbPort = '3306';
$dbName = 'raizesnordeste';
$dbUser = 'root';
$dbPass = '';
```

## Executar localmente

Não abra o arquivo diretamente com `file://`, porque a API PHP precisa de um servidor.

Na pasta do projeto você pode usar o servidor embutido do PHP:

```bash
php -S localhost:8000
```

Depois acesse no navegador:

```text
http://localhost:8000
```

Também pode colocar o projeto no Apache/Nginx/XAMPP/Laragon.

## Acesso administrador

```text
E-mail: admin@admin.com
Senha: admin123
```

A senha do administrador está armazenada no banco usando hash compatível com `password_verify()`.

## Estrutura

```text
api/
  _bootstrap.php
  auth.php
  cart.php
  cash.php
  coupons.php
  dashboard.php
  inventory.php
  orders.php
  products.php
  clientes.php
  unidades.php
  pedidos.php
  produtos.php
  pagamentos.php
css/
  style.css
database/
  database.sql
js/
  app.js
dbconfig.php
index.php
```

## Observações

As tabelas principais usam nomes em português: `clientes`, `unidades`, `produtos`, `pedidos`, `itens_pedido`, `itens_carrinho`, `cupons`, `estoque_cozinha` e `pagamentos`. O endpoint `api/pedidos.php` aceita o filtro `?canalPedido=TOTEM`.

O fechamento do pedido é executado dentro de transação no banco. A API valida novamente o estoque antes de gravar o pedido e descontar os produtos, evitando depender apenas da validação do JavaScript.
