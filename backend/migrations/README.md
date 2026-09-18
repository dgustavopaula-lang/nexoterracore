# NexoTerraCore — política de migrations

- As migrations legadas existentes permanecem intactas.
- O migrador novo gerencia somente arquivos *.up.sql e *.down.sql.
- Novas migrations reversíveis começam em 012.
- Nunca renomear nem reexecutar migrations legadas em produção.
