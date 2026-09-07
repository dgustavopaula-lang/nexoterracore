<?php
/**
 * Template Name: NexoTerraCore Infrastructure
 * Description: Landing page institucional do ecossistema NexoTerraCore / GPS.dev.
 */

if (!defined('ABSPATH')) {
    exit;
}

$theme_uri = get_template_directory_uri();
$console_url = 'https://console.gustavopaulasantos.com.br/painel.html';
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NexoTerraCore — Infraestrutura de dados para negócios do mundo real</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="<?php echo esc_url($theme_uri); ?>/assets/css/nexoterracore-ui.css?ver=1.0.0">

    <?php wp_head(); ?>
</head>

<body class="ntc-body">

<header class="ntc-header">
    <div class="ntc-container ntc-header-inner">

        <a href="#inicio" class="ntc-brand">
            <span class="ntc-brand-name">NexoTerraCore</span>
            <span class="ntc-brand-separator">/</span>
            <span class="ntc-brand-sub">GPS.dev</span>
        </a>

        <nav class="ntc-nav-desktop">
            <a href="#inicio" class="ntc-nav-link active">Início</a>
            <a href="#plataforma" class="ntc-nav-link">Plataforma</a>
            <a href="#api" class="ntc-nav-link">API</a>
            <a href="#solucoes" class="ntc-nav-link">Soluções</a>
            <a href="#projetos" class="ntc-nav-link">Projetos</a>
            <a href="#documentacao" class="ntc-nav-link">Planos</a>
            <a href="#sobre" class="ntc-nav-link">Segurança</a>
        </nav>

        <div class="ntc-header-actions">
            <a href="<?php echo esc_url($console_url); ?>" class="ntc-btn ntc-btn-primary">
                Acessar Console
            </a>

            <button class="ntc-mobile-toggle" id="ntcMobileToggle" aria-label="Abrir menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>

    </div>
</header>

<div class="ntc-drawer" id="ntcDrawer">
    <div class="ntc-drawer-content">

        <nav class="ntc-drawer-nav">
            <a href="#inicio" class="ntc-drawer-link">Início</a>
            <a href="#plataforma" class="ntc-drawer-link">Plataforma</a>
            <a href="#api" class="ntc-drawer-link">API</a>
            <a href="#solucoes" class="ntc-drawer-link">Soluções</a>
            <a href="#projetos" class="ntc-drawer-link">Projetos</a>
            <a href="#documentacao" class="ntc-drawer-link">Planos</a>
            <a href="#sobre" class="ntc-drawer-link">Segurança</a>
        </nav>

        <div class="ntc-drawer-footer">
            <a href="<?php echo esc_url($console_url); ?>" class="ntc-btn ntc-btn-primary ntc-btn-block">
                Acessar Console
            </a>
        </div>

    </div>
</div>

<main id="inicio">

<section class="ntc-hero-section">
    <div class="ntc-container">

        <div class="ntc-hero-content">

            <span class="ntc-badge">Control Plane & Infrastructure</span>

            <h1 class="ntc-hero-title">
                NexoTerraCore — Infraestrutura de dados para negócios do mundo real.
            </h1>

            <p class="ntc-hero-subtitle">
                API central para conectar patrimônio, imóveis, agronegócio,
                dados geoespaciais, clientes e operações.
            </p>

            <div class="ntc-hero-cta">
                <a href="#api" class="ntc-btn ntc-btn-secondary">Conhecer a API</a>
                <a href="<?php echo esc_url($console_url); ?>" class="ntc-btn ntc-btn-primary">
                    Acessar Console
                </a>
            </div>

        </div>

        <div class="ntc-architecture-diagram" id="plataforma">

            <div class="ntc-diagram-node">Aplicações / Empresas</div>

            <div class="ntc-diagram-arrow">↓</div>

            <div class="ntc-diagram-node ntc-node-sub">API Keys</div>

            <div class="ntc-diagram-arrow">↓</div>

            <div class="ntc-diagram-node ntc-node-core">
                NexoTerraCore API
            </div>

            <div class="ntc-diagram-arrow">↓</div>

            <div class="ntc-diagram-row">
                <div class="ntc-diagram-node ntc-node-sub">
                    Tenant / Permissões
                </div>

                <div class="ntc-diagram-node ntc-node-sub">
                    Dados / Serviços
                </div>
            </div>

            <div class="ntc-diagram-arrow">↓</div>

            <div class="ntc-diagram-row ntc-row-modules">
                <span class="ntc-module-tag">Agro</span>
                <span class="ntc-module-tag">Patrimônio</span>
                <span class="ntc-module-tag">Imóveis</span>
                <span class="ntc-module-tag">Mapas</span>
                <span class="ntc-module-tag">Financeiro</span>
                <span class="ntc-module-tag">Clientes</span>
            </div>

        </div>

    </div>
</section>

<section class="ntc-section ntc-bg-darker" id="api">
    <div class="ntc-container">

        <div class="ntc-section-header">
            <h2 class="ntc-section-title">A API é o núcleo.</h2>

            <p class="ntc-section-desc">
                O NexoTerraCore fornece uma camada central para sistemas e empresas
                consumirem dados, serviços e módulos diretamente por API REST segura.
            </p>
        </div>

        <div class="ntc-code-window">

            <div class="ntc-code-header">
                <span class="ntc-code-dot red"></span>
                <span class="ntc-code-dot yellow"></span>
                <span class="ntc-code-dot green"></span>
                <span class="ntc-code-title">Terminal & Request Inspector</span>
                <span class="ntc-demo-badge">Exemplo conceitual de API</span>
            </div>

            <div class="ntc-code-body">

                <div class="ntc-code-line">
                    <span class="ntc-code-comment">// Chamada autenticada por API Key</span>
                </div>

                <div class="ntc-code-line">
                    <span class="ntc-code-method">GET</span>
                    <span class="ntc-code-url">/api/imoveis</span>
                    <span class="ntc-code-comment">HTTP/1.1</span>
                </div>

                <div class="ntc-code-line">
                    <span class="ntc-code-header-key">Authorization:</span>
                    Bearer ntc_live_••••••••••••••••
                </div>

                <div class="ntc-code-line">
                    <span class="ntc-code-header-key">Tenant:</span>
                    tenant_alpha
                </div>

                <br>

                <div class="ntc-code-line">
                    <span class="ntc-code-comment">// Isolamento multitenant</span>
                </div>

                <div class="ntc-code-line">{</div>
                <div class="ntc-code-line">
                    &nbsp;&nbsp;<span class="ntc-code-json-key">"status"</span>:
                    <span class="ntc-code-json-val">"success"</span>,
                </div>
                <div class="ntc-code-line">
                    &nbsp;&nbsp;<span class="ntc-code-json-key">"tenant"</span>:
                    <span class="ntc-code-json-val">"NexoTenant"</span>,
                </div>
                <div class="ntc-code-line">
                    &nbsp;&nbsp;<span class="ntc-code-json-key">"isolamento"</span>:
                    <span class="ntc-code-json-val">"ativo"</span>
                </div>
                <div class="ntc-code-line">}</div>

            </div>

        </div>

    </div>
</section>

<section class="ntc-section" id="console">
    <div class="ntc-container">

        <div class="ntc-section-header">
            <span class="ntc-badge">Ambiente de Operação</span>
            <h2 class="ntc-section-title">NexoTerra Console</h2>

            <p class="ntc-section-desc">
                Centro privado de controle, administração e operação da plataforma.
            </p>
        </div>

        <div class="ntc-console-wrapper">

            <aside class="ntc-console-sidebar">

                <div class="ntc-sidebar-header">
                    <span class="ntc-sidebar-brand">NexoTerra Console</span>
                    <span class="ntc-sidebar-sub">Control Plane</span>
                </div>

                <div class="ntc-sidebar-nav">

                    <div class="ntc-sidebar-group">
                        <span class="ntc-group-title">VISÃO GERAL</span>
                        <span class="ntc-sidebar-item active">Dashboard</span>
                    </div>

                    <div class="ntc-sidebar-group">
                        <span class="ntc-group-title">PATRIMÔNIO</span>
                        <span class="ntc-sidebar-item">Imóveis</span>
                        <span class="ntc-sidebar-item">Ativos</span>
                    </div>

                    <div class="ntc-sidebar-group">
                        <span class="ntc-group-title">AGRO</span>
                        <span class="ntc-sidebar-item">Fazendas</span>
                        <span class="ntc-sidebar-item">Safras</span>
                        <span class="ntc-sidebar-item">Máquinas</span>
                    </div>

                    <div class="ntc-sidebar-group">
                        <span class="ntc-group-title">FINANCEIRO</span>
                        <span class="ntc-sidebar-item">Receitas</span>
                        <span class="ntc-sidebar-item">Despesas</span>
                        <span class="ntc-sidebar-item">Relatórios</span>
                    </div>

                    <div class="ntc-sidebar-group">
                        <span class="ntc-group-title">MAPAS</span>
                        <span class="ntc-sidebar-item">Geolocalização</span>
                        <span class="ntc-sidebar-item">Áreas / Polígonos</span>
                    </div>

                    <div class="ntc-sidebar-group">
                        <span class="ntc-group-title">API / CONTROL PLANE</span>
                        <span class="ntc-sidebar-item">API Keys</span>
                        <span class="ntc-sidebar-item">Tenants</span>
                        <span class="ntc-sidebar-item">Endpoints</span>
                        <span class="ntc-sidebar-item">Consumo</span>
                        <span class="ntc-sidebar-item">Logs</span>
                    </div>

                    <div class="ntc-sidebar-group">
                        <span class="ntc-group-title">ADMINISTRAÇÃO</span>
                        <span class="ntc-sidebar-item">Usuários</span>
                        <span class="ntc-sidebar-item">Permissões</span>
                        <span class="ntc-sidebar-item">Segurança</span>
                        <span class="ntc-sidebar-item">Backups</span>
                    </div>

                </div>

                <div class="ntc-sidebar-footer">
                    <div class="ntc-user-card">
                        <span class="ntc-user-name">Administrador</span>
                        <span class="ntc-user-role">Control Plane</span>
                        <span class="ntc-user-status">● Sessão protegida</span>
                    </div>
                </div>

            </aside>

            <div class="ntc-console-workspace">

                <div class="ntc-topbar">

                    <div class="ntc-topbar-left">
                        <span class="ntc-breadcrumb">
                            NexoTerraCore / <strong>Dashboard</strong>
                        </span>
                    </div>

                    <div class="ntc-topbar-right">

                        <div class="ntc-pill">
                            Tenant: <strong>NexoTenant</strong>
                        </div>

                        <div class="ntc-pill">
                            Env: <strong>Production</strong>
                        </div>

                        <div class="ntc-status-indicator">
                            <span class="ntc-status-dot"></span>
                            <span>API Online</span>
                        </div>

                    </div>

                </div>

                <div class="ntc-workspace-content">

                    <div class="ntc-layer-header">
                        <span class="ntc-mockup-tag">Preview institucional</span>
                    </div>

                    <div class="ntc-metrics-grid">

                        <div class="ntc-metric-card">
                            <span class="ntc-metric-title">Arquitetura</span>
                            <span class="ntc-metric-value">Multi-tenant</span>
                            <span class="ntc-metric-sub">Isolamento por organização</span>
                        </div>

                        <div class="ntc-metric-card">
                            <span class="ntc-metric-title">API</span>
                            <span class="ntc-metric-value">Online</span>
                            <span class="ntc-metric-sub">Control Plane ativo</span>
                        </div>

                        <div class="ntc-metric-card">
                            <span class="ntc-metric-title">Banco</span>
                            <span class="ntc-metric-value">PostgreSQL</span>
                            <span class="ntc-metric-sub">Dados persistentes</span>
                        </div>

                        <div class="ntc-metric-card">
                            <span class="ntc-metric-title">Autorização</span>
                            <span class="ntc-metric-value">Scopes</span>
                            <span class="ntc-metric-sub">Permissões controladas</span>
                        </div>

                    </div>

                    <div class="ntc-card">

                        <div class="ntc-card-header">
                            <h3>Fluxo Multi-tenant</h3>
                            <span class="ntc-mockup-tag">Arquitetura central</span>
                        </div>

                        <div class="ntc-table-responsive">

                            <table class="ntc-table">

                                <thead>
                                <tr>
                                    <th>Camada</th>
                                    <th>Função</th>
                                    <th>Status</th>
                                </tr>
                                </thead>

                                <tbody>

                                <tr>
                                    <td>API Key</td>
                                    <td>Identificação da aplicação</td>
                                    <td><span class="ntc-status-ok">Ativo</span></td>
                                </tr>

                                <tr>
                                    <td>Tenant</td>
                                    <td>Isolamento da organização</td>
                                    <td><span class="ntc-status-ok">Ativo</span></td>
                                </tr>

                                <tr>
                                    <td>Permissões</td>
                                    <td>Controle de acesso</td>
                                    <td><span class="ntc-status-ok">Ativo</span></td>
                                </tr>

                                <tr>
                                    <td>PostgreSQL</td>
                                    <td>Persistência de dados</td>
                                    <td><span class="ntc-status-ok">Conectado</span></td>
                                </tr>

                                </tbody>

                            </table>

                        </div>

                    </div>

                    <div class="ntc-dashboard-grid">

                        <div class="ntc-card">

                            <div class="ntc-card-header">
                                <h3>Tenants</h3>
                            </div>

                            <ul class="ntc-list">
                                <li><strong>Empresa A</strong> — ambiente isolado</li>
                                <li><strong>Empresa B</strong> — ambiente isolado</li>
                                <li><strong>Empresa C</strong> — ambiente isolado</li>
                            </ul>

                        </div>

                        <div class="ntc-card">

                            <div class="ntc-card-header">
                                <h3>Módulos</h3>
                            </div>

                            <ul class="ntc-list">
                                <li><span class="ntc-dot-active"></span> Imóveis</li>
                                <li><span class="ntc-dot-active"></span> Patrimônio</li>
                                <li><span class="ntc-dot-active"></span> Agro</li>
                                <li><span class="ntc-dot-active"></span> Mapas</li>
                            </ul>

                        </div>

                    </div>

                </div>

            </div>

        </div>

        <div class="ntc-hero-cta" style="margin-top:32px;">
            <a href="<?php echo esc_url($console_url); ?>" class="ntc-btn ntc-btn-primary">
                Entrar na Sala de Comando
            </a>
        </div>

    </div>
</section>

<section class="ntc-section ntc-bg-darker" id="solucoes">
    <div class="ntc-container">

        <div class="ntc-section-header">
            <h2 class="ntc-section-title">Soluções de Mercado</h2>

            <p class="ntc-section-desc">
                Uma infraestrutura central que pode atender diferentes verticais.
            </p>
        </div>

        <div class="ntc-grid-3">

            <div class="ntc-card-feature">
                <h3>Agronegócio</h3>
                <p>
                    Gestão de propriedades, produção, operações e integração de dados
                    rurais por API.
                </p>
            </div>

            <div class="ntc-card-feature">
                <h3>Imóveis</h3>
                <p>
                    Cadastro centralizado, localização, documentação e estruturação
                    de dados patrimoniais.
                </p>
            </div>

            <div class="ntc-card-feature">
                <h3>Patrimônio</h3>
                <p>
                    Ativos, valores, participações e consolidação de informações
                    empresariais.
                </p>
            </div>

            <div class="ntc-card-feature">
                <h3>Geoespacial</h3>
                <p>
                    Mapas, coordenadas, áreas e estrutura preparada para
                    geolocalização.
                </p>
            </div>

            <div class="ntc-card-feature">
                <h3>Empresas</h3>
                <p>
                    Integração B2B para softwares que precisam consumir serviços
                    sem reconstruir infraestrutura do zero.
                </p>
            </div>

        </div>

    </div>
</section>

<section class="ntc-section" id="projetos">
    <div class="ntc-container">

        <div class="ntc-section-header">

            <h2 class="ntc-section-title">Projetos Conectados</h2>

            <p class="ntc-section-desc">
                Verticais e aplicações que podem consumir o núcleo central.
            </p>

        </div>

        <div class="ntc-grid-3">

            <div class="ntc-card-project">
                <span class="ntc-project-tag">Agronegócio</span>
                <h3>AgroCore</h3>
                <p>
                    Gestão agrícola e operacional conectada ao Core.
                </p>
            </div>

            <div class="ntc-card-project">
                <span class="ntc-project-tag">Patrimônio</span>
                <h3>Patrimônio</h3>
                <p>
                    Gestão estruturada de imóveis, ativos e participações.
                </p>
            </div>

            <div class="ntc-card-project">
                <span class="ntc-project-tag">Infraestrutura</span>
                <h3>Projetos B2B</h3>
                <p>
                    Novas aplicações e integrações podem utilizar a mesma API central.
                </p>
            </div>

        </div>

    </div>
</section>

<section class="ntc-section ntc-bg-darker" id="documentacao">
    <div class="ntc-container">

        <div class="ntc-section-header">

            <h2 class="ntc-section-title">
                Conecte seu software ao NexoTerraCore.
            </h2>

            <p class="ntc-section-desc">
                Empresas podem utilizar a infraestrutura por API sem precisar
                reconstruir autenticação, banco, permissões e controle de acesso.
            </p>

        </div>

        <div class="ntc-plans-wrapper">

            <div class="ntc-plans-header">
                <span class="ntc-demo-badge">Estrutura comercial em definição</span>
            </div>

            <div class="ntc-grid-4">

                <div class="ntc-plan-card">
                    <h4>Starter</h4>
                    <p>
                        Ambiente inicial para validação e integração.
                    </p>
                </div>

                <div class="ntc-plan-card">
                    <h4>Professional</h4>
                    <p>
                        Para empresas com operação recorrente e maior volume.
                    </p>
                </div>

                <div class="ntc-plan-card ntc-plan-featured">
                    <h4>Business</h4>
                    <p>
                        Multi-tenancy, limites ampliados e suporte prioritário.
                    </p>
                </div>

                <div class="ntc-plan-card">
                    <h4>Enterprise</h4>
                    <p>
                        Arquitetura sob medida, SLA e integrações avançadas.
                    </p>
                </div>

            </div>

        </div>

    </div>
</section>

<section class="ntc-section" id="sobre">
    <div class="ntc-container">

        <div class="ntc-section-header">

            <h2 class="ntc-section-title">
                Segurança & Infraestrutura
            </h2>

            <p class="ntc-section-desc">
                Arquitetura preparada para operações multiempresa.
            </p>

        </div>

        <div class="ntc-security-box">

            <ul class="ntc-security-list">
                <li>✓ Isolamento por tenant</li>
                <li>✓ API Keys por aplicação</li>
                <li>✓ PostgreSQL</li>
                <li>✓ HTTPS</li>
                <li>✓ Controle de permissões</li>
                <li>✓ Administração centralizada</li>
            </ul>

            <span class="ntc-security-note">
                NexoTerraCore — infraestrutura central para dados e serviços B2B.
            </span>

        </div>

    </div>
</section>

</main>

<footer class="ntc-footer">
    <div class="ntc-container ntc-footer-inner">
        <p class="ntc-footer-text">
            NexoTerraCore — GPS.dev
        </p>
    </div>
</footer>

<script src="<?php echo esc_url($theme_uri); ?>/assets/js/nexoterracore-ui.js?ver=1.0.0"></script>

<?php wp_footer(); ?>

</body>
</html>
