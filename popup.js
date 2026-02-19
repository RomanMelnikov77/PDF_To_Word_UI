const ENDPOINT = 'http://localhost:8090/create';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const uploadButton = document.getElementById('upload-btn');
const statusNode = document.getElementById('status');

let selectedFile = null;

function setStatus(message, type = '') {
  statusNode.textContent = message;
  statusNode.className = `status ${type}`.trim();
}

function isPdf(file) {
  return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}

function setSelectedFile(file) {
  if (!isPdf(file)) {
    selectedFile = null;
    fileInfo.hidden = true;
    uploadButton.disabled = true;
    setStatus('Нужен файл в формате PDF.', 'error');
    return;
  }

  selectedFile = file;
  fileInfo.hidden = false;
  fileInfo.textContent = `Файл: ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
  uploadButton.disabled = false;
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

    setStatus('Файл успешно отправлен.', 'success');
  } catch (error) {
    setStatus(`Ошибка отправки: ${error.message}`, 'error');
  } finally {
    uploadButton.disabled = false;
  }
});
