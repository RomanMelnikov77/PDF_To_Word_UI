const ENDPOINT = 'http://localhost:8090/create';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const uploadButton = document.getElementById('upload-btn');
const statusNode = document.getElementById('status');
const resultActions = document.getElementById('result-actions');
const saveButton = document.getElementById('save-btn');
const deleteButton = document.getElementById('delete-btn');

let selectedFile = null;
let generatedDocxUrl = null;
let generatedDocxName = 'converted.docx';

function setStatus(message, type = '') {
  statusNode.textContent = message;
  statusNode.className = `status ${type}`.trim();
}

function hideResultActions() {
  resultActions.hidden = true;
}

function cleanupGeneratedDocx() {
  if (generatedDocxUrl) {
    URL.revokeObjectURL(generatedDocxUrl);
  }

  generatedDocxUrl = null;
  generatedDocxName = 'converted.docx';
  hideResultActions();
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
  fileInfo.textContent = `Файл: ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
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
  setStatus('DOCX скачивание запущено.', 'success');
});

deleteButton.addEventListener('click', () => {
  cleanupGeneratedDocx();
  setStatus('DOCX удалён из popup и не будет сохранён.', 'success');
});

uploadButton.addEventListener('click', async () => {
  if (!selectedFile) {
    setStatus('Сначала выберите PDF файл.', 'error');
    return;
  }

  uploadButton.disabled = true;
  setStatus('Отправка...');

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

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setStatus('Ответ получен, но content-type не DOCX. Всё равно предложим сохранить.', 'error');
    }

    cleanupGeneratedDocx();
    const blob = await response.blob();
    generatedDocxUrl = URL.createObjectURL(blob);

    const responseFilename = tryGetFilename(response.headers.get('content-disposition'));
    generatedDocxName = responseFilename || selectedFile.name.replace(/\.pdf$/i, '') + '.docx';

    resultActions.hidden = false;
    setStatus('DOCX получен. Выберите: сохранить или удалить.', 'success');
  } catch (error) {
    cleanupGeneratedDocx();
    setStatus(`Ошибка отправки: ${error.message}`, 'error');
  } finally {
    uploadButton.disabled = false;
  }
});
