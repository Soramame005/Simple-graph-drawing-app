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
            // Update active dataset color
            chartInstance.data.datasets[activeDatasetIndex].borderColor = e.target.value;
            chartInstance.data.datasets[activeDatasetIndex].pointBackgroundColor = e.target.value;
            chartInstance.update();
            renderDatasetList(); // Update list dot
        }
    });

    saveBtn.addEventListener('click', saveGraph);
    clearBtn.addEventListener('click', clearAll);

    // --- Core Functions ---

    function initChart() {
        // Plugin to fill background white (for export)
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
            type: 'line', // 'line' with linear x-axis behaves like scatter but connected
            data: {
                datasets: [] // Start empty
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
                        display: true, // Show legend since we have multiple datasets
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
                        type: 'linear', // Critical for scientific multi-plot
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
        placeholderMsg.style.display = 'none';

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const dataPoints = parseData(text);
            addDataset(file.name, dataPoints);
        };
        reader.readAsText(file);

        // Reset input so same file can be selected again if cleared
        fileInput.value = '';
    }

    function parseData(text) {
        const lines = text.trim().split(/\r?\n/);
        const points = [];

        lines.forEach((line, index) => {
            const parts = line.trim().split(/[\s,]+/);

            if (parts.length >= 2) {
                const x = parseFloat(parts[0]);
                const y = parseFloat(parts[1]);
                if (!isNaN(x) && !isNaN(y)) {
                    points.push({ x, y });
                }
            } else if (parts.length === 1) {
                const y = parseFloat(parts[0]);
                if (!isNaN(y)) {
                    points.push({ x: index, y }); // Use index as X if missing
                }
            }
        });
        return points;
    }

    function addDataset(name, dataPoints) {
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
            showLine: true
        };

        chartInstance.data.datasets.push(newDataset);
        chartInstance.update();

        // Select the newly added dataset
        activeDatasetIndex = nextIndex;
        renderDatasetList();
        updateColorInputs(color);
    }

    function clearAll() {
        chartInstance.data.datasets = [];
        chartInstance.update();
        activeDatasetIndex = -1;
        renderDatasetList();
        placeholderMsg.style.display = 'block';
    }

    function removeDataset(index) {
        chartInstance.data.datasets.splice(index, 1);
        chartInstance.update();

        // Adjust active index
        if (activeDatasetIndex === index) {
            activeDatasetIndex = -1; // Deselect if removed active
        } else if (activeDatasetIndex > index) {
            activeDatasetIndex--; // Shift down
        }

        renderDatasetList();

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
                <button class="delete-btn" title="Remove">×</button>
            `;

            // Click to select
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) return; // Ignore click if delete
                activeDatasetIndex = index;
                renderDatasetList();
                updateColorInputs(ds.borderColor);
            });

            // Delete action
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeDataset(index);
            });

            datasetListEl.appendChild(item);
        });
    }

    function updateColorInputs(color) {
        // Convert to hex if it's not (browsers often return rgb)
        // Simple check: if it starts with #
        if (color.startsWith('#')) {
            colorInput.value = color;
            colorText.value = color;
        } else {
            // Very basic rgb to hex, or just rely on color input accepting generic values?
            // Input type color needs Hex 7 chars.
            // If it's a named color or rgba, this might fail to update the picker visual,
            // but for our palette (hex) it works.
            // If user enters custom text color, we might need conversion.
            // For now, assume hex from our palette or valid hex input.
        }
    }

    function updateChartConfig() {
        if (!chartInstance) return;

        // Title
        chartInstance.options.plugins.title.text = titleInput.value;

        // Axes
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
