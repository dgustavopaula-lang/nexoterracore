# Migrations do NexoTerraCore

As migrations são executadas pelo backend e registradas na tabela
`schema_migrations`.

No diretório `backend`, use:

```bash
npm run db:migrate
npm run db:verify-multitenancy
```

Para reverter somente a migration mais recente:

```bash
npm run db:rollback
```

O rollback da fundação multiempresa é recusado quando existem organizações,
fazendas, usuários ou vínculos reais que perderiam sua associação.

A partir da migration `002_autenticacao_autorizacao`, a fazenda ativa é derivada
da sessão autenticada. Tokens puros não são persistidos; somente seu hash é
armazenado no PostgreSQL.

A migration `003_desafios_login_multifazenda` adiciona desafios opacos,
expiráveis e de uso único para selecionar uma fazenda quando o usuário possui
mais de um vínculo ativo. Somente o hash do desafio é persistido.
