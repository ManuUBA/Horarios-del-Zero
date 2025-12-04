// Solo estos labos son válidos
const LABOS_VALIDOS = [
  1103,1104,1105,1106,1107,1108,1109,1110,1111,1112
];

// Cargar CSV y filtrar correctamente
async function cargarHorarios(dia) {
    const url = `${base}${dia}.csv`;
    const resp = await fetch(url);
    const texto = await resp.text();

    const lineas = texto.split("\n").map(l => l.split(","));
    
    // Buscar fila del header (la que tiene "Aula")
    let headerIndex = lineas.findIndex(f => 
        f.some(x => x.trim().toLowerCase() === "aula")
    );

    if (headerIndex === -1) {
        console.error("No se encontró header en el CSV");
        return {};
    }

    const header = lineas[headerIndex].map(h => h.trim());
    const data = lineas.slice(headerIndex + 1);

    const iDia   = header.findIndex(h => h.toLowerCase() === "día");
    const iIni   = header.findIndex(h => h.toLowerCase() === "inicio");
    const iFin   = header.findIndex(h => h.toLowerCase() === "fin");
    const iPab   = header.findIndex(h => h.toLowerCase() === "pab.");
    const iAula  = header.findIndex(h => h.toLowerCase() === "aula");

    const horarios = {};

    for (let fila of data) {
        const pab = fila[iPab]?.trim();
        const aula = fila[iAula]?.trim();

        // ❌ Filtrar textos, fechas, “Sala A”, “Aula”, “Labo 1”
        if (!/^\d+$/.test(aula)) continue;

        const aulaNum = parseInt(aula);

        // ❌ Filtrar aulas que no sean labos válidos
        if (!LABOS_VALIDOS.includes(aulaNum)) continue;

        // ❌ Filtrar pabellones que no sean 0
        if (pab !== "0") continue;

        // Agregar turno
        const ini = fila[iIni]?.trim();
        const fin = fila[iFin]?.trim();

        if (!horarios[aulaNum]) horarios[aulaNum] = [];
        horarios[aulaNum].push([ini, fin]);
    }

    return horarios;
}
