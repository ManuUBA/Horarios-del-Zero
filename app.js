// =========================
//  redondeo al próximo bloque de 30 min
// =========================
function proximoBloqueMediaHora(hora) {
    const [h, m] = hora.split(":").map(Number);
    if (m < 30) return `${String(h).padStart(2,'0')}:30`;
    if (m >= 30) return `${String((h+1)%24).padStart(2,'0')}:00`;
}

// =========================
// cargar CSV
// =========================
async function cargarCSV(url) {
    const res = await fetch(url);
    const texto = await res.text();
    const lineas = texto.trim().split("\n").slice(1);
    const horarios = {};

    for (const lin of lineas) {
        const cols = lin.split(",");
        const aula = cols[7];
        const ini = cols[4];
        const fin = cols[5];

        if (!aula || !ini || !fin) continue;

        if (!horarios[aula]) horarios[aula] = [];
        horarios[aula].push([ini, fin]);
    }

    return horarios;
}

function horaADec(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h + m/60;
}

// cuánto falta hasta que se desocupa
function minutosHasta(hActual, hFin) {
    return Math.round((horaADec(hFin) - horaADec(hActual)) * 60);
}

// tiempo libre después de que quede vacío
function tiempoLibreDespues(hFin, turnos) {
    const finDec = horaADec(hFin);
    let min = Infinity;

    for (const [ini] of turnos) {
        const iniDec = horaADec(ini);
        if (iniDec > finDec) {
            const diff = (iniDec - finDec) * 60;
            if (diff < min) min = diff;
        }
    }
    return min === Infinity ? "todo el día" : `${min} min`;
}

// tiempo libre ahora (para labos ya libres)
function tiempoLibreAhora(horaActual, turnos) {
    const h = horaADec(horaActual);
    let min = Infinity;

    for (const [ini] of turnos) {
        const iniDec = horaADec(ini);
        if (iniDec > h) {
            const diff = (iniDec - h) * 60;
            if (diff < min) min = diff;
        }
    }
    return min === Infinity ? "todo el día" : `${min} min`;
}

// =========================
// lógica principal
// =========================
async function actualizar() {
    const dias = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
    const hoy = new Date();
    const dia = dias[hoy.getDay()];
    const horaActual = `${String(hoy.getHours()).padStart(2,"0")}:${String(hoy.getMinutes()).padStart(2,"0")}`;

    document.getElementById("info-actual").innerText =
        `Día detectado: ${dia} — Hora detectada: ${horaActual}`;

    const url = `https://raw.githubusercontent.com/ManuUBA/Horarios-de-labos-zero/main/data/${dia}.csv`;
    const horarios = await cargarCSV(url);

    const libresAhora = [];
    const seLiberan = [];

    for (const aula in horarios) {
        const turnos = horarios[aula];

        let ocupada = false;
        let horaFin = null;

        for (const [ini, fin] of turnos) {
            if (horaADec(ini) <= horaADec(horaActual) && horaADec(horaActual) < horaADec(fin)) {
                ocupada = true;
                horaFin = fin;
                break;
            }
        }

        if (!ocupada) {
            const tl = tiempoLibreAhora(horaActual, turnos);
            libresAhora.push([aula, tl]);
        } else {
            const minutos = minutosHasta(horaActual, horaFin);
            if (minutos <= 30) {
                const tl = tiempoLibreDespues(horaFin, turnos);
                seLiberan.push([aula, tl]);
            }
        }
    }

    // render tabla libres
    const t1 = document.getElementById("tabla-libres");
    t1.innerHTML = libresAhora.map(([a, t]) =>
        `<tr><td>${a}</td><td>${t}</td></tr>`
    ).join("");

    // Título dinámico
    const bloque = proximoBloqueMediaHora(horaActual);
    document.getElementById("titulo-liberan").innerText =
        `🕒 Labos que se liberan a las ${bloque}`;

    // render tabla se liberan
    const t2 = document.getElementById("tabla-liberan");
    t2.innerHTML = seLiberan.map(([a, t]) =>
        `<tr><td>${a}</td><td>${t}</td></tr>`
    ).join("");
}

window.onload = actualizar;
