async function obtenerHorarios(url) {
const horarios = await obtenerHorarios(`${base}${dia}.csv`);
const hdec = horaADec(hora);


const turnos = horarios[labo] || [];
const proximos = turnos
.map(([ini]) => horaADec(ini))
.filter(t => t > hdec);


if (proximos.length) {
const proximo = Math.min(...proximos);
const min = Math.round((proximo - hdec) * 60);
const h = Math.floor(min/60);
const m = min % 60;
return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}


return "todo el día";
}


async function aplicacion(dia, hora) {
const libres = await labosLibres(dia, hora);
const tiempos = await Promise.all(libres.map(l => tiempoRestante(l, dia, hora)));


let hdec = horaADec(hora);
let fraccion = hdec - Math.floor(hdec);
if (fraccion > 0.5) hdec = Math.floor(hdec) + 1;
else hdec = Math.floor(hdec) + 0.5;


const hora2 = decAHora(hdec);
const libres2 = await labosLibres(dia, hora2);
const nuevos = libres2.filter(x => !libres.includes(x));


const tiempos2 = await Promise.all(nuevos.map(n => tiempoRestante(n, dia, hora2)));


return {
ahora: { libres, tiempos },
luego: nuevos.length ? { hora: hora2, libres: nuevos, tiempos: tiempos2 } : null
};
}


function obtenerDiaYHoraActual() {
const ahora = new Date();
const h = String(ahora.getHours()).padStart(2,"0");
const m = String(ahora.getMinutes()).padStart(2,"0");
const dias = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
return { diaActual: dias[ahora.getDay()], horaActual: `${h}:${m}` };
}


window.onload = async () => {
const { diaActual, horaActual } = obtenerDiaYHoraActual();


document.getElementById("info-actual").innerText = `Día detectado: ${diaActual} — Hora detectada: ${horaActual}`;


const r = await aplicacion(diaActual, horaActual);


document.getElementById("resultado").innerText = JSON.stringify(r, null, 2);
};
