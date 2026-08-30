ALTER TABLE fazendas
  ADD COLUMN proprietario VARCHAR(160),
  ADD COLUMN area_hectares NUMERIC(14,2),
  ADD COLUMN cidade VARCHAR(120),
  ADD COLUMN estado VARCHAR(80),
  ADD COLUMN pais VARCHAR(80) DEFAULT 'Brasil',
  ADD COLUMN latitude NUMERIC(10,7),
  ADD COLUMN longitude NUMERIC(10,7),
  ADD COLUMN atividade_principal VARCHAR(120);

ALTER TABLE fazendas
  ADD CONSTRAINT chk_fazendas_area_hectares
  CHECK (area_hectares IS NULL OR area_hectares >= 0);

ALTER TABLE fazendas
  ADD CONSTRAINT chk_fazendas_latitude
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);

ALTER TABLE fazendas
  ADD CONSTRAINT chk_fazendas_longitude
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
