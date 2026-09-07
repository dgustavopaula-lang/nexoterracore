#!/usr/bin/env python3

import sys
import json
from decimal import Decimal

valores = [Decimal(v) for v in sys.argv[1:]]

if not valores:
    print(json.dumps({
        "erro": "Informe pelo menos um valor."
    }, ensure_ascii=False))
    raise SystemExit(1)

total = sum(valores)
media = total / len(valores)

resultado = {
    "quantidade_bens": len(valores),
    "patrimonio_total": float(total),
    "valor_medio": float(media),
    "maior_valor": float(max(valores)),
    "menor_valor": float(min(valores)),
    "cenario_valorizacao_5": float(total * Decimal("1.05")),
    "cenario_valorizacao_10": float(total * Decimal("1.10"))
}

print(json.dumps(resultado, ensure_ascii=False, indent=2))
