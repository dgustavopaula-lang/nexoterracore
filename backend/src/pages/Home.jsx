import React from "react";

const cards = [
  ["NexoTerraCore / API", "Núcleo central, saúde, rotas e integrações reais."],
  ["Turing", "Inteligência, treinamento e decisões conectadas à API."],
  ["Radar / Sentinel", "Território, Copernicus, Sentinel e monitoramento."],
  ["Mini-softwares", "Produtos comerciais integrados ao ecossistema."],
  ["EduTech", "Projetos educacionais e inteligência aplicada."],
  ["Angola", "Laboratório territorial e expansão regional."],
];

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#111",
      color: "#fff",
      padding: "32px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{maxWidth: 1400, margin: "0 auto"}}>
        <div style={{marginBottom: 30}}>
          <div style={{fontSize: 13, color: "#ff5a00", fontWeight: 700, letterSpacing: 1}}>
            GPS.dev • CENTRAL OPERACIONAL
          </div>
          <h1 style={{fontSize: 38, margin: "8px 0 6px"}}>Home</h1>
          <p style={{color: "#aaa", margin: 0}}>
            NexoTerraCore, Turing e módulos integrados em uma única visão.
          </p>
        </div>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 18
        }}>
          {cards.map(([title, desc]) => (
            <div key={title} style={{
              background: "#191919",
              border: "1px solid #2b2b2b",
              borderRadius: 14,
              padding: 22
            }}>
              <div style={{fontSize: 20, fontWeight: 700, marginBottom: 10}}>
                {title}
              </div>
              <div style={{color: "#aaa", lineHeight: 1.5}}>
                {desc}
              </div>
            </div>
          ))}
        </section>

        <section style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 18
        }}>
          <div style={{
            background: "#191919",
            border: "1px solid #2b2b2b",
            borderRadius: 14,
            padding: 22
          }}>
            <h2 style={{marginTop: 0}}>Status do núcleo</h2>
            <div id="api-status" style={{color: "#bbb"}}>
              API: aguardando leitura real
            </div>
            <div style={{color: "#bbb", marginTop: 8}}>
              Turing: aguardando leitura real
            </div>
            <div style={{color: "#bbb", marginTop: 8}}>
              Radar: aguardando integração
            </div>
          </div>

          <div style={{
            background: "#191919",
            border: "1px solid #2b2b2b",
            borderRadius: 14,
            padding: 22
          }}>
            <h2 style={{marginTop: 0}}>Prioridade</h2>
            <div style={{color: "#ff6a00", fontWeight: 700}}>
              Finalizar migração do painel
            </div>
            <div style={{color: "#aaa", marginTop: 10}}>
              Depois: corrigir rotas, duplicações e integrar Turing/API real.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
