ALTER TABLE maquinas
  DROP COLUMN IF EXISTS motivo_indisponibilidade,
  DROP COLUMN IF EXISTS previsao_retorno;

DROP TABLE IF EXISTS agro_alertas;
DROP TABLE IF EXISTS agro_estoques;
DROP TABLE IF EXISTS agro_insumos;
