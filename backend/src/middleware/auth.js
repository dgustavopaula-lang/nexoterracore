const { hashToken } = require("../security/credentials");
const { temPermissao } = require("../security/permissions");

function criarMiddlewaresAuth(pool) {
  async function autenticar(req, res, next) {
    const cabecalho = req.get("authorization") || "";
    const correspondencia = cabecalho.match(/^Bearer ([A-Za-z0-9_-]{40,200})$/);

    if (!correspondencia) {
      return res.status(401).json({ erro: "Autenticação necessária." });
    }

    try {
      const resultado = await pool.query(
        `
          SELECT
            s.id AS sessao_id,
            s.usuario_id,
            s.organizacao_id,
            s.fazenda_id,
            s.expira_em,
            u.nome AS usuario_nome,
            u.email AS usuario_email,
            po.codigo AS perfil_organizacao,
            pf.codigo AS perfil_fazenda
          FROM sessoes_usuario s
          JOIN usuarios u
            ON u.id = s.usuario_id
           AND u.ativo = TRUE
          JOIN organizacoes o
            ON o.id = s.organizacao_id
           AND o.ativo = TRUE
          JOIN fazendas f
            ON f.id = s.fazenda_id
           AND f.organizacao_id = s.organizacao_id
           AND f.ativo = TRUE
          JOIN usuarios_organizacoes uo
            ON uo.usuario_id = s.usuario_id
           AND uo.organizacao_id = s.organizacao_id
           AND uo.ativo = TRUE
          JOIN perfis_acesso po ON po.id = uo.perfil_id
          JOIN usuarios_fazendas uf
            ON uf.usuario_id = s.usuario_id
           AND uf.organizacao_id = s.organizacao_id
           AND uf.fazenda_id = s.fazenda_id
           AND uf.ativo = TRUE
          JOIN perfis_acesso pf ON pf.id = uf.perfil_id
          WHERE s.token_hash = $1
            AND s.revogada_em IS NULL
            AND s.expira_em > NOW()
        `,
        [hashToken(correspondencia[1])]
      );

      if (!resultado.rowCount) {
        return res.status(401).json({ erro: "Sessão inválida ou expirada." });
      }

      const sessao = resultado.rows[0];
      req.auth = {
        sessaoId: Number(sessao.sessao_id),
        usuarioId: Number(sessao.usuario_id),
        organizacaoId: Number(sessao.organizacao_id),
        fazendaId: Number(sessao.fazenda_id),
        usuarioNome: sessao.usuario_nome,
        usuarioEmail: sessao.usuario_email,
        perfis: [sessao.perfil_organizacao, sessao.perfil_fazenda]
      };

      await pool.query(
        "UPDATE sessoes_usuario SET ultimo_uso_em = NOW() WHERE id = $1",
        [req.auth.sessaoId]
      );

      next();
    } catch (erro) {
      next(erro);
    }
  }

  function autorizar(recurso, metodo) {
    return (req, res, next) => {
      if (!temPermissao(req.auth.perfis, recurso, metodo)) {
        return res.status(403).json({ erro: "Permissão insuficiente." });
      }

      next();
    };
  }

  return { autenticar, autorizar };
}

module.exports = { criarMiddlewaresAuth };
