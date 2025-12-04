// Solo estos labos son válidos
const LABOS_VALIDOS = [
  1103,1104,1105,1106,1107,1108,1109,1110,1111,1112
];

async function cargarHorarios(dia) {
    const url = `${base}${dia}.csv`;
    const resp = await fetch(url);
    const texto = await resp.text();

    // Limpieza robusta del CSV
    const lineas = texto
        .split("\n")
        .map(l => l.replace(/\r/g, "").split(",").map(x => x.trim()));

    // Buscar encabezado
    const headerIndex = lineas.findIndex(fila =>
        fila.some(x => x.toLowerCase() === "aula")
    );

    if (headerIndex === -1) {
        console.error("No se encontró header en el CSV");
        return {};
    }

    const header = lineas[headerIndex];
    const data = lineas.slice(headerIndex + 1);

    const iDia  = header.findIndex(h => h.toLowerCase() === "día");
    const iIni  = header.findIndex(h => h.toLowerCase() === "inicio");
    const iFin  = header.findIndex(h => h.toLowerCase() === "fin");
    const iPab  = header.findIndex(h => h.toLowerCase() === "pab.");
    const iAula = header.findIndex(h => h.toLowerCase() === "aula");

    const horarios = {};

    for (let fila of data) {
        // Si es una línea vacía, skip
        if (!fila || fila.length < 5) continue;

        const pab  = fila[iPab];
        const aula = fila[iAula];

        // Saltear aulas vacías o no numéricas
        if (!aula || !/^[0-9]+$/.test(aula)) continue;

        const aulaNum = Number(aula);

        // Filtrar solo labos válidos
        if (!LABOS_VALIDOS.includes(aulaNum)) continue;

        // Solo pabellón 0
        if (pab !== "0") continue;

        const ini = fila[iIni];
        const fin = fila[iFin];

        // Saltar horarios vacíos (causa principal del “todo el día”)
        if (!ini || !fin) continue;

        if (!horarios[aulaNum]) horarios[aulaNum] = [];
        horarios[aulaNum].push([ini, fin]);
    }

    return horarios;
}
