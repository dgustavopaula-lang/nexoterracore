DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM desafios_login) THEN
    RAISE EXCEPTION 'Rollback recusado: existem desafios de login registrados.';
  END IF;
END $$;

DROP TABLE desafios_login;
