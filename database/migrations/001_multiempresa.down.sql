DO $$
DECLARE
  fazenda_inicial_id BIGINT;
BEGIN
  SELECT id INTO fazenda_inicial_id
  FROM fazendas
  WHERE codigo = 'fazenda-inicial';

  IF fazenda_inicial_id IS NULL THEN
    RAISE EXCEPTION 'Rollback recusado: Fazenda Inicial não encontrada.';
  END IF;

  IF (SELECT COUNT(*) FROM organizacoes) <> 1
    OR (SELECT COUNT(*) FROM fazendas) <> 1
    OR EXISTS (SELECT 1 FROM usuarios)
    OR EXISTS (SELECT 1 FROM usuarios_organizacoes)
    OR EXISTS (SELECT 1 FROM usuarios_fazendas)
    OR EXISTS (SELECT 1 FROM maquinas WHERE fazenda_id <> fazenda_inicial_id)
    OR EXISTS (
      SELECT 1 FROM lancamentos_financeiros
      WHERE fazenda_id <> fazenda_inicial_id
    ) THEN
    RAISE EXCEPTION 'Rollback recusado: existem dados multiempresa que perderiam seus vínculos.';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_financeiro_fazenda_tipo;
DROP INDEX IF EXISTS idx_financeiro_fazenda_data;
DROP INDEX IF EXISTS idx_maquinas_fazenda_status;
DROP INDEX IF EXISTS idx_maquinas_fazenda_criado;

ALTER TABLE lancamentos_financeiros
  DROP CONSTRAINT IF EXISTS fk_financeiro_fazenda,
  DROP COLUMN IF EXISTS fazenda_id;

ALTER TABLE maquinas
  DROP CONSTRAINT IF EXISTS fk_maquinas_fazenda,
  DROP COLUMN IF EXISTS fazenda_id;

DROP TABLE usuarios_fazendas;
DROP TABLE usuarios_organizacoes;
DROP TABLE perfis_acesso;
DROP TABLE usuarios;
DROP TABLE fazendas;
DROP TABLE organizacoes;
