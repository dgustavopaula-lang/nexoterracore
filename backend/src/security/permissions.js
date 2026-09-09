const PERMISSOES = {
  proprietario: {
    maquinas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    imoveis: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    clientes: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    fazendas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    geo: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    agenda: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    projetos: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    configuracoes: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    sessoes: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    control_plane: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  },

  administrador: {
    maquinas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    imoveis: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    clientes: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    fazendas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    geo: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    configuracoes: ["GET", "POST", "PUT", "PATCH"],
    sessoes: ["DELETE"],
    control_plane: ["GET"]
  },

  gerente: {
    maquinas: ["GET", "POST", "PUT", "PATCH"],
    financeiro: ["GET", "POST", "PUT", "PATCH"],
    imoveis: ["GET", "POST", "PUT", "PATCH"],
    clientes: ["GET", "POST", "PUT", "PATCH"],
    fazendas: ["GET", "POST", "PUT", "PATCH"],
    geo: ["GET", "POST", "PUT", "PATCH"]
  },

  operador: {
    maquinas: ["GET", "POST", "PUT", "PATCH"],
    fazendas: ["GET"],
    geo: ["GET"]
  },

  financeiro: {
    maquinas: ["GET"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    imoveis: ["GET"],
    fazendas: ["GET"],
    geo: ["GET"]
  },

  consulta: {
    maquinas: ["GET"],
    financeiro: ["GET"],
    imoveis: ["GET"],
    fazendas: ["GET"],
    geo: ["GET"]
  }
};

function temPermissao(perfis, recurso, metodo) {
  if (perfis.includes("proprietario")) {
    return true;
  }

  return perfis.some((perfil) =>
    PERMISSOES[perfil]?.[recurso]?.includes(metodo)
  );
}

module.exports = { PERMISSOES, temPermissao };
