BEGIN;

CREATE TABLE IF NOT EXISTS ntcoin_catalog (
    id BIGSERIAL PRIMARY KEY,

    codigo VARCHAR(80) NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,

    custo NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (custo >= 0),

    categoria VARCHAR(50) NOT NULL DEFAULT 'SERVICO',

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ntcoin_catalog_ativo
ON ntcoin_catalog (ativo);

CREATE INDEX IF NOT EXISTS idx_ntcoin_catalog_categoria
ON ntcoin_catalog (categoria);

INSERT INTO ntcoin_catalog
(codigo, nome, descricao, custo, categoria)
VALUES
(
    'TURING_PERGUNTA',
    'Pergunta ao Turing',
    'Uso padrão do agente de inteligência artificial Turing',
    1,
    'IA'
),
(
    'TURING_ANALISE',
    'Análise avançada Turing',
    'Análise avançada com processamento ampliado',
    5,
    'IA'
),
(
    'RELATORIO',
    'Geração de relatório',
    'Geração de relatório operacional',
    10,
    'RELATORIO'
),
(
    'AUTOMACAO',
    'Execução de automação',
    'Execução de tarefa automatizada pelo sistema',
    3,
    'AUTOMACAO'
),
(
    'API_REQUEST',
    'Requisição API',
    'Consumo padrão de integração da API NexoTerraCore',
    0.10,
    'API'
)
ON CONFLICT (codigo)
DO NOTHING;

COMMIT;
