// Mock DOM elements
document.body.innerHTML = `
    <div id="deviceCards"></div>
    <input id="searchInput" type="text" />
    <select id="categoryFilter">
        <option value="">All Categories</option>
        <option value="camera">Camera</option>
    </select>
    <select id="statusFilter">
        <option value="">All Status</option>
        <option value="active">Active</option>
    </select>
    <select id="performanceSort">
        <option value="">Default</option>
        <option value="high">Highest First</option>
    </select>
    <span id="deviceCount">0</span>
    <button id="refreshDevices">Refresh</button>
    <button id="toggleView">Toggle View</button>
    <button id="exportXLSX">XLSX</button>
    <button id="exportCSV">CSV</button>
    <button id="exportPDF">PDF</button>
`;

// Global variables
global.API_BASE_URL = 'http://localhost:5000/api';
global.devices = [];
global.viewMode = 'grid';

// DOM element references
global.deviceCardsContainer = document.getElementById('deviceCards');
global.searchInput = document.getElementById('searchInput');
global.categoryFilter = document.getElementById('categoryFilter');
global.statusFilter = document.getElementById('statusFilter');
global.performanceSort = document.getElementById('performanceSort');
global.deviceCount = document.getElementById('deviceCount');
global.refreshButton = document.getElementById('refreshDevices');
global.toggleViewButton = document.getElementById('toggleView');
global.exportButtons = {
    xlsx: document.getElementById('exportXLSX'),
    csv: document.getElementById('exportCSV'),
    pdf: document.getElementById('exportPDF')
};

// Helper functions
global.formatSpecifications = (device) => {
    const specs = {
        'system': {
            title: 'System Specifications',
            icon: 'bi-cpu',
            items: {
                'Processor': device.specs?.processor || 'N/A',
                'Memory': device.specs?.memory || 'N/A',
                'Storage': device.specs?.storage || 'N/A',
                'Operating System': device.specs?.operating_system || 'N/A'
            }
        },
        'connectivity': {
            title: 'Connectivity',
            icon: 'bi-hdd-network',
            items: {
                'Ethernet': device.specs?.ethernet || 'N/A',
                'I/O Ports': device.specs?.io || 'N/A',
                'Wireless': device.specs?.wireless || 'N/A',
                'WLAN': device.specs?.wlan || 'N/A',
                'BT': device.specs?.bt || 'N/A'
            }
        },
        'physical': {
            title: 'Physical Characteristics',
            icon: 'bi-box',
            items: {
                'Operating Temperature': device.specs?.operating_temperature || 'N/A',
                'Certifications': device.specs?.certifications || 'N/A',
                'Expansion': device.specs?.expansion || 'N/A'
            }
        },
        'ai': {
            title: 'AI Capabilities',
            icon: 'bi-diagram-3',
            items: {
                'AI Performance': device.performance ? `${device.performance} TOPS` : 'N/A',
                'GPU': device.specs?.gpu || 'N/A',
                'Camera': device.specs?.camera || 'N/A',
                'Video Channels': device.specs?.video_chs || 'N/A'
            }
        }
    };

    return Object.entries(specs).map(([category, data]) => `
        <div class="specs-category" data-category="${category}">
            <div class="specs-category-header">
                <i class="bi ${data.icon}"></i>
                <h6 class="specs-category-title">${data.title}</h6>
            </div>
            <div class="specs-category-content">
                <div class="specs-grid">
                    ${Object.entries(data.items).map(([key, value]) => `
                        <div class="specs-item">
                            <span class="specs-label">${key}</span>
                            <span class="specs-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
};

// Mock functions
global.viewDeviceDetails = jest.fn();
global.restartDevice = jest.fn();
global.configureDevice = jest.fn();

// Mock fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{
            id: 'device001',
            name: 'Edge Device 1',
            status: 'active',
            lastSeen: '2024-03-23T12:00:00Z',
            type: 'camera',
            performance: 85,
            specs: {
                processor: 'Intel Core i5-1135G7',
                memory: '16GB DDR4',
                storage: '512GB NVMe SSD',
                operating_system: 'Linux Ubuntu 20.04 LTS',
                networking: 'Wi-Fi 6, Bluetooth 5.0',
                io_interfaces: 'USB 3.0 x4, HDMI 2.0',
                display_output: '4K@60Hz',
                dimensions: '300mm x 200mm x 50mm',
                weight: '2.5 kg',
                power_input: '12V DC, 5A',
                operating_temperature: '0°C to 40°C'
            }
        }])
    })
);

// Mock functions from main.js
global.fetchDevices = async function() {
    try {
        deviceCardsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

        const response = await fetch(`${API_BASE_URL}/devices`);
        if (!response.ok) {
            throw new Error('Failed to fetch devices');
        }
        global.devices = await response.json();
        updateDeviceCount();
        filterAndSortDevices();
    } catch (error) {
        console.error('Error fetching devices:', error);
        deviceCardsContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger" role="alert">
                    Failed to load devices. Please try again later.
                </div>
            </div>
        `;
    }
};

global.updateDeviceCount = function() {
    deviceCount.textContent = devices.length.toString();
};

global.filterAndSortDevices = function() {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;
    const sortValue = performanceSort.value;
    
    let filteredDevices = devices.filter(device => {
        const matchesSearch = device.name.toLowerCase().includes(searchTerm) ||
                            device.id.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryValue || device.type === categoryValue;
        const matchesStatus = !statusValue || device.status === statusValue;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortValue) {
        filteredDevices.sort((a, b) => {
            const perfA = a.performance || 0;
            const perfB = b.performance || 0;
            return sortValue === 'high' ? perfB - perfA : perfA - perfB;
        });
    }
    
    renderDevices(filteredDevices);
};

global.toggleView = function() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    toggleViewButton.innerHTML = `<i class="bi bi-${viewMode === 'grid' ? 'list' : 'grid'}"></i> Toggle View`;
    filterAndSortDevices();
};

global.renderDevices = function(devicesToRender) {
    if (devicesToRender.length === 0) {
        deviceCardsContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info" role="alert">
                    No devices match your search criteria.
                </div>
            </div>
        `;
        return;
    }

    const cardClasses = viewMode === 'grid' ? 'col-md-6 col-lg-4' : 'col-12';
    deviceCardsContainer.innerHTML = devicesToRender.map((device, index) => `
        <div class="${cardClasses}">
            <div class="card device-card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <span class="status-indicator status-${device.status}"></span>
                        ${device.name}
                    </div>
                    <span class="badge bg-primary">${device.type}</span>
                </div>
                <div class="card-body">
                    <div class="device-info mb-3">
                        <div class="row g-2">
                            <div class="col-6">
                                <div class="info-item">
                                    <small class="text-muted">Device ID</small>
                                    <div class="fw-medium">${device.id}</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="info-item">
                                    <small class="text-muted">Status</small>
                                    <div class="fw-medium text-${device.status === 'active' ? 'success' : device.status === 'error' ? 'danger' : 'warning'}">
                                        ${device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                                    </div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="info-item">
                                    <small class="text-muted">Last Seen</small>
                                    <div class="fw-medium">${new Date(device.lastSeen).toLocaleString()}</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="info-item">
                                    <small class="text-muted">AI Performance</small>
                                    <div class="fw-medium">
                                        <div class="progress" style="height: 6px;">
                                            <div class="progress-bar" role="progressbar" 
                                                style="width: ${device.performance || 0}%;" 
                                                aria-valuenow="${device.performance || 0}" 
                                                aria-valuemin="0" 
                                                aria-valuemax="100">
                                            </div>
                                        </div>
                                        <small class="mt-1 d-block">${device.performance || 0}%</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="accordion" id="deviceAccordion${index}">
                        <div class="accordion-item border-0">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed p-2 bg-light" type="button" 
                                        data-bs-toggle="collapse" 
                                        data-bs-target="#deviceCollapse${index}">
                                    <small>Device Specifications</small>
                                </button>
                            </h2>
                            <div id="deviceCollapse${index}" class="accordion-collapse collapse" 
                                 data-bs-parent="#deviceAccordion${index}">
                                <div class="accordion-body p-3 bg-light rounded">
                                    ${formatSpecifications(device)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <button class="btn btn-sm btn-primary" onclick="viewDeviceDetails('${device.id}')">
                            View Details
                        </button>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary" onclick="restartDevice('${device.id}')">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="configureDevice('${device.id}')">
                                <i class="bi bi-gear"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
};

global.exportToXLSX = function() {
    alert('XLSX export functionality will be implemented in the next phase');
};

global.exportToCSV = function() {
    const csv = [
        ['ID', 'Name', 'Status', 'Type', 'Last Seen', 'AI Performance'],
        ...devices.map(device => [
            device.id,
            device.name,
            device.status,
            device.type,
            device.lastSeen,
            device.performance || 'N/A'
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'devices.csv');
    a.click();
    a.remove();
};

global.exportToPDF = function() {
    alert('PDF export functionality will be implemented in the next phase');
};