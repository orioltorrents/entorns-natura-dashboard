// URL de l'aplicació web obtinguda en desplegar el teu Google Apps Script
// RECORDA: Enganxa aquí la teva URL final (la que acaba en /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymjQRuWBGwh3QWnQoQ_qxoahY2Z7gtcwwbt5QgKDvtpi9dm-bl0qYrQdk5cJwp7yKgCA/exec";

// Variables globals d'estat de l'aplicació
let llistaProjectes = [];
let dadesProjecteActual = [];
let columnesNotesDisponibles = [];
let chartInstance = null;
let llistaAlumnesMestre = null;

// Enllaços als elements de la interfície de l'HTML (DOM)
const selectProjecte = document.getElementById('select-projecte');
const selectColumna = document.getElementById('select-columna');
const selectGrup = document.getElementById('select-grup');
const grupPills = document.getElementById('grup-pills');
const selectRol = document.getElementById('select-rol');
const selectOrdre = document.getElementById('select-ordre');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const chartTitle = document.getElementById('chart-title');
const taulaCaps = document.getElementById('taula-caps');
const taulaCos = document.getElementById('taula-cos');
const projectLogo = document.getElementById('project-logo');
const resumAssoliments = document.getElementById('resum-assoliments');

const LOGO_PER_DEFECTE = {
    src: 'assets/logos/Entorns-de-natura.png',
    alt: 'Logo Entorns de Natura'
};

const LOGOS_PROJECTES = [
    { claus: ['rius', 'projecte rius'], src: 'assets/logos/ProjecteRius_AssociacioHabitats.jpeg', alt: 'Logo Projecte Rius' },
    { claus: ['mat', 'no a la mat'], src: 'assets/logos/No a la MAT.jpg', alt: 'Logo No a la MAT' },
    { claus: ['liquencity', 'liquen city'], src: 'assets/logos/LiquenCity.png', alt: 'Logo LiquenCity' },
    { claus: ['orenetes', 'projecte orenetes'], src: 'assets/logos/Orenetes.png', alt: 'Logo Projecte Orenetes' },
    { claus: ['vespa', 'velutina', 'vespa velutina'], src: 'assets/logos/Vespa-velutina.png', alt: 'Logo Vespa velutina' }
];

const PROJECTES_CAPCALERA_SEGONA_FILA = ['liquencity', 'liquen city', 'orenetes', 'vespa', 'velutina'];
const PROJECTES_AMB_LLISTA_MESTRA = [];
const PROJECTES_ROL_DERIVAT = ['eia', 'estudi impacte ambiental'];

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
    actualitzarLogoProjecte({});
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
    selectGrup.addEventListener('change', gestionarCanviGrup);
    selectRol.addEventListener('change', filtrarDadesAplicar);
    selectOrdre.addEventListener('change', filtrarDadesAplicar);
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

function normalitzarText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_-]/g, ' ');
}

function obtenirNomProjecte(projecte) {
    return [
        projecte.nom,
        projecte.pestanya,
        projecte.id
    ].filter(Boolean).join(' ');
}

function usaCapcaleraSegonaFila(projecte) {
    const nomProjecte = normalitzarText(obtenirNomProjecte(projecte));
    return PROJECTES_CAPCALERA_SEGONA_FILA.some(clau => nomProjecte.includes(normalitzarText(clau)));
}

function usaLlistaMestre(projecte) {
    const nomProjecte = normalitzarText(obtenirNomProjecte(projecte));
    return PROJECTES_AMB_LLISTA_MESTRA.some(clau => nomProjecte.includes(normalitzarText(clau)));
}

function usaRolDerivat(projecte) {
    const nomProjecte = normalitzarText(obtenirNomProjecte(projecte));
    return PROJECTES_ROL_DERIVAT.some(clau => nomProjecte.includes(normalitzarText(clau)));
}

function detectarRolPerColumnes(fila) {
    const rols = [
        { etiqueta: 'Coordinador/a', claus: ['coordinador'] },
        { etiqueta: 'Científic/a', claus: ['cientific'] },
        { etiqueta: 'Cartògraf/a', claus: ['cartograf'] },
        { etiqueta: 'Informàtic/a', claus: ['informatic'] }
    ];

    const columnes = Object.keys(fila);
    const rolTrobat = rols.find(rol => {
        return columnes.some(columna => {
            const nomColumna = normalitzarCapcalera(columna);
            const valor = fila[columna];
            return rol.claus.some(clau => nomColumna.includes(clau))
                && valor !== null
                && valor !== undefined
                && String(valor).trim() !== '';
        });
    });

    return rolTrobat ? rolTrobat.etiqueta : '';
}

function afegirRolDerivat(dades, projecte) {
    if (!usaRolDerivat(projecte)) return dades;

    return dades.map(fila => {
        return {
            ...fila,
            'dashboard rol': detectarRolPerColumnes(fila)
        };
    });
}

function obtenirClassesProjecte(projecte) {
    const nomProjecte = normalitzarText(obtenirNomProjecte(projecte));
    if (nomProjecte.includes('4esoab') || nomProjecte.includes('orenetes')) return ['4ESOA', '4ESOB'];
    if (nomProjecte.includes('4esocd') || nomProjecte.includes('liquencity') || nomProjecte.includes('liquen city')) return ['4ESOC', '4ESOD'];
    if (nomProjecte.includes('4esoef') || nomProjecte.includes('vespa') || nomProjecte.includes('velutina')) return ['4ESOE', '4ESOF'];
    return [];
}

function obtenirProjecteLlistaAlumnes() {
    return llistaProjectes.find(projecte => {
        return normalitzarText(projecte.nom || projecte.url || '').includes('llistesalumnes');
    });
}

function carregarLlistaAlumnesMestre() {
    if (PROJECTES_AMB_LLISTA_MESTRA.length === 0) return Promise.resolve([]);
    if (llistaAlumnesMestre) return Promise.resolve(llistaAlumnesMestre);

    const projecteLlista = obtenirProjecteLlistaAlumnes();
    if (!projecteLlista) return Promise.resolve([]);

    const urlConsulta = `${APPS_SCRIPT_URL}?accio=obtenir_notes&url=${encodeURIComponent(projecteLlista.url)}&pestanya=${encodeURIComponent(projecteLlista.pestanya)}`;
    return fetch(urlConsulta)
        .then(response => response.json())
        .then(data => {
            llistaAlumnesMestre = data.status === "success" ? data.dades : [];
            return llistaAlumnesMestre;
        })
        .catch(error => {
            console.error("Error en carregar la llista mestra d'alumnes:", error);
            return [];
        });
}

function enriquirAmbLlistaMestre(dades, projecte, alumnesMestre) {
    if (!usaLlistaMestre(projecte) || !Array.isArray(alumnesMestre) || alumnesMestre.length === 0) {
        return dades;
    }

    const classesProjecte = obtenirClassesProjecte(projecte);
    const alumnesProjecte = alumnesMestre.filter(alumne => {
        return classesProjecte.includes(String(alumne.grup_classe || '').trim());
    });

    return dades.map((fila, index) => {
        const alumne = alumnesProjecte[index];
        if (!alumne) return fila;

        return {
            'dashboard nom alumne': alumne['cognoms, nom'] || alumne.nom || '',
            'dashboard classe': alumne.grup_classe || '',
            ...fila
        };
    });
}

function ferCapcaleresUniques(capcaleres) {
    const comptador = {};
    return capcaleres.map((capcalera, index) => {
        const base = String(capcalera || `Columna ${index + 1}`).trim() || `Columna ${index + 1}`;
        comptador[base] = (comptador[base] || 0) + 1;
        return comptador[base] === 1 ? base : `${base} ${comptador[base]}`;
    });
}

function adaptarCapcaleraSegonaFila(dades) {
    if (!Array.isArray(dades) || dades.length < 2) return dades;

    const clausOriginals = Object.keys(dades[0]);
    const capcaleresReals = ferCapcaleresUniques(clausOriginals.map(clau => dades[0][clau]));

    return dades.slice(1).map(fila => {
        return capcaleresReals.reduce((registre, capcalera, index) => {
            registre[capcalera] = fila[clausOriginals[index]];
            return registre;
        }, {});
    });
}

function afegirNomsGenerics(dades) {
    return dades.map((fila, index) => {
        return {
            'dashboard nom alumne': `Alumne ${index + 1}`,
            ...fila
        };
    });
}

function prepararDadesProjecte(dades, projecte) {
    if (!usaCapcaleraSegonaFila(projecte)) return dades;
    return afegirNomsGenerics(adaptarCapcaleraSegonaFila(dades));
}

function actualitzarLogoProjecte(projecte) {
    if (!projectLogo) return;

    const nomProjecte = normalitzarText(obtenirNomProjecte(projecte));
    const logo = LOGOS_PROJECTES.find(item => {
        return item.claus.some(clau => nomProjecte.includes(normalitzarText(clau)));
    }) || LOGO_PER_DEFECTE;

    projectLogo.src = logo.src;
    projectLogo.alt = logo.alt;
    projectLogo.classList.remove('hide');
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
    actualitzarLogoProjecte(projecteSeleccionat);
    
    mostrarEstat(`Descarregant dades de la pestanya [${nomPestanya}]...`);
    
    // Petició per demanar les dades de notes d'aquest projecte concret
    const urlConsulta = `${APPS_SCRIPT_URL}?accio=obtenir_notes&url=${encodeURIComponent(urlSheet)}&pestanya=${encodeURIComponent(nomPestanya)}`;
    
    fetch(urlConsulta)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                const dadesPreparades = afegirRolDerivat(
                    prepararDadesProjecte(data.dades, projecteSeleccionat),
                    projecteSeleccionat
                );
                return carregarLlistaAlumnesMestre().then(alumnesMestre => {
                    dadesProjecteActual = enriquirAmbLlistaMestre(dadesPreparades, projecteSeleccionat, alumnesMestre);
                    processarEstructuraColumnes(dadesProjecteActual);
                    amagarEstat();
                });
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
        return !esColumnaOrganitzativa(col);
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
    const colGrup = trobarColumna(totesLesColumnes, esColumnaGrup, 'dashboard classe');
    
    if (colGrup) {
        const grupsUnics = [...new Set(dades.map(item => item[colGrup]))].filter(Boolean).sort();
        selectGrup.innerHTML = '';
        grupsUnics.forEach(g => {
            const option = document.createElement('option');
            option.value = `${colGrup}|${g}`;
            option.textContent = g;
            selectGrup.appendChild(option);
        });
        selectGrup.disabled = false;
        renderitzarPastillesGrup(grupsUnics, colGrup);
    } else {
        selectGrup.innerHTML = '<option value="">Sense columna grup</option>';
        selectGrup.disabled = true;
        renderitzarPastillesGrup([], '');
    }

    // Detectar de forma única els Rols cooperatius existents en aquest full per crear el filtre
    const colRol = trobarColumna(totesLesColumnes, esColumnaRol, 'dashboard rol');
    if (colRol) {
        const rolsUnics = [...new Set(dades.map(item => item[colRol]))].filter(Boolean).sort();
        selectRol.innerHTML = '<option value="">[ Tots els rols ]</option>';
        rolsUnics.forEach(r => {
            const option = document.createElement('option');
            option.value = `${colRol}|${r}`;
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

const NOTES_ASSOLIMENT = {
    NA: 1,
    AS: 2,
    AN: 3,
    AE: 4
};

const TEXTOS_SENSE_NOTA = new Set([
    '',
    '-',
    'N/A',
    'N.A.',
    'SENSE NOTA',
    'ABS',
    'ABSENT',
    'NP',
    'NO PRESENTAT',
    'NO PRESENTADA'
]);

function normalitzarNotaText(valor) {
    return String(valor || '').trim().toUpperCase();
}

function esValorSenseNota(valor) {
    return TEXTOS_SENSE_NOTA.has(normalitzarNotaText(valor));
}

function esNotaAssolimentValida(valor) {
    return Object.prototype.hasOwnProperty.call(NOTES_ASSOLIMENT, normalitzarNotaText(valor));
}

function parseValorGrafic(valor) {
    const notaText = normalitzarNotaText(valor);
    if (Object.prototype.hasOwnProperty.call(NOTES_ASSOLIMENT, notaText)) {
        return NOTES_ASSOLIMENT[notaText];
    }

    return parseNota(valor);
}

function formatValorGrafic(valor) {
    const notaText = normalitzarNotaText(valor);
    if (Object.prototype.hasOwnProperty.call(NOTES_ASSOLIMENT, notaText)) {
        return notaText;
    }

    const notaNumerica = parseNota(valor);
    if (isNaN(notaNumerica)) return '';

    return notaNumerica.toLocaleString('ca-ES', {
        maximumFractionDigits: 2
    });
}

function esColumnaAssoliment(dades, columnaNota) {
    const valorsAmbDades = dades
        .map(item => normalitzarNotaText(item[columnaNota]))
        .filter(valor => !TEXTOS_SENSE_NOTA.has(valor));

    return valorsAmbDades.length > 0
        && valorsAmbDades.every(valor => Object.prototype.hasOwnProperty.call(NOTES_ASSOLIMENT, valor));
}

function calcularRecompteAssoliments(dades, columnaNota) {
    return dades.reduce((recompte, item) => {
        const nota = normalitzarNotaText(item[columnaNota]);
        if (Object.prototype.hasOwnProperty.call(recompte, nota)) {
            recompte[nota] += 1;
            recompte.total += 1;
        } else if (esValorSenseNota(nota)) {
            recompte.senseNota += 1;
        }
        return recompte;
    }, { AE: 0, AN: 0, AS: 0, NA: 0, total: 0, senseNota: 0 });
}

function actualitzarResumAssoliments(dades, columnaNota, mostrar) {
    if (!resumAssoliments) return;

    if (!mostrar) {
        resumAssoliments.classList.add('hide');
        resumAssoliments.innerHTML = '';
        return;
    }

    const recompte = calcularRecompteAssoliments(dades, columnaNota);
    resumAssoliments.innerHTML = `
        <span class="summary-title">Recompte</span>
        <span class="summary-pill summary-ae">AE <strong>${recompte.AE}</strong></span>
        <span class="summary-pill summary-an">AN <strong>${recompte.AN}</strong></span>
        <span class="summary-pill summary-as">AS <strong>${recompte.AS}</strong></span>
        <span class="summary-pill summary-na">NA <strong>${recompte.NA}</strong></span>
        <span class="summary-total">Total <strong>${recompte.total}</strong></span>
        ${recompte.senseNota ? `<span class="summary-missing">Sense nota <strong>${recompte.senseNota}</strong></span>` : ''}
    `;
    resumAssoliments.classList.remove('hide');
}

function normalitzarCapcalera(capcalera) {
    return normalitzarText(capcalera)
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function obtenirOpcionsSeleccionades(select) {
    return Array.from(select.selectedOptions).map(option => option.value).filter(Boolean);
}

function renderitzarPastillesGrup(grups, colGrup) {
    if (!grupPills) return;

    grupPills.innerHTML = '';

    if (!grups.length || !colGrup) {
        grupPills.classList.add('is-disabled');
        const buit = document.createElement('span');
        buit.className = 'group-pills-empty';
        buit.textContent = 'Sense columna grup';
        grupPills.appendChild(buit);
        return;
    }

    grupPills.classList.remove('is-disabled');
    grups.forEach(grup => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'group-pill';
        button.dataset.value = `${colGrup}|${grup}`;
        button.textContent = grup;
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => alternarPastillaGrup(button.dataset.value));
        grupPills.appendChild(button);
    });
}

function sincronitzarPastillesGrup() {
    if (!grupPills) return;

    const seleccionats = new Set(obtenirOpcionsSeleccionades(selectGrup));
    grupPills.querySelectorAll('.group-pill').forEach(button => {
        const actiu = seleccionats.has(button.dataset.value);
        button.classList.toggle('is-active', actiu);
        button.setAttribute('aria-pressed', String(actiu));
    });
}

function alternarPastillaGrup(valor) {
    const option = Array.from(selectGrup.options).find(opcio => opcio.value === valor);
    if (!option) return;

    option.selected = !option.selected;
    sincronitzarPastillesGrup();
    filtrarDadesAplicar();
}

function gestionarCanviGrup() {
    const opcions = Array.from(selectGrup.options);
    const opcioTots = opcions.find(option => option.value === '');
    const grupsTriats = opcions.filter(option => option.value !== '' && option.selected);

    if (opcioTots && grupsTriats.length > 0) {
        opcioTots.selected = false;
    }

    sincronitzarPastillesGrup();
    filtrarDadesAplicar();
}

function ordenarDadesPerNota(dades, columnaNota, ordre) {
    if (!ordre) return dades;

    return [...dades].sort((a, b) => {
        const valorA = parseValorGrafic(a[columnaNota]);
        const valorB = parseValorGrafic(b[columnaNota]);
        const aInvalid = isNaN(valorA);
        const bInvalid = isNaN(valorB);

        if (aInvalid && bInvalid) return 0;
        if (aInvalid) return 1;
        if (bInvalid) return -1;

        return ordre === 'asc' ? valorA - valorB : valorB - valorA;
    });
}

function capcaleraConte(capcalera, claus) {
    const low = normalitzarCapcalera(capcalera);
    return claus.some(clau => low.includes(normalitzarCapcalera(clau)));
}

function trobarColumna(columnes, detector, marcaPrioritaria) {
    return columnes.find(col => {
        return normalitzarCapcalera(col).includes(marcaPrioritaria) && detector(col);
    }) || columnes.find(detector);
}

function trobarColumnaNomAlumne(columnes) {
    return columnes.find(col => normalitzarCapcalera(col) === 'cognoms nom')
        || trobarColumna(columnes, esColumnaNomAlumne, 'dashboard nom');
}

function esColumnaGrup(capcalera) {
    const low = normalitzarCapcalera(capcalera);
    if (low.includes('codi')) return false;
    return low === 'grup'
        || low === 'classe'
        || low.includes('dashboard classe')
        || low.includes('grup classe')
        || low.includes('classe grup');
}

function esColumnaRol(capcalera) {
    const low = normalitzarCapcalera(capcalera);
    return low === 'rol'
        || low === 'rol cooperatiu'
        || low === 'carrec'
        || low === 'paper'
        || low.includes('dashboard rol');
}

function esColumnaNomAlumne(capcalera) {
    const low = normalitzarCapcalera(capcalera);
    return low === 'nom'
        || low === 'dashboard nom alumne'
        || low.includes('cognoms nom')
        || low.includes('nom cognoms')
        || low.includes('nom i cognoms')
        || low.includes('cognoms i nom')
        || low.includes('nom alumne')
        || low.includes('alumne')
        || low.includes('alumna')
        || low.includes('estudiant')
        || low.includes('participant');
}

function esColumnaOrganitzativa(capcalera) {
    const low = normalitzarCapcalera(capcalera);
    return esColumnaNomAlumne(capcalera)
        || esColumnaGrup(capcalera)
        || esColumnaRol(capcalera)
        || ['id', 'foto', 'email', 'correu', 'url', 'descripcio', 'descripcio'].includes(low)
        || low === 'article'
        || low === 'article 2'
        || low === 'psi'
        || low.includes('feina feta')
        || low.includes('comentari')
        || low.includes('commentari')
        || low.includes('nota1 comentari')
        || low.includes('entregues comentari')
        || low.includes('genere')
        || low.includes('sexe')
        || low.includes('observacio')
        || low.includes('codi');
}

function filtrarDadesAplicar() {
    const columnaNotaTriada = selectColumna.value;
    if (!columnaNotaTriada) return;

    let dadesFiltrades = [...dadesProjecteActual];

    // Aplicar Filtre de Grup (si està seleccionat)
    const grupsSeleccionats = obtenirOpcionsSeleccionades(selectGrup);
    if (grupsSeleccionats.length > 0) {
        const grupsPerColumna = grupsSeleccionats.reduce((acc, opcio) => {
            const [nomColGrup, valorGrup] = opcio.split('|');
            if (!acc[nomColGrup]) acc[nomColGrup] = new Set();
            acc[nomColGrup].add(valorGrup);
            return acc;
        }, {});

        dadesFiltrades = dadesFiltrades.filter(item => {
            return Object.entries(grupsPerColumna).some(([nomColGrup, valorsGrup]) => {
                return valorsGrup.has(String(item[nomColGrup]));
            });
        });
    }

    // Aplicar Filtre de Rol (si està seleccionat)
    if (selectRol.value) {
        const [nomColRol, valorRol] = selectRol.value.split('|');
        dadesFiltrades = dadesFiltrades.filter(item => String(item[nomColRol]) === valorRol);
    }

    dadesFiltrades = ordenarDadesPerNota(dadesFiltrades, columnaNotaTriada, selectOrdre.value);

    // Buscar quines columnes d'identificació real tenim per pintar la taula
    const totesLesCol = Object.keys(dadesProjecteActual[0]);
    const colNomAlumne = trobarColumnaNomAlumne(totesLesCol) || totesLesCol[0];
    const colGrupNom = trobarColumna(totesLesCol, esColumnaGrup, 'dashboard classe') || '';
    const colRolNom = trobarColumna(totesLesCol, esColumnaRol, 'dashboard rol') || '';

    chartTitle.textContent = `Distribució de Notes per a: ${columnaNotaTriada}`;

    // Preparar les dades específiques per al gràfic de barres
    const labelsAlumnes = dadesFiltrades.map(item => item[colNomAlumne] || 'Anònim');
    const esAssoliment = esColumnaAssoliment(dadesFiltrades, columnaNotaTriada);
    actualitzarResumAssoliments(dadesFiltrades, columnaNotaTriada, esAssoliment);
    const valorsOriginals = dadesFiltrades.map(item => item[columnaNotaTriada]);
    const valorsNotes = dadesFiltrades.map(item => {
        const valor = parseValorGrafic(item[columnaNotaTriada]);
        return isNaN(valor) ? 0 : valor;
    });

    dibuixarGrafic(labelsAlumnes, valorsNotes, columnaNotaTriada, {
        valorsOriginals,
        esAssoliment
    });
    generarTaulaDetallada(dadesFiltrades, colNomAlumne, colGrupNom, colRolNom, columnaNotaTriada);
}

const pluginValorsBarres = {
    id: 'valorsBarres',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            const moltesBarres = dataset.data.length > 25;

            meta.data.forEach((barra, index) => {
                const valor = dataset.data[index];
                if (valor === null || valor === undefined || isNaN(valor)) return;

                const text = dataset.valorsOriginals
                    ? formatValorGrafic(dataset.valorsOriginals[index])
                    : Number(valor).toLocaleString('ca-ES', { maximumFractionDigits: 2 });
                const alcadaBarra = Math.abs(barra.base - barra.y);
                const dinsBarra = !moltesBarres && alcadaBarra >= 18;

                ctx.save();
                ctx.font = `${moltesBarres ? '10px' : 'bold 11px'} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = dinsBarra ? 'top' : 'bottom';
                ctx.fillStyle = dinsBarra ? '#ffffff' : '#111827';
                ctx.fillText(text, barra.x, dinsBarra ? barra.y + 4 : barra.y - 4);
                ctx.restore();
            });
        });
    }
};

// Dibuixa o actualitza el gràfic de barres dinàmic utilitzant Chart.js
function dibuixarGrafic(etiquetes, valors, titolSerie, opcions = {}) {
    const ctx = document.getElementById('notesChart').getContext('2d');
    const esAssoliment = Boolean(opcions.esAssoliment);
    
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
                valorsOriginals: opcions.valorsOriginals || [],
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
                    max: 4.25,
                    grid: { color: '#edf2f7' },
                    ticks: {
                        stepSize: 1,
                        callback: value => {
                            if (esAssoliment) {
                                return { 1: 'NA', 2: 'AS', 3: 'AN', 4: 'AE' }[value] || '';
                            }

                            return value <= 4 ? value : '';
                        }
                    },
                    title: { display: true, text: esAssoliment ? 'Assoliment' : 'Nota' }
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
        },
        plugins: [pluginValorsBarres]
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
    actualitzarLogoProjecte({});
    selectColumna.innerHTML = '<option value="">-- Selecciona primer un projecte --</option>';
    selectColumna.disabled = true;
    selectGrup.innerHTML = '';
    selectGrup.disabled = true;
    renderitzarPastillesGrup([], '');
    selectRol.innerHTML = '<option value="">[ Tots els rols ]</option>';
    selectRol.disabled = true;
    selectOrdre.value = '';
    actualitzarResumAssoliments([], '', false);
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
