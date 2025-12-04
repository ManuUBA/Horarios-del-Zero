// =========================
// CONFIG
// =========================

const base = "https://rawcdn.githack.com/ManuUBA/Horarios-de-labos-zero/main/data/";
const labos = Array.from({ length: 10 }, (_, i) => 1103 + i); 
const diasValidos = ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];

// =========================
// UTILIDADES DE HORA
// =========================

function horaADec(h) {
    const [hh, mm] = h.split(":").map(Number);
    return hh + mm/60;
}

function decAHora(dec) {
    const h = Math.floor(dec);
    const m = Math.round((dec - h)*60);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

// =========================
// LECTURA CSV
// =========================

async function obtenerHorarios(dia) {
    const url = `${base}${dia}.csv`;
    const txt = await fetch(url).then(r => r.text());

    const lineas = txt.split("\n").map(l => l.split(","));
    let idxHeader = lineas.findIndex(
        row => row.some(c => c.toLowerCase().includes("aula"))
    );

    if (idxHeader === -1) return {};

    const header = lineas[idxHeader].map(h => h.trim().toLowerCase());
    const datos = lineas.slice(idxHeader + 1);

    function col(name) {
        return header.findIndex(h => h.includes(name.toLowerCase()));
    }

    const cAula = col("aula");
    const cIni  = col("inicio");
    const cFin  = col("fin");
    const cPab  = col("pab");

    const horarios = {};
    labos.forEach(l => horarios[l] = []);

    for (const f of datos) {
        if (!f[cPab]) continue;
        if (f[cPab].trim() !== "0") continue;

        const aula = Number(f[cAula]);
        if (!labos.includes(aula)) continue;

        horarios[aula].push([f[cIni].trim(), f[cFin].trim()]);
    }

    return horarios;
}

// =========================
// FUNCIONES PRINCIPALES
// =========================

async function labosLibres(dia, hora) {
    const hdec = horaADec(hora);
    const horarios = await obtenerHorarios(dia);

    const libres = [];

    for (const labo of labos) {
        const turnos = horarios[labo] || [];
        const ocupado = turnos.some(([ini, fin]) => {
            const a = horaADec(ini);
            const b = horaADec(fin);
            return a <= hdec && hdec < b;
        });

        if (!ocupado) libres.push(labo);
    }

    return libres;
}

async function tiempoRestante(labo, dia, hora) {
    const hdec = horaADec(hora);
    const horarios = await obtenerHorarios(dia);
    const turnos = horarios[labo] || [];

    const proximos = turnos
        .map(([ini]) => horaADec(ini))
        .filter(t => t > hdec);

    if (proximos.length === 0) return "todo el día";

    const proximo = Math.min(...proximos);
    const min = Math.round((proximo - hdec)*60);

    const h = Math.floor(min/60);
    const m = min % 60;

    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

async function aplicacion(dia, hora) {
    const libres = await labosLibres(dia, hora);
    const tiempos = await Promise.all(libres.map(l => tiempoRestante(l, dia, hora)));

    // Media hora siguiente o hora siguiente
    let hdec = horaADec(hora);
    let frac = hdec - Math.floor(hdec);

    if (frac > 0.5) hdec = Math.floor(hdec) + 1;
    else hdec = Math.floor(hdec) + 0.5;

    const hora2 = decAHora(hdec);

    const libres2 = await labosLibres(dia, hora2);
    const nuevos = libres2.filter(l => !libres.includes(l));
    const tiempos2 = await Promise.all(nuevos.map(l => tiempoRestante(l, dia, hora2)));

    return {
        ahora: { libres, tiempos },
        luego: nuevos.length ? { hora: hora2, libres: nuevos, tiempos: tiempos2 } : null
    };
}

// =========================
// DETECCIÓN DÍA/HORA ACTUAL
// =========================

function obtenerDiaYHoraActual() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,"0");
    const mm = String(now.getMinutes()).padStart(2,"0");

    const dias = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
    return {
        diaActual: dias[now.getDay()],
        horaActual: `${hh}:${mm}`
    };
}

// =========================
// INICIO AUTOMÁTICO
// =========================

window.onload = async () => {
    const { diaActual, horaActual } = obtenerDiaYHoraActual();

    document.getElementById("info-actual").innerText =
        `Día detectado: ${diaActual} — Hora detectada: ${horaActual}`;

    const r = await aplicacion(diaActual, horaActual);

    document.getElementById("resultado").innerText =
        JSON.stringify(r, null, 2);
};
