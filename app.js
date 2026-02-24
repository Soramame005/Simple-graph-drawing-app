document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const ctx = document.getElementById('main-chart').getContext('2d');
    const placeholderMsg = document.getElementById('placeholder-msg');
    const fileInfo = document.getElementById('file-info');
    const loadingMsg = document.getElementById('loading-msg');

    // Controls
    const titleInput = document.getElementById('chart-title');
    const xLabelInput = document.getElementById('x-label');
    const yLabelInput = document.getElementById('y-label');
    const colorInput = document.getElementById('line-color');
    const colorText = document.getElementById('line-color-text');
    const xColumnSelect = document.getElementById('x-column-select');
    const yColumnSelect = document.getElementById('y-column-select');
    const saveBtn = document.getElementById('save-btn');

    // Dataset Management
    const datasetListEl = document.getElementById('dataset-list');
    const clearBtn = document.getElementById('clear-btn');

    // --- State ---
    let chartInstance = null;
    let activeDatasetIndex = -1;
    const colorPalette = [
        '#000000', // Black
        '#FF0000', // Red
        '#0000FF', // Blue
        '#008000', // Green
        '#800080', // Purple
        '#FF8C00', // Dark Orange
        '#008080', // Teal
        '#8B4513'  // Saddle Brown
    ];

    // --- Initialization ---
    initChart();
    initializeColumnSelectors();

    // --- Event Listeners ---

    // Drag & Drop
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

    // Inputs
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

    // --- Core Functions ---

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
            data: {
                datasets: []
            },
            plugins: [whiteBackgroundPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false
                },
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
                        labels: {
                            color: '#000000',
                            font: { family: 'sans-serif' }
                        }
                    },
                    tooltip: {
                        enabled: true
                    }
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
                        ticks: {
                            color: '#000000',
                            font: { size: 12 }
                        },
                        border: {
                            color: '#000000',
                            width: 1
                        }
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
                        ticks: {
                            color: '#000000',
                            font: { size: 12 }
                        },
                        border: {
                            color: '#000000',
                            width: 1
                        }
                    }
                },
                layout: {
                    padding: 20
                }
            }
        });
    }

    function handleFile(file) {
        setFileStatus(`${file.name} を読み込み中...`);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const { rows, maxColumns } = parseRows(text);
            if (rows.length === 0) {
                setFileStatus(`${file.name}: 数値データが見つかりませんでした`, true);
                if (chartInstance.data.datasets.length === 0) {
                    placeholderMsg.style.display = 'block';
                }
                return;
            }

            placeholderMsg.style.display = 'none';

            prepareColumnSelectorsForColumnCount(maxColumns);

            const selectedX = parseInt(xColumnSelect.value, 10);
            const selectedY = parseInt(yColumnSelect.value, 10);
            const xColumn = Number.isInteger(selectedX) && selectedX < maxColumns ? selectedX : 0;
            const yColumn = Number.isInteger(selectedY) && selectedY < maxColumns
                ? selectedY
                : Math.min(1, maxColumns - 1);

            const dataPoints = buildPoints(rows, xColumn, yColumn, maxColumns);
            addDataset(file.name, dataPoints, { rows, maxColumns, xColumn, yColumn });
            syncColumnSelectorsWithDataset(chartInstance.data.datasets[activeDatasetIndex]);
            setFileStatus(`${file.name}: ${dataPoints.length} points loaded`);
        };
        reader.onerror = () => {
            setFileStatus(`${file.name}: ファイルの読み込みに失敗しました`, true);
        };

        reader.readAsText(file);

        fileInput.value = '';
    }


    function setFileStatus(message, isError = false) {
        fileInfo.style.display = 'block';
        loadingMsg.textContent = message;
        loadingMsg.style.color = isError ? '#fca5a5' : '';
    }

    function parseRows(text) {
        const lines = text.trim().split(/\r?\n/);
        const rows = [];
        let maxColumns = 0;

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const parts = trimmed.split(/[\s,]+/);
            const numericRow = parts.map((part) => parseFloat(part));
            const hasValidNumber = numericRow.some((value) => !isNaN(value));
            if (!hasValidNumber) return;

            maxColumns = Math.max(maxColumns, numericRow.length);
            rows.push(numericRow);
        });

        return { rows, maxColumns };
    }

    function buildPoints(rows, xColumn, yColumn, maxColumns) {
        const points = [];

        rows.forEach((row, index) => {
            if (maxColumns === 1) {
                const y = row[0];
                if (!isNaN(y)) {
                    points.push({ x: index, y });
                }
                return;
            }

            const x = row[xColumn];
            const y = row[yColumn];
            if (!isNaN(x) && !isNaN(y)) {
                points.push({ x, y });
            }
        });

        return points;
    }

    function addDataset(name, dataPoints, meta) {
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
            rawRows: meta.rows,
            maxColumns: meta.maxColumns,
            xColumn: meta.xColumn,
            yColumn: meta.yColumn
        };

        chartInstance.data.datasets.push(newDataset);
        chartInstance.update();

        activeDatasetIndex = nextIndex;
        renderDatasetList();
        updateColorInputs(color);
    }

    function updateActiveDatasetColumns() {
        if (activeDatasetIndex === -1 || !chartInstance) return;

        const dataset = chartInstance.data.datasets[activeDatasetIndex];
        if (!dataset) return;

        const xColumn = parseInt(xColumnSelect.value, 10);
        const yColumn = parseInt(yColumnSelect.value, 10);

        if (!Number.isInteger(xColumn) || !Number.isInteger(yColumn)) return;

        dataset.xColumn = xColumn;
        dataset.yColumn = yColumn;
        dataset.data = buildPoints(dataset.rawRows, xColumn, yColumn, dataset.maxColumns);

        chartInstance.update();
        renderDatasetList();
    }

    function initializeColumnSelectors() {
        prepareColumnSelectorsForColumnCount(2);
    }

    function prepareColumnSelectorsForColumnCount(maxColumns) {
        const targetColumns = Math.max(1, maxColumns);
        const selectedX = parseInt(xColumnSelect.value, 10);
        const selectedY = parseInt(yColumnSelect.value, 10);

        const nextX = Number.isInteger(selectedX) ? Math.min(selectedX, targetColumns - 1) : 0;
        const nextYDefault = targetColumns > 1 ? 1 : 0;
        const nextY = Number.isInteger(selectedY) ? Math.min(selectedY, targetColumns - 1) : nextYDefault;

        const columnOptions = Array.from({ length: targetColumns }, (_, index) => ({
            value: String(index),
            label: `Column ${index + 1}`
        }));

        populateColumnSelect(xColumnSelect, columnOptions, nextX);
        populateColumnSelect(yColumnSelect, columnOptions, nextY);

        const oneColumnOnly = targetColumns <= 1;
        xColumnSelect.disabled = oneColumnOnly;
        yColumnSelect.disabled = oneColumnOnly;
    }

    function syncColumnSelectorsWithDataset(dataset) {
        if (!dataset) {
            initializeColumnSelectors();
            return;
        }

        prepareColumnSelectorsForColumnCount(dataset.maxColumns);
        xColumnSelect.value = String(dataset.xColumn);
        yColumnSelect.value = String(dataset.yColumn);
    }

    function populateColumnSelect(selectEl, options, selectedValue) {
        selectEl.innerHTML = '';

        options.forEach((option) => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            selectEl.appendChild(optionEl);
        });

        const normalizedSelectedValue = String(selectedValue);
        const hasSelectedValue = options.some((option) => option.value === normalizedSelectedValue);
        selectEl.value = hasSelectedValue ? normalizedSelectedValue : options[0]?.value ?? '';
    }

    function clearAll() {
        chartInstance.data.datasets = [];
        chartInstance.update();
        activeDatasetIndex = -1;
        renderDatasetList();
        initializeColumnSelectors();
        placeholderMsg.style.display = 'block';
        fileInfo.style.display = 'none';
        loadingMsg.style.color = '';
    }

    function removeDataset(index) {
        chartInstance.data.datasets.splice(index, 1);
        chartInstance.update();

        if (activeDatasetIndex === index) {
            activeDatasetIndex = -1;
        } else if (activeDatasetIndex > index) {
            activeDatasetIndex--;
        }

        if (activeDatasetIndex === -1 && chartInstance.data.datasets.length > 0) {
            activeDatasetIndex = 0;
        }

        renderDatasetList();

        if (activeDatasetIndex !== -1) {
            const activeDataset = chartInstance.data.datasets[activeDatasetIndex];
            syncColumnSelectorsWithDataset(activeDataset);
            updateColorInputs(activeDataset.borderColor);
        } else {
            initializeColumnSelectors();
        }

        if (chartInstance.data.datasets.length === 0) {
            placeholderMsg.style.display = 'block';
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
                <div class="columns">X:C${ds.xColumn + 1} / Y:C${ds.yColumn + 1}</div>
                <button class="delete-btn" title="Remove">×</button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) return;
                activeDatasetIndex = index;
                renderDatasetList();
                updateColorInputs(ds.borderColor);
                syncColumnSelectorsWithDataset(ds);
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
