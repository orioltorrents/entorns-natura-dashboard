// URL de l'aplicació web obtinguda en desplegar el teu Google Apps Script
// RECORDA: Enganxa aquí la teva URL final (la que acaba en /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymjQRuWBGwh3QWnQoQ_qxoahY2Z7gtcwwbt5QgKDvtpi9dm-bl0qYrQdk5cJwp7yKgCA/exec";

// Variables globals d'estat de l'aplicació
let llistaProjectes = [];
let dadesProjecteActual = [];
let columnesNotesDisponibles = [];
let chartInstance = null;

// Enllaços als elements de la interfície de l'HTML (DOM)
const selectProjecte = document.getElementById('select-projecte');
const selectColumna = document.getElementById('select-columna');
const selectGrup = document.getElementById('select-grup');
const selectRol = document.getElementById('select-rol');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const chartTitle = document.getElementById('chart-title');
const taulaCaps = document.getElementById('taula-caps');
const taulaCos = document.getElementById('taula-cos');

// Paraules clau per identificar quines columnes del full NO són notes numèriques
const COLUMNES_ORGANITZATIVES = [
    'id', 'foto', 'email', 'grup', 'grup-classe', 'classe', 'gènere', 
    'cognoms, nom', 'nom', 'cognoms', 'codi_grup_3t', 'rol', 'url', 'descripcio', 'comentari'
];

// Inicialització en carregar la pàgina web
document.addEventListener('DOMContentLoaded', () => {
    inicialitzarAplicacio();
});

function inicialitzarAplicacio() {
    mostrarEstat("Carregant l'índex mestre de projectes...");
    
    // Petició inicial a Apps Script per obtenir la llista de sheets configurats
    const urlConsulta = `${APPS_SCRIPT_URL}?accio=obtenir_index`;
    
    fetch(urlConsulta)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                llistaProjectes = data.dades;
                omplirDesplegableProjectes(llistaProjectes);
                amagarEstat();
            } else {
                mostrarError("Error de l'script: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error en carregar l'índex:", error);
            mostrarError("No s'ha pogut connectar amb Google Apps Script. Revisa la URL.");
        });

    // Configuració dels esdeveniments de canvi (Listeners)
    selectProjecte.addEventListener('change', ferCanviProjecte);
    selectColumna.addEventListener('change', actualitzarFiltresIVisualitzacio);
    selectGrup.addEventListener('change', filtrarDadesAplicar);
    selectRol.addEventListener('change', filtrarDadesAplicar);
}

// Omple el primer desplegable amb la llista dels teus projectes
function omplirDesplegableProjectes(projectes) {
    selectProjecte.innerHTML = '<option value="">-- Tria un projecte o trimestre --</option>';
    projectes.forEach((p, index) => {
        const nomMostrar = p.nom || p.pestanya || `Projecte ${p.id}`;
        const option = document.createElement('option');
        option.value = index; 
        option.textContent = nomMostrar;
        selectProjecte.appendChild(option);
    });
}

// S'activa quan l'usuari tria un projecte de la llista
function ferCanviProjecte() {
    const indexTriat = selectProjecte.value;
    if (!indexTriat) {
        reiniciarInterficie();
        return;
    }
    
    const projecteSeleccionat = llistaProjectes[indexTriat];
    const urlSheet = projecteSeleccionat.url;
    const nomPestanya = projecteSeleccionat.pestanya;
    
    mostrarEstat(`Descarregant dades de la pestanya [${nomPestanya}]...`);
    
    // Petició per demanar les dades de notes d'aquest projecte concret
    const urlConsulta = `${APPS_SCRIPT_URL}?accio=obtenir_notes&url=${encodeURIComponent(urlSheet)}&pestanya=${encodeURIComponent(nomPestanya)}`;
    
    fetch(urlConsulta)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                dadesProjecteActual = data.dades;
                processarEstructuraColumnes(dadesProjecteActual);
                amagarEstat();
            } else {
                mostrarError("Error en obtenir notes: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error de xarxa en obtenir notes:", error);
            mostrarError("Error en connectar amb el Sheet d'aquest projecte.");
        });
}

// Analitza quines columnes són notes, quines rols i quines grups (La radiografia dinàmica)
function processarEstructuraColumnes(dades) {
    if (dades.length === 0) {
        mostrarError("Aquest full no conté cap dada d'alumnes.");
        return;
    }
    
    const totesLesColumnes = Object.keys(dades[0]);
    
    // Filtrem quines d'aquestes columnes són realment notes numèriques (Caixa B)
    columnesNotesDisponibles = totesLesColumnes.filter(col => {
        const colMinuscula = col.toLowerCase().trim();
        const esOrganitzativa = COLUMNES_ORGANITZATIVES.some(paraula => colMinuscula.includes(paraula));
        return !esOrganitzativa;
    });

    // Omplir desplegable de columnes de notes
    selectColumna.innerHTML = '<option value="">-- Tria una columna de notes --</option>';
    columnesNotesDisponibles.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        selectColumna.appendChild(option);
    });
    selectColumna.disabled = false;

    // Detectar de forma única els Grups existents en aquest full per crear el filtre
    const colGrup = totesLesColumnes.find(c => {
        const low = c.toLowerCase();
        return low === 'grup-classe' || low === 'grup' || low === 'classe';
    });
    
    if (colGrup) {
        const grupsUnics = [...new Set(dades.map(item => item[colGrup]))].filter(Boolean).sort();
        selectGrup.innerHTML = '<option value="">[ Tots els grups ]</option>';
        grupsUnics.forEach(g => {
            const option = document.createElement('option');
            option.value = `${colGrup}|${g}`;
            option.textContent = `Grup ${g}`;
            selectGrup.appendChild(option);
        });
        selectGrup.disabled = false;
    } else {
        selectGrup.innerHTML = '<option value="">Sense columna grup</option>';
        selectGrup.disabled = true;
    }

    // Detectar de forma única els Rols cooperatius existents en aquest full per crear el filtre
    const colRol = totesLesColumnes.find(c => c.toLowerCase().trim() === 'rol');
    if (colRol) {
        const rolsUnics = [...new Set(dades.map(item => item[colRol]))].filter(Boolean).sort();
        selectRol.innerHTML = '<option value="">[ Tots els rols ]</option>';
        rolsUnics.forEach(r => {
            const option = document.createElement('option');
            option.value = r;
            option.textContent = r;
            selectRol.appendChild(option);
        });
        selectRol.disabled = false;
    } else {
        selectRol.innerHTML = '<option value="">Sense columna rol</option>';
        selectRol.disabled = true;
    }

    if(chartInstance) chartInstance.destroy();
    taulaCos.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Ara tria la columna de notes concreta que vols analitzar a dalt.</td></tr>';
}

function actualitzarFiltresIVisualitzacio() {
    filtrarDadesAplicar();
}

function parseNota(valor) {
    if (valor === null || valor === undefined) return NaN;
    return parseFloat(String(valor).replace(',', '.'));
}

function filtrarDadesAplicar() {
    const columnaNotaTriada = selectColumna.value;
    if (!columnaNotaTriada) return;

    let dadesFiltrades = [...dadesProjecteActual];

    // Aplicar Filtre de Grup (si està seleccionat)
    if (selectGrup.value) {
        const [nomColGrup, valorGrup] = selectGrup.value.split('|');
        dadesFiltrades = dadesFiltrades.filter(item => String(item[nomColGrup]) === valorGrup);
    }

    // Aplicar Filtre de Rol (si està seleccionat)
    if (selectRol.value) {
        dadesFiltrades = dadesFiltrades.filter(item => String(item['rol']) === selectRol.value);
    }

    // Buscar quines columnes d'identificació real tenim per pintar la taula
    const totesLesCol = Object.keys(dadesProjecteActual[0]);
    const colNomAlumne = totesLesCol.find(c => c.toLowerCase() === 'cognoms, nom' || c.toLowerCase() === 'nom') || totesLesCol[0];
    const colGrupNom = totesLesCol.find(c => c.toLowerCase() === 'grup-classe' || c.toLowerCase() === 'grup') || '';
    const colRolNom = totesLesCol.find(c => c.toLowerCase() === 'rol') || '';

    chartTitle.textContent = `Distribució de Notes per a: ${columnaNotaTriada}`;

    // Preparar les dades específiques per al gràfic de barres
    const labelsAlumnes = dadesFiltrades.map(item => item[colNomAlumne] || 'Anònim');
    const valorsNotes = dadesFiltrades.map(item => {
        const valor = parseNota(item[columnaNotaTriada]);
        return isNaN(valor) ? 0 : valor;
    });

    dibuixarGrafic(labelsAlumnes, valorsNotes, columnaNotaTriada);
    generarTaulaDetallada(dadesFiltrades, colNomAlumne, colGrupNom, colRolNom, columnaNotaTriada);
}

// Dibuixa o actualitza el gràfic de barres dinàmic utilitzant Chart.js
function dibuixarGrafic(etiquetes, valors, titolSerie) {
    const ctx = document.getElementById('notesChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetes,
            datasets: [{
                label: titolSerie,
                data: valors,
                backgroundColor: 'rgba(52, 152, 219, 0.65)',
                borderColor: 'rgba(41, 128, 185, 1)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 4,
                    grid: { color: '#edf2f7' },
                    title: { display: true, text: 'Nota' }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: false, 
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 10 }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Reconstrueix la taula inferior amb l'estat exacte de filtres
function generarTaulaDetallada(dades, colNom, colGrup, colRol, colNota) {
    taulaCos.innerHTML = '';

    if (dades.length === 0) {
        taulaCos.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Cap alumne compleix els filtres seleccionats.</td></tr>';
        return;
    }

    dades.forEach(item => {
        const tr = document.createElement('tr');
        
        const tdNom = document.createElement('td');
        tdNom.textContent = item[colNom] || '-';
        tdNom.classList.add('text-bold');
        
        const tdGrup = document.createElement('td');
        tdGrup.textContent = colGrup ? item[colGrup] : '-';
        
        const tdRol = document.createElement('td');
        tdRol.textContent = colRol ? item[colRol] : '-';
        
        const tdNota = document.createElement('td');
        const valorNota = item[colNota];
        tdNota.textContent = (valorNota !== undefined && valorNota !== "") ? valorNota : 'N/A';
        
        // Alerta visual de color vermell si suspèn (< 5)
        const notaNum = parseNota(valorNota);
        if(!isNaN(notaNum) && notaNum < 2) {
            tdNota.style.color = '#e74c3c';
            tdNota.style.fontWeight = 'bold';
        }

        tr.appendChild(tdNom);
        tr.appendChild(tdGrup);
        tr.appendChild(tdRol);
        tr.appendChild(tdNota);
        taulaCos.appendChild(tr);
    });
}

function reiniciarInterficie() {
    dadesProjecteActual = [];
    columnesNotesDisponibles = [];
    selectColumna.innerHTML = '<option value="">-- Selecciona primer un projecte --</option>';
    selectColumna.disabled = true;
    selectGrup.innerHTML = '<option value="">[ Tots els grups ]</option>';
    selectGrup.disabled = true;
    selectRol.innerHTML = '<option value="">[ Tots els rols ]</option>';
    selectRol.disabled = true;
    chartTitle.textContent = 'Visualització General del Grup';
    if(chartInstance) chartInstance.destroy();
    taulaCos.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Selecciona un projecte i una columna per visualitzar les dades detailed.</td></tr>';
}

function mostrarEstat(missatge) {
    statusIndicator.classList.remove('hide');
    statusText.textContent = missatge;
    statusText.style.color = '#2b6cb0';
}

function amagarEstat() {
    statusIndicator.classList.add('hide');
}

function mostrarError(missatge) {
    statusIndicator.classList.remove('hide');
    statusText.textContent = missatge;
    statusText.style.color = '#c53030';
}
