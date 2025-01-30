function addPrescricaoButton() {
  const toolbarEnds = document.getElementsByClassName("cke_toolbar_end");
  if (toolbarEnds.length > 0 && !document.querySelector(".prescricao-button")) {
    const lastToolbarEnd = toolbarEnds[toolbarEnds.length - 1];
    const button = document.createElement("button");
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("icons/icon48.png");
    icon.style.width = "19px";
    icon.style.height = "19px";
    button.appendChild(icon);
    button.className = "prescricao-button";
    button.title = "Calcular Prescrição Quinquenal";
    button.addEventListener("click", createPopup);
    lastToolbarEnd.insertAdjacentElement("beforebegin", button);
  }
}

// Check periodically until the element is found
const checkInterval = setInterval(() => {
  const toolbarEnds = document.getElementsByClassName("cke_toolbar_end");
  if (toolbarEnds.length > 0) {
    addPrescricaoButton();
    clearInterval(checkInterval);
  }
}, 500);

// Also try when DOM is loaded
document.addEventListener("DOMContentLoaded", addPrescricaoButton);

// And when window is fully loaded
window.addEventListener("load", addPrescricaoButton);

function createPopup() {
  const overlay = document.createElement("div");
  overlay.className = "prescricao-overlay";

  const popup = document.createElement("div");
  popup.className = "prescricao-popup";

  const form = document.createElement("div");
  form.className = "prescricao-form";

  const fields = [
    {
      id: "der",
      label: "DER da Revisional",
    },
    { id: "comunicacao", label: "Comunicação do Indeferimento" },
    { id: "ajuizamento", label: "Data do Ajuizamento" },
  ];

  fields.forEach((field) => {
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = field.id;
    label.textContent = field.label;

    const input = document.createElement("input");
    input.type = "date";
    input.id = field.id;

    fieldDiv.appendChild(label);
    fieldDiv.appendChild(input);
    form.appendChild(fieldDiv);
  });

  // Buttons container
  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "buttons-container";

  // Calculate button
  const calculateButton = document.createElement("button");
  calculateButton.textContent = "Calcular Prescrição";
  calculateButton.className = "btn-calculate";
  calculateButton.onclick = calculatePrescricao;

  // Cancel button
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancelar";
  cancelButton.className = "btn-cancel";
  cancelButton.onclick = () => {
    document.body.removeChild(overlay);
    document.body.removeChild(popup);
  };

  buttonsDiv.appendChild(calculateButton);
  buttonsDiv.appendChild(cancelButton);
  form.appendChild(buttonsDiv);

  popup.appendChild(form);
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
}

function calculatePrescricao() {
  const derDate = new Date(document.getElementById("der").value + "T12:00:00");
  const comunicacaoDate = new Date(
    document.getElementById("comunicacao").value + "T12:00:00"
  );
  const ajuizamentoDate = new Date(
    document.getElementById("ajuizamento").value + "T12:00:00"
  );
  // Check if dates are valid
  if (
    isNaN(derDate.getTime()) ||
    isNaN(comunicacaoDate.getTime()) ||
    isNaN(ajuizamentoDate.getTime())
  ) {
    alert("Por favor, insira datas válidas.");
    return;
  }

  // Calculate suspension days
  const diasSuspensao = Math.floor(
    (comunicacaoDate - derDate) / (1000 * 60 * 60 * 24)
  );

  // Calculate original prescription date (5 years before filing)
  const dataPrescricaoOriginal = new Date(ajuizamentoDate);
  dataPrescricaoOriginal.setFullYear(dataPrescricaoOriginal.getFullYear() - 5);

  // Calculate final prescription date
  const dataPrescricaoFinal = new Date(dataPrescricaoOriginal);
  dataPrescricaoFinal.setDate(dataPrescricaoFinal.getDate() - diasSuspensao);

  // Format dates for display
  const formatDate = (date) => date.toLocaleDateString("pt-BR");

  const resultText = `No presente caso, a aposentadoria titularizada pelo segurado restou concedida em XXX, com DER em XXX (Ev. X). O pedido de revisão administrativa para reconhecimento da atividade rural e período de tempo especial foi formulado em ${formatDate(
    derDate
  )} sendo o indeferimento comunicado ao autor em ${formatDate(
    comunicacaoDate
  )} (Ev. X). Assim, o lapso prescricional esteve suspenso por um período de ${diasSuspensao} dias. Como a presente ação foi ajuizada em ${formatDate(
    ajuizamentoDate
  )}, a prescrição atingiria as parcelas vencidas até ${formatDate(
    dataPrescricaoOriginal
  )}. No entanto, descontando-se o período de tramitação do pedido de revisão administrativa, restam prescritas as parcelas vencidas no período anterior a ${formatDate(
    dataPrescricaoFinal
  )}.`;

  // Create result container
  const resultContainer = document.createElement("div");
  resultContainer.className = "result-container";

  const resultTextArea = document.createElement("textarea");
  resultTextArea.value = resultText;
  resultTextArea.readOnly = true;
  resultTextArea.className = "result-text";

  const copyButton = document.createElement("button");
  copyButton.textContent = "Copiar";
  copyButton.className = "btn-copy";
  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(resultTextArea.value);
      document.querySelector(".prescricao-overlay").remove();
      document.querySelector(".prescricao-popup").remove();
    } catch (err) {
      resultTextArea.select();
      document.execCommand("copy");
      document.querySelector(".prescricao-overlay").remove();
      document.querySelector(".prescricao-popup").remove();
    }
  };

  resultContainer.appendChild(resultTextArea);
  resultContainer.appendChild(copyButton);

  // Remove previous result if exists
  const oldResult = document.querySelector(".result-container");
  if (oldResult) {
    oldResult.remove();
  }

  document.querySelector(".prescricao-form").appendChild(resultContainer);
}
