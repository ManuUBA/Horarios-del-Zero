const base = "https://rawcdn.githack.com/ManuUBA/Horarios-de-labos-zero/main/data/";
const LABOS = Array.from({length: 10}, (_, i) => 1103 + i); // 1103..1112

// -------------------------------
//  Conversión de horas
// -------------------------------
function horaADec(h) {
    const [H, M] = h.split(":").map(Number);
    return H + M / 60;
}

function decAHora(dec) {
    const H = Math.floor(dec);
    const M = Math.round((dec - H) * 60);
    return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
}

// -------------------------------
//  Leer CSV real desde GitHub RAW
// -------------------------------
async function cargarCSV(dia) {
    const url = `${base}${dia}.csv`;
    const res = await fetch(url);
    const texto = await res.text();

    const filas = texto
        .split("\n")
        .map(l => l.split(","))
        .filter(f => f.length > 7);  // columnas suficientes

    const datos = {};

    for (const f of filas) {
        const pab = f[6]?.trim();
        const aula = parseInt(f[7]);
        const inicio = f[4]?.trim();
        const fin = f[5]?.trim();

        if (pab === "0" && LABOS.includes(aula) && inicio && fin) {
            if (!datos[aula]) datos[aula] = [];
            datos[aula].push([inicio, fin]);
        }
    }

    return datos;
}

// -------------------------------
//  Labos libres ahora
// -------------------------------
async function labosLibres(dia, hora) {
    const horarios = await cargarCSV(dia);
    const hdec = horaADec(hora);

    const libres = [];

    for (const labo of LABOS) {
        const turnos = horarios[labo] || [];
        const ocupado = turnos.some(([ini, fin]) => {
            const a = horaADec(ini);
            const b = horaADec(fin);
            return hdec >= a && hdec < b;
        });
        if (!ocupado) libres.push(labo);
    }

    return { horarios, libres };
}

// -------------------------------
//  Tiempo restante hasta el próximo turno
// -------------------------------
function tiempoRestante(labo, horarios, hora) {
    const h = horaADec(hora);
    const turnos = horarios[labo] || [];

    const futuros = turnos
        .map(([ini]) => horaADec(ini))
        .filter(t => t > h);

    if (!futuros.length) return "todo el día";

    const prox = Math.min(...futuros);
    const min = Math.round((prox - h) * 60);
    const H = Math.floor(min / 60);
    const M = min % 60;

    return `${String(H).padStart(2,"0")}:${String(M).padStart(2,"0")}`;
}

// -------------------------------
//  Se libera en ≤ 30 min?
// -------------------------------
function minutos(h) {
    const [H, M] = h.split(":").map(Number);
    return H * 60 + M;
}

function seLiberaEnMediaHora(turnos, ahoraMin) {
    for (const [ini, fin] of turnos) {
        const finMin = minutos(fin);
        if (finMin > ahoraMin && finMin <= ahoraMin + 30) {
            return finMin;
        }
    }
    return null;
}

// -------------------------------
//  FUNCIÓN PRINCIPAL
// -------------------------------
async function aplicacion(dia, hora) {
    const { horarios, libres } = await labosLibres(dia, hora);

    // Tabla 1
    const tiemposAhora = libres.map(l => tiempoRestante(l, horarios, hora));

    // Tabla 2
    const ahoraMin = minutos(hora);
    const liberaPronto = [];

    for (const labo of LABOS) {
        if (libres.includes(labo)) continue; // ya libre, no va acá

        const turnos = horarios[labo] || [];
        const fin = seLiberaEnMediaHora(turnos, ahoraMin);

        if (fin !== null) {
            const horaLiberacion = decAHora(fin / 60);
            liberaPronto.push({
                labo,
                seLiberaEn: horaLiberacion,
                librePor: tiempoRestante(labo, horarios, horaLiberacion)
            });
        }
    }

    return {
        ahora: {
            libres,
            tiempos: tiemposAhora
        },
        luego: liberaPronto
    };
}

// -------------------------------
//  AUTODETECCIÓN DE FECHA/HORA
// -------------------------------
function obtenerDiaYHoraActual() {
    const d = new Date();
    const dias = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
    const dia = dias[d.getDay()];
    const h = String(d.getHours()).padStart(2,"0");
    const m = String(d.getMinutes()).padStart(2,"0");
    return { dia, hora: `${h}:${m}` };
}

// -------------------------------
//  Render en HTML
// -------------------------------
window.onload = async () => {
    const { dia, hora } = obtenerDiaYHoraActual();

    document.getElementById("info-actual").innerText =
        `Día detectado: ${dia} — Hora detectada: ${hora}`;

    const r = await aplicacion(dia, hora);

    // Tabla 1
    const t1 = document.getElementById("tabla-ahora");
    t1.innerHTML = r.ahora.libres.map(
        (l, i) => `<tr><td>${l}</td><td>${r.ahora.tiempos[i]}</td></tr>`
    ).join("");

    // Tabla 2
    const t2 = document.getElementById("tabla-luego");
    t2.innerHTML = r.luego.map(
        o => `<tr><td>${o.labo}</td><td>${o.seLiberaEn}</td><td>${o.librePor}</td></tr>`
    ).join("");
};
