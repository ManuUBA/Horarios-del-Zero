//---------------------------------------------
// CONFIG
//---------------------------------------------
const base = "https://manuuba.github.io/Horarios-de-labos-zero/";
async function cargarCSV(url) {
    const r = await fetch(url);
    const txt = await r.text();
    return txt.trim().split("\n").slice(1).map(l => l.split(","));
}

function horaADec(h) {
    const [H, M] = h.split(":").map(Number);
    return H + M / 60;
}
function decAHora(d) {
    const H = Math.floor(d);
    const M = Math.round((d - H) * 60);
    return `${String(H).padStart(2,"0")}:${String(M).padStart(2,"0")}`;
}

//---------------------------------------------
// Cargar horarios de un día
//---------------------------------------------
async function obtenerHorarios(dia) {
    const filas = await cargarCSV(`${base}${dia}.csv`);
    const datos = {};

    for (let [labo, ini, fin] of filas) {
        labo = parseInt(labo);
        if (!datos[labo]) datos[labo] = [];
        datos[labo].push([horaADec(ini), horaADec(fin)]);
    }
    return datos;
}

//---------------------------------------------
// Tiempo restante libre de un labo
//---------------------------------------------
async function tiempoRestante(labo, dia, hora) {
    const horarios = await obtenerHorarios(dia);
    const hdec = horaADec(hora);
    const turnos = horarios[labo] || [];
    const proximos = turnos.map(([ini]) => ini).filter(t => t > hdec);

    if (proximos.length) {
        const proximo = Math.min(...proximos);
        const min = Math.round((proximo - hdec) * 60);
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    }
    return "todo el día";
}

//---------------------------------------------
// Labos libres ahora
//---------------------------------------------
async function labosLibres(dia, hora) {
    const horarios = await obtenerHorarios(dia);
    const h = horaADec(hora);

    const libres = [];

    for (let labo in horarios) {
        const ocupado = horarios[labo].some(([ini, fin]) => ini <= h && h < fin);
        if (!ocupado) libres.push(parseInt(labo));
    }
    return libres.sort((a,b)=>a-b);
}

//---------------------------------------------
// Función auxiliar: detecta si un labo se libera en ≤ 30 min
//---------------------------------------------
function seLiberaEnMediaHora(intervalos, hdec) {
    const limite = hdec + 0.5; // 30 min
    for (let [ini, fin] of intervalos) {
        if (ini > hdec && ini <= limite) return ini;
    }
    return null;
}

//---------------------------------------------
// Aplicación principal
//---------------------------------------------
async function aplicacion(dia, hora) {

    const hdec = horaADec(hora);
    const horariosDia = await obtenerHorarios(dia);

    // Tabla 1: libres ahora
    const libresAhora = await labosLibres(dia, hora);
    const tiemposAhora = await Promise.all(
        libresAhora.map(l => tiempoRestante(l, dia, hora))
    );

    // Tabla 2: se liberan en 30 min
    const liberan = [];

    for (let labo in horariosDia) {
        labo = parseInt(labo);

        if (libresAhora.includes(labo)) continue;

        const turnos = horariosDia[labo];
        const ini = seLiberaEnMediaHora(turnos, hdec);

        if (ini !== null) {
            const minutos = Math.round((ini - hdec) * 60);
            const libreDespues = await tiempoRestante(labo, dia, decAHora(ini));

            liberan.push({
                labo,
                en: `${minutos} min`,
                librePor: libreDespues
            });
        }
    }

    return {
        ahora: { libres: libresAhora, tiempos: tiemposAhora },
        luego: liberan
    };
}

//---------------------------------------------
// UI
//---------------------------------------------
function obtenerDiaYHoraActual() {
    const ahora = new Date();
    const h = String(ahora.getHours()).padStart(2,"0");
    const m = String(ahora.getMinutes()).padStart(2,"0");
    const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    return { diaActual: dias[ahora.getDay()], horaActual: `${h}:${m}` };
}

window.onload = async () => {

    const { diaActual, horaActual } = obtenerDiaYHoraActual();
    document.getElementById("info-actual").innerText =
        `Día detectado: ${diaActual} — Hora detectada: ${horaActual}`;

    const r = await aplicacion(diaActual, horaActual);

    // -------------------------
    // Cargar tabla 1 (libres ahora)
    // -------------------------
    const t1 = document.getElementById("tabla-ahora");
    t1.innerHTML = "<tr><th>Labo</th><th>Tiempo libre</th></tr>";

    r.ahora.libres.forEach((l, i) => {
        t1.innerHTML += `<tr><td>${l}</td><td>${r.ahora.tiempos[i]}</td></tr>`;
    });

    // -------------------------
    // Cargar tabla 2 (se liberan en 30 min)
    // -------------------------
    const t2 = document.getElementById("tabla-luego");
    t2.innerHTML = "<tr><th>Labo</th><th>Se libera en</th><th>Tiempo libre después</th></tr>";

    r.luego.forEach(obj => {
        t2.innerHTML += `<tr>
            <td>${obj.labo}</td>
            <td>${obj.en}</td>
            <td>${obj.librePor}</td>
        </tr>`;
    });
};
