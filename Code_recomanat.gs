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

  const capcaleres = normalitzarCapcaleres(valors[0], 1);
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
  const filaCapcaleres = obtenirFilaCapcaleres(valors, filaCapcaleresParam);
  return convertirTaulaAObjectes(valors, filaCapcaleres);
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

  const capcaleres = normalitzarCapcaleres(valors[indexCapcaleres], filaCapcaleres);

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

function normalitzarCapcaleres(capcaleres, filaCapcaleres) {
  const comptador = {};

  return capcaleres.map((capcalera, index) => {
    let text = String(capcalera || '').trim().toLowerCase();

    if (filaCapcaleres === 2) {
      if (index === 3 && !text) text = 'grup-classe';
      if (index === 5 && !text) text = 'cognoms, nom';
      if (index === 8 && !text) text = 'rol';
    }

    if (!text) return '';

    comptador[text] = (comptador[text] || 0) + 1;
    return comptador[text] === 1 ? text : text + ' ' + comptador[text];
  });
}

function retornarJson(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
