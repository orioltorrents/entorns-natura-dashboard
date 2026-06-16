const INDEX_SHEET_NAME = 'index';

function doGet(e) {
  try {
    const accio = e.parameter.accio;

    if (accio === 'obtenir_index') {
      return jsonResponse({
        status: 'success',
        dades: obtenirIndex()
      });
    }

    if (accio === 'obtenir_notes') {
      const url = e.parameter.url;
      const pestanya = e.parameter.pestanya;

      if (!url || !pestanya) {
        throw new Error('Falten els paràmetres url o pestanya.');
      }

      return jsonResponse({
        status: 'success',
        dades: obtenirNotes(url, pestanya)
      });
    }

    throw new Error('Acció no reconeguda.');
  } catch (error) {
    return jsonResponse({
      status: 'error',
      message: error.message
    });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function obtenirIndex() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(INDEX_SHEET_NAME);

  if (!sheet) {
    throw new Error(`No s'ha trobat la pestanya ${INDEX_SHEET_NAME}.`);
  }

  return llegirTaulaComObjectes(sheet.getDataRange().getValues());
}

function obtenirNotes(urlOId, pestanya) {
  const ss = obrirSpreadsheet(urlOId);
  const sheet = ss.getSheetByName(pestanya);

  if (!sheet) {
    throw new Error(`No s'ha trobat la pestanya ${pestanya}.`);
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  if (teCapcaleraSegonaFila(urlOId, pestanya)) {
    return llegirProjecteAmbCapcaleraSegonaFila(values);
  }

  return llegirTaulaComObjectes(values);
}

function obrirSpreadsheet(urlOId) {
  const indexEntry = trobarEntradaIndex(urlOId);
  const valor = indexEntry && indexEntry.url ? indexEntry.url : urlOId;

  if (/^https?:\/\//i.test(valor)) {
    return SpreadsheetApp.openByUrl(valor);
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(valor)) {
    return SpreadsheetApp.openById(valor);
  }

  const fitxers = DriveApp.getFilesByName(valor);
  if (!fitxers.hasNext()) {
    throw new Error(`No s'ha trobat cap Google Sheet amb el nom o id: ${valor}`);
  }

  return SpreadsheetApp.open(fitxers.next());
}

function trobarEntradaIndex(urlOId) {
  const index = obtenirIndex();
  return index.find(item => item.url === urlOId || item.nom === urlOId || item.id === urlOId);
}

function llegirTaulaComObjectes(values) {
  if (!values || values.length < 2) return [];

  const headers = ferCapcaleresUniques(values[0]);
  return values.slice(1)
    .filter(fila => fila.some(valor => String(valor).trim() !== ''))
    .map(fila => objecteDesDeFila(headers, fila));
}

function llegirProjecteAmbCapcaleraSegonaFila(values) {
  const headersOriginals = values[1];
  const headers = ferCapcaleresUniques(headersOriginals.map((header, index) => {
    if (index === 3) return normalitzarHeaderSiBuit(header, 'grup-classe');
    if (index === 5) return normalitzarHeaderSiBuit(header, 'cognoms, nom');
    if (index === 8) return normalitzarHeaderSiBuit(header, 'rol');
    return header;
  }));

  return values.slice(2)
    .filter(fila => fila.some(valor => String(valor).trim() !== ''))
    .map(fila => objecteDesDeFila(headers, fila));
}

function normalitzarHeaderSiBuit(header, fallback) {
  const text = String(header || '').trim();
  return text || fallback;
}

function objecteDesDeFila(headers, fila) {
  return headers.reduce((registre, header, index) => {
    registre[header] = fila[index] || '';
    return registre;
  }, {});
}

function ferCapcaleresUniques(headers) {
  const comptador = {};

  return headers.map((header, index) => {
    const base = String(header || `Columna ${index + 1}`).trim() || `Columna ${index + 1}`;
    comptador[base] = (comptador[base] || 0) + 1;
    return comptador[base] === 1 ? base : `${base} ${comptador[base]}`;
  });
}

function teCapcaleraSegonaFila(urlOId, pestanya) {
  const text = normalitzarText(`${urlOId} ${pestanya}`);
  return text.includes('orenetes')
    || text.includes('liquencity')
    || text.includes('liquen city')
    || text.includes('vespa')
    || text.includes('velutina');
}

function normalitzarText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]/g, ' ');
}

_______

const INDEX_SHEET_NAME = 'fitxers';
const MASTER_SPREADSHEET_ID = '';
const ALLOW_DRIVE_NAME_LOOKUP = true;

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const accio = params.accio || '';

    if (accio === 'obtenir_index') {
      return retornarJson({
        status: 'success',
        dades: obtenirIndex()
      });
    }

    if (accio === 'obtenir_notes') {
      return retornarJson({
        status: 'success',
        dades: obtenirNotes(params.url, params.pestanya, params.fila_capcaleres)
      });
    }

    return retornarJson({
      status: 'error',
      message: "Accio no reconeguda. Usa 'obtenir_index' o 'obtenir_notes'."
    });
  } catch (error) {
    return retornarJson({
      status: 'error',
      message: String(error)
    });
  }
}

function provarPermisos() {
  obtenirSpreadsheetMestre().getName();
  DriveApp.getRootFolder().getName();
  return 'Permisos concedits correctament.';
}

function obtenirIndex() {
  const spreadsheet = obtenirSpreadsheetMestre();
  const sheet = spreadsheet.getSheetByName(INDEX_SHEET_NAME);

  if (!sheet) {
    throw new Error("No s'ha trobat la pestanya '" + INDEX_SHEET_NAME + "'.");
  }

  const range = sheet.getDataRange();
  const valors = range.getDisplayValues();
  const richTextValues = range.getRichTextValues();

  if (valors.length < 2) return [];

  const capcaleres = normalitzarCapcaleres(valors[0]);
  const indexUrl = capcaleres.indexOf('url');

  return valors.slice(1)
    .filter(fila => fila.some(valor => String(valor).trim() !== ''))
    .map((fila, filaIndex) => {
      const registre = {};

      capcaleres.forEach((capcalera, columnaIndex) => {
        if (!capcalera) return;

        let valor = fila[columnaIndex];

        if (columnaIndex === indexUrl) {
          valor = obtenirUrlReal(richTextValues[filaIndex + 1][columnaIndex]) || valor;
        }

        registre[capcalera] = valor;
      });

      return registre;
    });
}

function obtenirNotes(urlOFitxer, nomPestanya, filaCapcaleresParam) {
  if (!urlOFitxer) {
    throw new Error("Falta el parametre 'url'.");
  }

  if (!nomPestanya) {
    throw new Error("Falta el parametre 'pestanya'.");
  }

  const spreadsheet = obrirSpreadsheet(urlOFitxer);
  const sheet = spreadsheet.getSheetByName(nomPestanya);

  if (!sheet) {
    throw new Error("No s'ha trobat la pestanya '" + nomPestanya + "' dins del fitxer '" + spreadsheet.getName() + "'.");
  }

  const valors = sheet.getDataRange().getDisplayValues();
  return convertirTaulaAObjectes(valors, obtenirFilaCapcaleres(valors, filaCapcaleresParam));
}

function obtenirSpreadsheetMestre() {
  if (MASTER_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("No hi ha cap spreadsheet actiu. Omple MASTER_SPREADSHEET_ID amb l'ID del full mestre.");
  }

  return spreadsheet;
}

function obrirSpreadsheet(urlOFitxer) {
  const valor = String(urlOFitxer).trim();
  const id = extreureSpreadsheetId(valor);

  if (id) {
    return SpreadsheetApp.openById(id);
  }

  if (!ALLOW_DRIVE_NAME_LOOKUP) {
    throw new Error("La columna 'url' ha de contenir la URL completa o l'ID del Google Sheet. Ara nomes arriba el nom visible del fitxer; si es un xip, substitueix-lo per l'enllac real.");
  }

  const fitxers = DriveApp.getFilesByName(valor);

  while (fitxers.hasNext()) {
    const fitxer = fitxers.next();
    if (fitxer.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(fitxer.getId());
    }
  }

  throw new Error("No s'ha pogut accedir al fitxer. Revisa que la columna 'url' contingui un xip/enllac valid, una URL completa o un nom exacte de Google Sheet.");
}

function extreureSpreadsheetId(valor) {
  const text = String(valor || '').trim();
  const matchSpreadsheet = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matchSpreadsheet) return matchSpreadsheet[1];

  const matchDrive = text.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (matchDrive) return matchDrive[1];

  const matchId = text.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (matchId) return matchId[1];

  return '';
}

function obtenirUrlReal(richTextValue) {
  if (!richTextValue) return '';

  const linkUrl = richTextValue.getLinkUrl();
  if (linkUrl) return linkUrl;

  return richTextValue.getRuns()
    .map(run => run.getLinkUrl())
    .find(Boolean) || '';
}

function convertirTaulaAObjectes(valors, filaCapcaleres) {
  const indexCapcaleres = (filaCapcaleres || 1) - 1;

  if (!valors || valors.length <= indexCapcaleres) return [];

  const capcaleres = normalitzarCapcaleres(valors[indexCapcaleres]);

  return valors.slice(indexCapcaleres + 1)
    .filter(fila => fila.some(valor => String(valor).trim() !== ''))
    .map(fila => {
      const registre = {};

      capcaleres.forEach((capcalera, index) => {
        if (!capcalera) return;
        registre[capcalera] = fila[index];
      });

      return registre;
    });
}

function obtenirFilaCapcaleres(valors, filaCapcaleresParam) {
  const filaConfigurada = parseInt(filaCapcaleresParam, 10);

  if (!isNaN(filaConfigurada) && filaConfigurada > 0) {
    return filaConfigurada;
  }

  if (!valors || valors.length < 2) {
    return 1;
  }

  const fila1 = valors[0].map(valor => String(valor).trim()).filter(Boolean);
  const fila2 = valors[1].map(valor => String(valor).trim()).filter(Boolean);

  const fila1SemblaPesos = fila1.length > 0 && fila1.every(valor => /^\d+([,.]\d+)?%$/.test(valor));
  const fila2SemblaCapcalera = fila2.some(valor => /[a-zA-ZÀ-ÿ]/.test(valor));

  return fila1SemblaPesos && fila2SemblaCapcalera ? 2 : 1;
}

function normalitzarCapcaleres(capcaleres) {
  return capcaleres.map(capcalera => String(capcalera).trim().toLowerCase());
}

function retornarJson(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
