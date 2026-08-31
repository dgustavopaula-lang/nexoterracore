const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_KEY_LENGTH = 64;

async function criarHashSenha(senha) {
  if (typeof senha !== "string" || senha.length < 8 || senha.length > 200) {
    throw new Error("A senha deve ter entre 8 e 200 caracteres.");
  }

  const salt = crypto.randomBytes(32);
  const hash = await scrypt(senha, salt, PASSWORD_KEY_LENGTH, SCRYPT_OPTIONS);

  return {
    senhaHash: hash.toString("hex"),
    senhaSalt: salt.toString("hex")
  };
}

async function verificarSenha(senha, senhaHash, senhaSalt) {
  if (
    typeof senha !== "string" ||
    typeof senhaHash !== "string" ||
    typeof senhaSalt !== "string"
  ) {
    return false;
  }

  try {
    const hashEsperado = Buffer.from(senhaHash, "hex");
    const hashRecebido = await scrypt(
      senha,
      Buffer.from(senhaSalt, "hex"),
      hashEsperado.length,
      SCRYPT_OPTIONS
    );

    return (
      hashEsperado.length === hashRecebido.length &&
      crypto.timingSafeEqual(hashEsperado, hashRecebido)
    );
  } catch {
    return false;
  }
}

function criarTokenSessao() {
  return crypto.randomBytes(32).toString("base64url");
}

function criarDesafioLogin() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

module.exports = {
  criarHashSenha,
  verificarSenha,
  criarTokenSessao,
  criarDesafioLogin,
  hashToken
};
