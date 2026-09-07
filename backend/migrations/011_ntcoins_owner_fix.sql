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
WHERE u.ativo = TRUE
  AND (
    LOWER(BTRIM(u.email)) = 'gustavo'
    OR LOWER(BTRIM(u.nome)) IN (
      'gustavo',
      'gustavo admin',
      'gustavo paula dos santos'
    )
  )
ON CONFLICT (organizacao_id, usuario_id)
DO UPDATE SET ativo = TRUE;

COMMIT;
