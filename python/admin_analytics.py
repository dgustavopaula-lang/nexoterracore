import sys
import json

try:
    dados = json.load(sys.stdin)
except Exception:
    dados = {}

imoveis = dados.get("imoveis", [])
clientes = dados.get("clientes", [])

valores = []

for item in imoveis:
    try:
        valores.append(float(item.get("valor") or 0))
    except Exception:
        valores.append(0)

total_patrimonio = sum(valores)
media_imovel = total_patrimonio / len(valores) if valores else 0

resultado = {
    "motor": "Python",
    "imoveis": len(imoveis),
    "clientes": len(clientes),
    "patrimonio_total": round(total_patrimonio, 2),
    "valor_medio_imovel": round(media_imovel, 2),
    "status": "analise_concluida"
}

print(json.dumps(resultado, ensure_ascii=False))
