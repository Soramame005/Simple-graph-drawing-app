document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const ctx = document.getElementById('main-chart').getContext('2d');
    const placeholderMsg = document.getElementById('placeholder-msg');

    // Controls
    const titleInput = document.getElementById('chart-title');
    const xLabelInput = document.getElementById('x-label');
    const yLabelInput = document.getElementById('y-label');
    const colorInput = document.getElementById('line-color');
    const colorText = document.getElementById('line-color-text');
    const saveBtn = document.getElementById('save-btn');

    const { xColumnSelect, yColumnSelect } = ensureColumnSelectors();

    // Dataset Management
    const datasetListEl = document.getElementById('dataset-list');
    const clearBtn = document.getElementById('clear-btn');

    // --- State ---
    let chartInstance = null;
    let activeDatasetIndex = -1;
    const colorPalette = [
        '#000000',
        '#FF0000',
        '#0000FF',
        '#008000',
        '#800080',
        '#FF8C00',
        '#008080',
        '#8B4513'
    ];

    // --- Initialization ---
    initChart();
    initializeColumnSelectors();

    // --- Event Listeners ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    titleInput.addEventListener('input', updateChartConfig);
    xLabelInput.addEventListener('input', updateChartConfig);
    yLabelInput.addEventListener('input', updateChartConfig);

    colorInput.addEventListener('input', (e) => {
        colorText.value = e.target.value;
        if (activeDatasetIndex !== -1 && chartInstance) {
            chartInstance.data.datasets[activeDatasetIndex].borderColor = e.target.value;
            chartInstance.data.datasets[activeDatasetIndex].pointBackgroundColor = e.target.value;
            chartInstance.update();
            renderDatasetList();
        }
    });

    xColumnSelect.addEventListener('change', updateActiveDatasetColumns);
    yColumnSelect.addEventListener('change', updateActiveDatasetColumns);

    saveBtn.addEventListener('click', saveGraph);
    clearBtn.addEventListener('click', clearAll);


    function ensureColumnSelectors() {
        const existingX = document.getElementById('x-column-select');
        const existingY = document.getElementById('y-column-select');

        if (existingX && existingY) {
            return { xColumnSelect: existingX, yColumnSelect: existingY };
        }

        const colorGroup = colorInput.closest('.control-group');
        const createGroup = (labelText, selectId) => {
            const group = document.createElement('div');
            group.className = 'control-group';

            const label = document.createElement('label');
            label.textContent = labelText;

            const select = document.createElement('select');
            select.id = selectId;

            group.appendChild(label);
            group.appendChild(select);
            return { group, select };
        };

        const xGroup = createGroup('X Data Column', 'x-column-select');
        const yGroup = createGroup('Y Data Column', 'y-column-select');

        colorGroup.parentNode.insertBefore(xGroup.group, colorGroup);
        colorGroup.parentNode.insertBefore(yGroup.group, colorGroup);

        return { xColumnSelect: xGroup.select, yColumnSelect: yGroup.select };
    }

    function initChart() {
        const whiteBackgroundPlugin = {
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chart) => {
                const { ctx } = chart;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        };

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            plugins: [whiteBackgroundPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: titleInput.value,
                        color: '#000000',
                        font: { size: 16, family: 'sans-serif', weight: 'bold' },
                        padding: { bottom: 20 }
                    },
                    legend: {
                        display: true,
                        labels: { color: '#000000', font: { family: 'sans-serif' } }
                    },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: xLabelInput.value,
                            color: '#000000',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: {
                            color: '#e0e0e0',
                            drawBorder: true,
                            borderColor: '#000000',
                            tickColor: '#000000'
                        },
                        ticks: { color: '#000000', font: { size: 12 } },
                        border: { color: '#000000', width: 1 }
                    },
                    y: {
                        title: {
                            display: true,
                            text: yLabelInput.value,
                            color: '#000000',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: {
                            color: '#e0e0e0',
                            drawBorder: true,
                            borderColor: '#000000',
                            tickColor: '#000000'
                        },
                        ticks: { color: '#000000', font: { size: 12 } },
                        border: { color: '#000000', width: 1 }
                    }
                },
                layout: { padding: 20 }
            }
        });
    }

    function initializeColumnSelectors() {
        populateColumnSelectors(2, 0, 1);
        xColumnSelect.disabled = true;
        yColumnSelect.disabled = true;
    }

    function populateColumnSelectors(maxColumns, xColumn, yColumn) {
        xColumnSelect.innerHTML = '';
        yColumnSelect.innerHTML = '';
        for (let i = 0; i < maxColumns; i++) {
            const optionX = document.createElement('option');
            optionX.value = String(i);
            optionX.textContent = `Column ${i + 1}`;
            xColumnSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = String(i);
            optionY.textContent = `Column ${i + 1}`;
            yColumnSelect.appendChild(optionY);
        }
        xColumnSelect.value = String(xColumn);
        yColumnSelect.value = String(yColumn);
    }

    function normalizeColumns(maxColumns, xColumn, yColumn) {
        const safeX = Number.isInteger(xColumn) && xColumn >= 0 ? Math.min(xColumn, maxColumns - 1) : 0;
        const safeYDefault = maxColumns > 1 ? 1 : 0;
        const safeY = Number.isInteger(yColumn) && yColumn >= 0 ? Math.min(yColumn, maxColumns - 1) : safeYDefault;
        return { xColumn: safeX, yColumn: safeY };
    }

    function getMaxColumns(text) {
        const lines = text.trim().split(/\r?\n/);
        let maxColumns = 1;
        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) {
                return;
            }
            const parts = trimmed.split(/[\s,]+/);
            maxColumns = Math.max(maxColumns, parts.length);
        });
        return maxColumns;
    }

    function parseData(text, xColumn, yColumn) {
        const lines = text.trim().split(/\r?\n/);
        const points = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) {
                return;
            }

            const parts = trimmed.split(/[\s,]+/);
            const y = parseFloat(parts[yColumn]);
            if (Number.isNaN(y)) {
                return;
            }

            const xCandidate = parseFloat(parts[xColumn]);
            const x = Number.isNaN(xCandidate) ? index : xCandidate;
            points.push({ x, y });
        });

        return points;
    }

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const maxColumns = getMaxColumns(text);
            const initial = normalizeColumns(maxColumns, 0, maxColumns > 1 ? 1 : 0);
            const dataPoints = parseData(text, initial.xColumn, initial.yColumn);

            if (dataPoints.length === 0) {
                if (chartInstance.data.datasets.length === 0) {
                    placeholderMsg.style.display = 'block';
                }
                return;
            }

            placeholderMsg.style.display = 'none';
            addDataset(file.name, text, maxColumns, initial.xColumn, initial.yColumn, dataPoints);
        };
        reader.readAsText(file);
        fileInput.value = '';
    }

    function addDataset(name, rawText, maxColumns, xColumn, yColumn, dataPoints) {
        const nextIndex = chartInstance.data.datasets.length;
        const color = colorPalette[nextIndex % colorPalette.length];

        const newDataset = {
            label: name,
            data: dataPoints,
            borderColor: color,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 1.5,
            tension: 0,
            pointRadius: 2,
            pointBackgroundColor: color,
            fill: false,
            showLine: true,
            rawText,
            maxColumns,
            xColumn,
            yColumn
        };

        chartInstance.data.datasets.push(newDataset);
        chartInstance.update();

        activeDatasetIndex = nextIndex;
        renderDatasetList();
        updateColorInputs(color);
        syncColumnSelectorsForActiveDataset();
    }

    function syncColumnSelectorsForActiveDataset() {
        if (activeDatasetIndex < 0 || !chartInstance.data.datasets[activeDatasetIndex]) {
            initializeColumnSelectors();
            return;
        }

        const dataset = chartInstance.data.datasets[activeDatasetIndex];
        const normalized = normalizeColumns(dataset.maxColumns, dataset.xColumn, dataset.yColumn);
        dataset.xColumn = normalized.xColumn;
        dataset.yColumn = normalized.yColumn;

        populateColumnSelectors(dataset.maxColumns, dataset.xColumn, dataset.yColumn);
        const disable = dataset.maxColumns < 2;
        xColumnSelect.disabled = disable;
        yColumnSelect.disabled = disable;
    }

    function updateActiveDatasetColumns() {
        if (activeDatasetIndex < 0 || !chartInstance.data.datasets[activeDatasetIndex]) {
            return;
        }

        const dataset = chartInstance.data.datasets[activeDatasetIndex];
        const selected = normalizeColumns(
            dataset.maxColumns,
            parseInt(xColumnSelect.value, 10),
            parseInt(yColumnSelect.value, 10)
        );

        dataset.xColumn = selected.xColumn;
        dataset.yColumn = selected.yColumn;
        dataset.data = parseData(dataset.rawText, dataset.xColumn, dataset.yColumn);

        populateColumnSelectors(dataset.maxColumns, dataset.xColumn, dataset.yColumn);
        chartInstance.update();
        renderDatasetList();
    }

    function clearAll() {
        chartInstance.data.datasets = [];
        chartInstance.update();
        activeDatasetIndex = -1;
        renderDatasetList();
        placeholderMsg.style.display = 'block';
        initializeColumnSelectors();
    }

    function removeDataset(index) {
        chartInstance.data.datasets.splice(index, 1);
        chartInstance.update();

        if (activeDatasetIndex === index) {
            activeDatasetIndex = -1;
        } else if (activeDatasetIndex > index) {
            activeDatasetIndex--;
        }

        renderDatasetList();

        if (chartInstance.data.datasets.length === 0) {
            placeholderMsg.style.display = 'block';
            initializeColumnSelectors();
        } else {
            if (activeDatasetIndex === -1) {
                activeDatasetIndex = 0;
            }
            syncColumnSelectorsForActiveDataset();
        }
    }

    function renderDatasetList() {
        datasetListEl.innerHTML = '';
        chartInstance.data.datasets.forEach((ds, index) => {
            const item = document.createElement('div');
            item.className = `dataset-item ${index === activeDatasetIndex ? 'active' : ''}`;

            item.innerHTML = `
                <div class="color-dot" style="background-color: ${ds.borderColor}"></div>
                <div class="name" title="${ds.label}">${ds.label}</div>
                <button class="delete-btn" title="Remove">×</button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) return;
                activeDatasetIndex = index;
                renderDatasetList();
                updateColorInputs(ds.borderColor);
                syncColumnSelectorsForActiveDataset();
            });

            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeDataset(index);
            });

            datasetListEl.appendChild(item);
        });
    }

    function updateColorInputs(color) {
        if (color.startsWith('#')) {
            colorInput.value = color;
            colorText.value = color;
        }
    }

    function updateChartConfig() {
        if (!chartInstance) return;

        chartInstance.options.plugins.title.text = titleInput.value;
        chartInstance.options.scales.x.title.text = xLabelInput.value;
        chartInstance.options.scales.y.title.text = yLabelInput.value;
        chartInstance.update();
    }

    function saveGraph() {
        const link = document.createElement('a');
        link.download = 'graph.png';
        link.href = document.getElementById('main-chart').toDataURL('image/png', 1.0);
        link.click();
    }
});
