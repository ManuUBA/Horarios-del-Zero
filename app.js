async function cargarCSV(dia) {
  const url = `https://raw.githubusercontent.com/ManuUBA/Horarios-de-labos-zero/main/data/${dia}.csv`;
  const resp = await fetch(url);
  const texto = await resp.text();
  const lineas = texto.split("\n").slice(1);

  return lineas
    .map(l => l.split(","))
    .filter(cols => cols.length >= 8 && cols[7].trim() !== "")
    .map(cols => ({
      inicio: cols[4].trim(),
      fin: cols[5].trim(),
      aula: parseInt(cols[7].trim())
    }));
}

function aMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function minutosAHora(min) {
  if (min === Infinity) return "todo el día";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

async function aplicacion() {
  const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const hoy = new Date();
  const dia = dias[hoy.getDay()];
  const horaActual = `${String(hoy.getHours()).padStart(2,"0")}:${String(hoy.getMinutes()).padStart(2,"0")}`;
  const ahoraMin = aMinutos(horaActual);

  document.getElementById("info").innerText =
    `Día detectado: ${dia} — Hora detectada: ${horaActual}`;

  const clases = await cargarCSV(dia);
  const aulas = [...new Set(clases.map(c => c.aula))];

  let libresAhora = [];
  let seLiberanPronto = [];

  for (let aula of aulas) {
    const ocupaciones = clases.filter(c => c.aula === aula);
    let estaOcupado = false;
    let finActual = Infinity;

    for (let c of ocupaciones) {
      const ini = aMinutos(c.inicio);
      const fin = aMinutos(c.fin);

      if (ini <= ahoraMin && ahoraMin < fin) {
        estaOcupado = true;
        finActual = fin;
      }
    }

    if (!estaOcupado) {
      // Tiempo libre hasta la próxima clase
      const proximas = ocupaciones
        .map(c => aMinutos(c.inicio))
        .filter(t => t > ahoraMin);

      const tiempoLibre = proximas.length > 0 ? proximas[0] - ahoraMin : Infinity;
      libresAhora.push({ aula, tiempoLibre });
    } else {
      // Se libera en <= 30 min
      const minutosRestantes = finActual - ahoraMin;
      if (minutosRestantes <= 30) {
        // Calculamos cuánto tiempo queda libre DESPUÉS de que se libera
        const proximasDespues = ocupaciones
          .map(c => aMinutos(c.inicio))
          .filter(t => t > finActual);

        const tiempoLibre = proximasDespues.length > 0 ? proximasDespues[0] - finActual : Infinity;

        seLiberanPronto.push({
          aula,
          tiempoLibre
        });
      }
    }
  }

  // Pintar tablas
  const tbodyAhora = document.querySelector("#tablaAhora tbody");
  const tbodyLuego = document.querySelector("#tablaLuego tbody");

  tbodyAhora.innerHTML = "";
  tbodyLuego.innerHTML = "";

  libresAhora.forEach(l =>
    tbodyAhora.innerHTML += `<tr><td>${l.aula}</td><td>${minutosAHora(l.tiempoLibre)}</td></tr>`
  );

  seLiberanPronto.forEach(l =>
    tbodyLuego.innerHTML += `<tr><td>${l.aula}</td><td>${minutosAHora(l.tiempoLibre)}</td></tr>`
  );
}

aplicacion();
