const PERMISSOES = {
  proprietario: {
    maquinas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    imoveis: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    fazendas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    geo: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    sessoes: ["DELETE"],
    control_plane: ["GET"]
  },

  administrador: {
    maquinas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    imoveis: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    fazendas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    geo: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    sessoes: ["DELETE"],
    control_plane: ["GET"]
  },

  gerente: {
    maquinas: ["GET", "POST", "PUT", "PATCH"],
    financeiro: ["GET", "POST", "PUT", "PATCH"],
    imoveis: ["GET", "POST", "PUT", "PATCH"],
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
  return perfis.some((perfil) =>
    PERMISSOES[perfil]?.[recurso]?.includes(metodo)
  );
}

module.exports = { PERMISSOES, temPermissao };
