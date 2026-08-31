// ========== DADOS DAS UNIDADES ========== 
// (Futuramente virão da API do NexoTerraCore/PostgreSQL)
const unidades = [
    {
        id: 1,
        nome: "Residência Principal",
        tipo: "Residencial",
        area: 182.02,
        descricao: "Residência com estrutura completa",
        detalhes: [
            "Residência existente: 105,54 m²",
            "Aumento térreo: 42,28 m²",
            "Aumento superior: 34,20 m²",
            "Salas, copa, cozinha, suíte",
            "Dormitórios e banheiros",
            "Lavanderia, varanda e garagem (2 veículos)",
            "Área superior com dormitório, banheiro e sacada"
        ]
    },
    {
        id: 2,
        nome: "Comércio 01",
        tipo: "Comercial",
        area: 34.18,
        descricao: "Unidade comercial térrea com acesso próprio",
        detalhes: [
            "Pavimento térreo",
            "Acesso próprio",
            "Instalação sanitária prevista",
            "Ideal para consultórios, lojas ou serviços"
        ]
    },
    {
        id: 3,
        nome: "Comércio 02",
        tipo: "Comercial",
        area: 24.85,
        descricao: "Unidade comercial térrea com acesso próprio",
        detalhes: [
            "Pavimento térreo",
            "Acesso próprio",
            "Instalação sanitária prevista",
            "Espaço compacto e funcional"
        ]
    },
    {
        id: 4,
        nome: "Apartamento 101",
        tipo: "Residencial",
        area: 27.25,
        descricao: "Apartamento no pavimento superior",
        detalhes: [
            "Localizado no pavimento superior",
            "Ambientes conforme planta arquitetônica",
            "Acabamento moderno",
            "Ideal para moradia ou investimento"
        ]
    },
    {
        id: 5,
        nome: "Apartamento 102",
        tipo: "Residencial",
        area: 34.18,
        descricao: "Apartamento completo no pavimento superior",
        detalhes: [
            "Sala",
            "Cozinha",
            "Dormitório",
            "Banheiro",
            "Lavanderia",
            "Terraço",
            "Circulação conforme projeto"
        ]
    }
];

// ========== INICIALIZAÇÃO ========== 
document.addEventListener('DOMContentLoaded', function() {
    renderUnidades();
    setupEventListeners();
    setupFormSubmission();
});

// ========== RENDERIZAR UNIDADES ========== 
function renderUnidades() {
    const grid = document.getElementById('units-grid');
    
    if (!grid) return;

    grid.innerHTML = unidades.map(unidade => `
        <div class="unit-card" data-id="${unidade.id}">
            <div class="unit-card-header">
                <h3>${unidade.nome}</h3>
                <div class="unit-card-area">${unidade.area.toFixed(2)} m²</div>
            </div>
            <div class="unit-card-body">
                <span class="unit-type">${unidade.tipo}</span>
                <p>${unidade.descricao}</p>
                <div class="unit-description">
                    <ul>
                        ${unidade.detalhes.map(detalhe => `<li>${detalhe}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== EVENT LISTENERS ========== 
function setupEventListeners() {
    // Google Maps
    const btnMaps = document.getElementById('btn-maps');
    if (btnMaps) {
        btnMaps.addEventListener('click', function() {
            const coords = '-18.951440, -48.277750'; // Coordenadas aproximadas de Uberlândia
            const address = 'Rua Alexandre Marquez, 1131, Uberlândia, MG';
            window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank');
        });
    }

    // Google Earth
    const btnEarth = document.getElementById('btn-earth');
    if (btnEarth) {
        btnEarth.addEventListener('click', function() {
            const coords = '-18.951440, -48.277750';
            window.open(`https://earth.google.com/web/search/${coords}`, '_blank');
        });
    }

    // WhatsApp (Hero)
    const btnWhatsappHero = document.getElementById('btn-whatsapp');
    if (btnWhatsappHero) {
        btnWhatsappHero.addEventListener('click', abrirWhatsapp);
    }

    // WhatsApp (Footer)
    const btnWhatsappFooter = document.getElementById('btn-whatsapp-footer');
    if (btnWhatsappFooter) {
        btnWhatsappFooter.addEventListener('click', abrirWhatsapp);
    }

    // Cards das unidades - efeito hover
    document.querySelectorAll('.unit-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// ========== WHATSAPP ========== 
function abrirWhatsapp() {
    const numero = '5564992035821';
    const mensagem = encodeURIComponent(
        'Olá! Tenho interesse no conjunto patrimonial da Rua Alexandre Marquez, 1131. Gostaria de mais informações.'
    );
    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
}

// ========== FORMULÁRIO DE CONTATO ========== 
function setupFormSubmission() {
    const form = document.getElementById('contact-form');
    
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const mensagem = document.getElementById('mensagem').value;

        // Validação básica
        if (!nome || !email) {
            alert('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        // Simulação de envio (futuro: integrar com backend)
        console.log('Dados do contato:', {
            nome,
            email,
            telefone,
            mensagem,
            timestamp: new Date().toISOString()
        });

        // Redirecionar para WhatsApp com os dados
        const textoWhatsapp = encodeURIComponent(
            `Olá! Sou ${nome}. Tenho interesse no imóvel.\n\nEmail: ${email}\nTelefone: ${telefone}\n\nMensagem: ${mensagem}`
        );
        
        const numero = '5534999999999'; // ALTERAR COM O NÚMERO CORRETO
        window.open(`https://wa.me/${numero}?text=${textoWhatsapp}`, '_blank');

        // Limpar formulário
        form.reset();
        alert('Seus dados foram enviados! Você será redirecionado para o WhatsApp.');
    });
}

// ========== FUTURA INTEGRAÇÃO COM API ========== 
// Quando a API do NexoTerraCore estiver pronta, descomente e adapte:

/*
async function carregarUnidadesDAAPI() {
    try {
        const response = await fetch('/api/imoveis/29586/unidades');
        if (!response.ok) throw new Error('Erro ao carregar unidades');
        
        const dados = await response.json();
        unidades.length = 0;
        unidades.push(...dados);
        renderUnidades();
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Chamar ao inicializar se a API estiver disponível:
// carregarUnidadesDAAPI();
*/

// ========== LOGGING DE DEBUG ========== 
console.log('NexoTerraCore - Página de Vendas Inicializada');
console.log('Unidades carregadas:', unidades.length);
console.log('Documentação: area.docs() para acesso restrito');