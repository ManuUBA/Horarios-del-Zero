const dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const labos = Array.from({ length: 10 }, (_, i) => 1103 + i);
const baseUrl = "https://rawcdn.githack.com/ManuUBA/Horarios-zero/main/data/";

// ----------- Utilidades de tiempo -----------
function horaADecimal(hora) {
  const [h, m] = hora.split(":").map(n => parseInt(n) || 0);
  return h + m / 60;
}

function decimalAHora(dec) {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

// ----------- CSV -----------
async function cargarCsv(dia) {
  const res = await fetch(`${baseUrl}${dia}.csv`);
  if (!res.ok) throw new Error("No se pudo descargar el CSV");
  return res.text();
}

function parseCsv(text) {
  return text.split(/\r?\n/).map(row => row.split(",").map(c => c.trim()));
}

function buscarHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => String(c).toLowerCase().includes("aula")))
      return i;
  }
  return -1;
}

function construirHorarios(rows, hdr) {
  const header = rows[hdr].map(h => h.toLowerCase());
  const data = rows.slice(hdr + 1);

  const col = name => {
    const idx = header.findIndex(h => h.includes(name));
    if (idx < 0) throw new Error("Columna faltante: " + name);
    return idx;
  };

  const cAula = col("aula");
  const cIni  = col("inicio");
  const cFin  = col("fin");
  const cPab  = col("pab");

  const horarios = {};
  labos.forEach(l => horarios[l] = []);

  for (const f of data) {
    if (!f || !f.length) continue;
    try {
      const pab = (f[cPab] || "").trim();
      const aula = parseInt(f[cAula]);
      if (pab === "0" && labos.includes(aula)) {
        horarios[aula].push([f[cIni], f[cFin]]);
      }
    } catch (_) {}
  }
  return horarios;
}

// ----------- Lógica de horarios -----------
function estaOcupado(turnos, horaDec) {
  for (const [iniStr, finStr] of turnos) {
    const ini = horaADecimal(iniStr);
    const fin = horaADecimal(finStr);
    if (ini <= horaDec && horaDec < fin)
      return true;
  }
  return false;
}

function labosLibres(horarios, hora) {
  const h = horaADecimal(hora);
  return Object.keys(horarios)
    .filter(l => !estaOcupado(horarios[l], h))
    .map(Number);
}

function tiempoRestante(horarios, labo, hora) {
  const h = horaADecimal(hora);
  const turnos = horarios[labo];

  const proximos = turnos
    .map(([ini]) => horaADecimal(ini))
    .filter(x => x > h);

  if (!proximos.length) return "todo el día";

  const prox = Math.min(...proximos);
  const diffMin = Math.round((prox - h) * 60);

  return `${String(Math.floor(diffMin / 60)).padStart(2,"0")}:${String(diffMin % 60).padStart(2,"0")}`;
}

function aplicar(horarios, hora) {
  const libresNow = labosLibres(horarios, hora);
  const tiemposNow = libresNow.map(l => tiempoRestante(horarios, l, hora));

  const hDec = horaADecimal(hora);
  const min = (hDec - Math.floor(hDec)) * 60;
  const nextDec = min > 30 ? Math.floor(hDec) + 1 : Math.floor(hDec) + 0.5;
  const horaNext = decimalAHora(nextDec);

  const libresNext = labosLibres(horarios, horaNext);
  const nuevos = libresNext.filter(l => !libresNow.includes(l));
  const tiemposNext = nuevos.map(l => tiempoRestante(horarios, l, horaNext));

  return { libresNow, tiemposNow, nuevos, tiemposNext, horaNext };
}

// ----------- React UI -----------
function App() {
  const [dia, setDia] = React.useState("Lunes");
  const [hora, setHora] = React.useState("14:30");
  const [resultado, setResultado] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [cache, setCache] = React.useState({});

  const calcular = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      let horarios = cache[dia];

      if (!horarios) {
        const text = await cargarCsv(dia);
        const rows = parseCsv(text);
        const hdr = buscarHeader(rows);
        horarios = construirHorarios(rows, hdr);

        setCache(prev => ({ ...prev, [dia]: horarios }));
      }

      const r = aplicar(horarios, hora);
      setResultado(r);

    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex justify-center p-6">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-3xl">

        <h1 className="text-2xl font-bold">Labos — Disponibilidad</h1>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label>Día</label>
            <select className="w-full p-2 border rounded"
              value={dia} onChange={e => setDia(e.target.value)}>
              {dias.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label>Hora</label>
            <input className="w-full p-2 border rounded"
              value={hora} onChange={e => setHora(e.target.value)} />
          </div>

          <button onClick={calcular}
            className="bg-indigo-600 text-white p-2 rounded">
            {loading ? "Cargando..." : "Calcular"}
          </button>
        </div>

        {error && <div className="text-red-600 mt-4">{error}</div>}

        {resultado && (
          <div className="mt-4 space-y-4">

            <div className="p-3 bg-slate-100 rounded">
              <b>Libres ahora:</b> {resultado.libresNow.join(", ") || "Ninguno"}
              <div className="text-sm text-slate-600">
                <b>Tiempo restante hasta la próxima clase:{resultado.tiemposNow.join(" | ")}</b>
              </div>
            </div>

            {resultado.nuevos.length > 0 ? (
              <div className="p-3 bg-emerald-100 rounded">
                <b>Libres desde {resultado.horaNext}:</b>{" "}
                {resultado.nuevos.join(", ")}
                <div className="text-sm text-slate-600">
                  <b>Tiempo restante hasta la próxima clase:{resultado.tiemposNext.join(" | ")}</b>
                </div>
              </div>
            ) : (
              <div className="text-slate-500">
                No hay nuevos labos libres para {resultado.horaNext}.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
