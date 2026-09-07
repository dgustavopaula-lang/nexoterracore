function ntcoinsAuthContext(req, res, next) {
  const source =
    req.user ||
    req.auth ||
    req.session?.user ||
    req.session ||
    null;

  if (!source) {
    return res.status(401).json({
      ok: false,
      erro: 'Sessão não autenticada'
    });
  }

  const usuarioId =
    source.usuarioId ||
    source.usuario_id ||
    source.user_id ||
    source.id;

  const organizacaoId =
    source.organizacaoId ||
    source.organizacao_id ||
    source.organization_id ||
    source.tenant_id;

  const perfil =
    source.perfil ||
    source.role ||
    source.tipo ||
    source.perfis?.[0] ||
    'usuario';

  if (!usuarioId || !organizacaoId) {
    return res.status(401).json({
      ok: false,
      erro: 'Identidade autenticada sem usuário ou organização'
    });
  }

  req.ntcoinsAuth = {
    usuarioId: Number(usuarioId),
    organizacaoId: Number(organizacaoId),
    perfil: String(perfil)
  };

  next();
}

module.exports = {
  ntcoinsAuthContext
};
