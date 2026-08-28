const PERMISSOES = {
  proprietario: {
    maquinas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    sessoes: ["DELETE"]
  },
  administrador: {
    maquinas: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    sessoes: ["DELETE"]
  },
  gerente: {
    maquinas: ["GET", "POST", "PUT", "PATCH"],
    financeiro: ["GET", "POST", "PUT", "PATCH"]
  },
  operador: {
    maquinas: ["GET", "POST", "PUT", "PATCH"]
  },
  financeiro: {
    maquinas: ["GET"],
    financeiro: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  },
  consulta: {
    maquinas: ["GET"],
    financeiro: ["GET"]
  }
};

function temPermissao(perfis, recurso, metodo) {
  return perfis.some((perfil) =>
    PERMISSOES[perfil]?.[recurso]?.includes(metodo)
  );
}

module.exports = { PERMISSOES, temPermissao };
