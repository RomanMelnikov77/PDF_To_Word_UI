const ENDPOINT = 'http://localhost:8090/create';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const uploadButton = document.getElementById('upload-btn');
const statusNode = document.getElementById('status');
const resultPanel = document.getElementById('result-panel');
const docxInfo = document.getElementById('docx-info');
const openButton = document.getElementById('open-btn');
const saveButton = document.getElementById('save-btn');
const deleteButton = document.getElementById('delete-btn');

let selectedFile = null;
let generatedDocxUrl = null;
let generatedDocxName = 'converted.docx';
let generatedDocxSize = 0;

function setStatus(message, type = '') {
  statusNode.textContent = message;
  statusNode.className = `status ${type}`.trim();
}

function hideResultPanel() {
  resultPanel.hidden = true;
  docxInfo.textContent = '';
}

function cleanupGeneratedDocx() {
  if (generatedDocxUrl) {
    URL.revokeObjectURL(generatedDocxUrl);
  }

  generatedDocxUrl = null;
  generatedDocxName = 'converted.docx';
  generatedDocxSize = 0;
  hideResultPanel();
}

function tryGetFilename(contentDisposition) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1] || null;
}

function isPdf(file) {
  return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}

function setSelectedFile(file) {
  if (!isPdf(file)) {
    selectedFile = null;
    fileInfo.hidden = true;
    uploadButton.disabled = true;
    cleanupGeneratedDocx();
    setStatus('Нужен файл в формате PDF.', 'error');
    return;
  }

  selectedFile = file;
  fileInfo.hidden = false;
  fileInfo.textContent = `PDF: ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
  uploadButton.disabled = false;
  cleanupGeneratedDocx();
  setStatus('Файл готов к отправке.');
}

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (event) => {
  const [file] = event.dataTransfer.files;
  setSelectedFile(file);
});

fileInput.addEventListener('change', () => {
  const [file] = fileInput.files;
  setSelectedFile(file);
});

openButton.addEventListener('click', () => {
  if (!generatedDocxUrl) {
    setStatus('Нет файла для открытия.', 'error');
    return;
  }

  window.open(generatedDocxUrl, '_blank', 'noopener,noreferrer');
  setStatus('DOCX открыт в новой вкладке.', 'success');
});

saveButton.addEventListener('click', () => {
  if (!generatedDocxUrl) {
    setStatus('Нет файла для сохранения.', 'error');
    return;
  }

  const link = document.createElement('a');
  link.href = generatedDocxUrl;
  link.download = generatedDocxName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setStatus('Скачивание DOCX запущено.', 'success');
});

deleteButton.addEventListener('click', () => {
  cleanupGeneratedDocx();
  setStatus('DOCX удалён из интерфейса.', 'success');
});

uploadButton.addEventListener('click', async () => {
  if (!selectedFile) {
    setStatus('Сначала выберите PDF файл.', 'error');
    return;
  }

  uploadButton.disabled = true;
  setStatus('Отправка PDF на сервер...');

  try {
    const formData = new FormData();
    formData.append('file', selectedFile, selectedFile.name);

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
    }

    cleanupGeneratedDocx();
    const blob = await response.blob();
    generatedDocxUrl = URL.createObjectURL(blob);
    generatedDocxSize = blob.size;

    const responseFilename = tryGetFilename(response.headers.get('content-disposition'));
    generatedDocxName = responseFilename || `${selectedFile.name.replace(/\.pdf$/i, '')}.docx`;

    docxInfo.textContent = `DOCX: ${generatedDocxName} (${Math.ceil(generatedDocxSize / 1024)} KB)`;
    resultPanel.hidden = false;
    setStatus('DOCX получен. Выберите действие: открыть, сохранить или удалить.', 'success');
  } catch (error) {
    cleanupGeneratedDocx();
    setStatus(`Ошибка отправки: ${error.message}`, 'error');
  } finally {
    uploadButton.disabled = false;
  }
});
