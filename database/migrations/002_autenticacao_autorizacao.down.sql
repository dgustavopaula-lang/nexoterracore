DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM sessoes_usuario)
    OR EXISTS (SELECT 1 FROM auditoria_operacoes)
    OR EXISTS (SELECT 1 FROM usuarios WHERE senha_hash IS NOT NULL OR senha_salt IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM maquinas
      WHERE criado_por_usuario_id IS NOT NULL OR atualizado_por_usuario_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM lancamentos_financeiros
      WHERE criado_por_usuario_id IS NOT NULL OR atualizado_por_usuario_id IS NOT NULL
    ) THEN
    RAISE EXCEPTION 'Rollback recusado: existem credenciais, sessões ou dados de auditoria.';
  END IF;
END $$;

DROP INDEX IF EXISTS idx_financeiro_criado_por_usuario;
DROP INDEX IF EXISTS idx_maquinas_criado_por_usuario;

ALTER TABLE lancamentos_financeiros
  DROP COLUMN atualizado_por_usuario_id,
  DROP COLUMN criado_por_usuario_id;

ALTER TABLE maquinas
  DROP COLUMN atualizado_por_usuario_id,
  DROP COLUMN criado_por_usuario_id;

DROP TABLE auditoria_operacoes;
DROP TABLE sessoes_usuario;

ALTER TABLE usuarios_fazendas
DROP CONSTRAINT uq_usuario_fazenda_organizacao;

ALTER TABLE usuarios
  DROP CONSTRAINT ck_usuarios_credencial_completa,
  DROP COLUMN senha_atualizada_em,
  DROP COLUMN senha_salt,
  DROP COLUMN senha_hash;

DELETE FROM perfis_acesso WHERE codigo = 'membro';
