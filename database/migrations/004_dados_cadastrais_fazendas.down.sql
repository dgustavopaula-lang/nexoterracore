ALTER TABLE fazendas
  DROP CONSTRAINT IF EXISTS chk_fazendas_longitude,
  DROP CONSTRAINT IF EXISTS chk_fazendas_latitude,
  DROP CONSTRAINT IF EXISTS chk_fazendas_area_hectares;

ALTER TABLE fazendas
  DROP COLUMN IF EXISTS atividade_principal,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS pais,
  DROP COLUMN IF EXISTS estado,
  DROP COLUMN IF EXISTS cidade,
  DROP COLUMN IF EXISTS area_hectares,
  DROP COLUMN IF EXISTS proprietario;
