# NexoTerraCore

## Estado atual

- Frontend mobile-first funcional
- Produção, financeiro, atividades e diagnóstico
- Central de máquinas com manutenção e alertas
- API Node e Express criada
- PostgreSQL preparado
- Segurança básica com Helmet e CORS
- Fundação multiempresa com organizações, fazendas, usuários e perfis
- Isolamento obrigatório de máquinas e financeiro por fazenda
- Autenticação por sessão opaca revogável e autorização por perfil

## Backend

O backend fornece uma API própria para armazenar e consultar os dados do
NexoTerraCore. Nenhuma integração externa está habilitada neste momento.

O backend armazena somente o hash dos tokens de sessão e deriva organização,
fazenda e perfis dos vínculos ativos do usuário. A fazenda solicitada no login
é sempre validada contra esses vínculos.

## Próxima etapa

1. Criar administração segura de usuários e vínculos
2. Criar operações, manutenções e relatórios
