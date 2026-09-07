BEGIN;

INSERT INTO ntcoin_platform_owners (
    organizacao_id,
    usuario_id,
    ativo
)
SELECT
    uo.organizacao_id,
    u.id,
    TRUE
FROM usuarios u
JOIN usuarios_organizacoes uo
  ON uo.usuario_id = u.id
 AND uo.ativo = TRUE
JOIN perfis_acesso p
  ON p.id = uo.perfil_id
WHERE u.ativo = TRUE
  AND LOWER(BTRIM(u.nome)) IN (
      'gustavo',
      'gustavo admin'
  )
  AND p.codigo = 'proprietario'
ON CONFLICT (organizacao_id, usuario_id)
DO UPDATE SET ativo = TRUE;

COMMIT;
