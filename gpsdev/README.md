# GPS.dev Centro de Comando V3 — prévia local

Execute `python3 -m http.server 8086 --directory gpsdev-centro-comando-v3` e abra http://localhost:8086.

## O que funciona
- Navegação responsiva, catálogo de 15 projetos editável e aprovação/pausa **somente local**, persistida em localStorage.
- Perguntas didáticas pré-cadastradas, correção por palavras-chave **simplificada**, exercício Python sem execução de código.
- Voz via Web Speech API e beep após ativação; depende de suporte do navegador.
- Teste periódico do endpoint público de health da API; erro de CORS pode impedir leitura mesmo se a API estiver no ar.
- PWA básico: service worker em HTTPS, mas sem ícones instaláveis.

## Ainda não está integrado
- Login real, banco de dados, edição/aprovação de projetos na API, Turing training/conhecimento, publicação, notificações em segundo plano, monitoramento 24h.
- Não enviar credenciais para a prévia; não publicar como painel administrativo até autenticação e autorização no backend.
- Nenhum arquivo existente do projeto foi modificado.
