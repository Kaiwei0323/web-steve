/**
 * Main JavaScript file for Edge AI Insight application
 * 
 * IMPORTANT TAG DISPLAY RULES:
 * ----------------------------
 * 1. Tags should ONLY be displayed if:
 *    - The device has a "tag" property in MongoDB
 *    - The tag value is not null
 *    - The tag value is not an empty string
 * 
 * 2. This rule applies to ALL devices, including NCOX
 *    - There is no special handling for any device type
 *    - All devices follow the same tag display rules
 * 
 * 3. If a tag doesn't meet these criteria, it should not be displayed
 * 
 * These rules must be maintained for all future device types added to the application.
 */

// Constants
const STORAGE_KEY = 'edgeai-preferences';
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// Global variables
let devices = [];
let originalDevices = []; // Store original device order
let currentView = 'grid'; // 'grid' or 'list'
let viewMode = 'grid'; // Initialize viewMode
let isLoading = false;
let currentOpenTab = {
    cardId: null,
    tabType: null
};

// DOM elements
let deviceCardsContainer;
let deviceCount;
let deviceModal;
let sortBy;
let filterStatus;
let searchInput;
let categoryFilter;
let modelFilter;
let toggleViewBtn;
let refreshBtn;
let compareButtonContainer;
let compareCount;

// Initialize DOM elements
function initializeDOMElements() {
    deviceCardsContainer = document.getElementById('deviceCards');
    deviceCount = document.getElementById('deviceCount');
    deviceModal = document.getElementById('deviceModal');
    sortBy = document.getElementById('sortOptions');
    filterStatus = document.getElementById('statusFilter');
    searchInput = document.getElementById('searchInput');
    categoryFilter = document.getElementById('categoryFilter');
    modelFilter = document.getElementById('modelFilter');
    toggleViewBtn = document.getElementById('toggleView');
    refreshBtn = document.getElementById('refreshDevices');
    compareButtonContainer = document.getElementById('compareButtonContainer');
    compareCount = document.getElementById('compareCount');
}

// Initialize the application
async function initializeApp() {
    console.log('Initializing application...');
    
    // Initialize DOM elements first
    initializeDOMElements();
    
    // Check if all required elements are present
    const requiredElements = {
        deviceCardsContainer,
        deviceCount,
        sortBy,
        filterStatus,
        searchInput,
        categoryFilter,
        modelFilter,
        toggleViewBtn,
        refreshBtn
    };

    const missingElements = Object.entries(requiredElements)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Required DOM elements not found:', missingElements);
        return;
    }
    
    // Load saved preferences
    try {
        const savedPrefs = localStorage.getItem(STORAGE_KEY);
        if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            searchInput.value = prefs.searchTerm || '';
            filterStatus.value = prefs.statusValue || '';
            modelFilter.value = prefs.modelValue || '';
            sortBy.value = prefs.sortValue || '';
            currentView = prefs.viewMode || 'grid';
            
            // Set expansion filter value if it exists
            const expansionFilter = document.getElementById('expansionFilter');
            if (expansionFilter && prefs.expansionValue) {
                expansionFilter.value = prefs.expansionValue;
            }
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
    
    // Add event listeners for filters and sorting
    initializeSearch();
    // Remove the old event listener since it's now handled in initializeFilters
    // filterStatus.addEventListener('change', handleFilters);
    // modelFilter.addEventListener('change', handleFilters);
    sortBy.addEventListener('change', handleSort);
    
    // Add event listeners for refresh and toggle view
    refreshBtn.addEventListener('click', loadDevices);
    toggleViewBtn.addEventListener('click', toggleView);
    
    // Add event listeners for export buttons
    const exportXLSXBtn = document.getElementById('exportXLSX');
    const exportCSVBtn = document.getElementById('exportCSV');
    const exportPDFBtn = document.getElementById('exportPDF');
    
    if (exportXLSXBtn) exportXLSXBtn.addEventListener('click', exportToXLSX);
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportToCSV);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportToPDF);
    
    // Set up loading indicators
    showLoadingState();
    
    try {
        // Load device data
        await loadDevices();
        
        // Initialize filters
        initializeFilters();
        
        // Initialize specs toggle for all device cards
        document.querySelectorAll('[id^="basic-specs-"]').forEach(radio => {
            // Simulate a click to ensure Core specs view is active by default
            if (radio.checked) {
                toggleSpecsView(radio, radio.id.replace('basic-specs-', ''));
            }
        });
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showErrorState('Failed to initialize the application.');
    }
}

// Load devices from API
async function loadDevices() {
    try {
        showLoadingState();
        console.log('Fetching devices from MongoDB...');
        
        const response = await fetch(API_URL + '/devices/mongodb', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const mongoData = await response.json();
        console.log(`Received ${mongoData.length} devices from MongoDB`);
        
        // Transform MongoDB data to match frontend format
        devices = mongoData.map(device => {
            // Use the performance value that was already processed in the backend
            const performance = device.performance || 0;
            const status = device.Status?.toLowerCase() || 'disabled';
            
            // Store the MongoDB _id for later use
            const mongoId = device._id.$oid || device._id;
            
            // Create a proper device ID that matches what we'll use later
            const deviceId = mongoId || `device-${Math.random().toString(36).substr(2, 9)}`;
            
            // Get the device name from MongoDB and ensure it's properly formatted
            const deviceName = device.deviceName || device.name || '';
            
            // Determine the product type and format the display name accordingly
            let displayName;
            if (deviceName.toLowerCase().includes('server')) {
                displayName = deviceName.startsWith('AI Edge Server') ? deviceName : `AI Edge Server ${deviceName}`;
                type = 'server';
            } else {
                displayName = deviceName.startsWith('Edge AI') ? deviceName : `Edge AI ${deviceName}`;
                type = 'ai_edge';
            }
            
            return {
                id: deviceId,
                _id: mongoId,
                name: displayName,
                deviceName: deviceName,
                model: device.Model || deviceName || 'Unknown Model',
                type: type,
                status: device.status,
                formatted_status: device.formatted_status,
                performance: performance,
                rawDeviceName: deviceName,
                tag: device.tag, // Add tag from MongoDB
                description_summary: device.description_summary || null, // Add description_summary from MongoDB
                applications: device.applications || [],
                specs: {
                    processor: device.Processor || device.CPU || 'Not Available',
                    memory: device.Memory || 'Not Available',
                    storage: device.Storage || 'Not Available',
                    gpu: device.GPU || 'Not Available',
                    os: device.OS || 'Not Available',
                    ethernet: device.Ethernet || 'Not Available',
                    io: device["I/O"] || 'Not Available',
                    expansion: device["Expansion"] || null,
                    buttons: device.Button || 'Not Available',
                    operating_temperature: device["Operating Tempeture"] || 'Not Available',
                    wireless: device.Wireless || null,
                    wlan: device.WLAN || null,
                    bt: device.BT || null,
                    camera: device.Camera || null,
                    video_chs: device["Video CHs"] || null,
                    certifications: device.Certifications || null
                }
            };
        });
        
        // Store original device order
        originalDevices = [...devices];
        
        updateDeviceCount();
        renderDevices();
    } catch (error) {
        console.error('Error loading devices:', error);
        let errorMessage = 'Failed to load devices. ';
        
        if (error.message.includes('CORS')) {
            errorMessage += 'CORS error: Please ensure the backend server is running and CORS is properly configured.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Connection error: Please ensure the backend server is running at ' + API_URL;
        } else {
            errorMessage += error.message;
        }
        
        showErrorState(errorMessage);
    }
}

// Show loading state
function showLoadingState() {
    deviceCardsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading devices...</p>
        </div>
    `;
}

// Show error state
function showErrorState(message) {
    deviceCardsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
            </div>
            <button class="btn btn-primary mt-3" onclick="loadDevices()">
                <i class="bi bi-arrow-clockwise me-2"></i>Retry
            </button>
        </div>
    `;
}

// Update device count
function updateDeviceCount() {
    deviceCount.textContent = devices.length;
}

// Handle search with debounce
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filteredDevices = devices.filter(device => {
        // Match against device name (title) only
        const nameMatch = device.name?.toLowerCase().includes(searchTerm);
        // Match against model ID only
        const modelMatch = device.model?.toLowerCase().includes(searchTerm);
        
        // Only return true if either the name or model matches
        return nameMatch || modelMatch;
    });
    
    // Update device count
    updateDeviceCount(filteredDevices.length);
    
    // Render filtered devices
    renderDevices(filteredDevices);
    
    // Update search results count
    const searchResultsCount = document.getElementById('searchResultsCount');
    if (searchResultsCount) {
        searchResultsCount.textContent = filteredDevices.length;
    }
}

// Add debug function
function debugFilterState() {
    console.log('Current Filter State:');
    console.log('Status Filter Value:', filterStatus.value);
    console.log('All Devices:', devices.map(d => ({
        name: d.name,
        status: d.status,
        formatted_status: d.formatted_status
    })));
}

// Update handleFilters function
function handleFilters() {
    try {
        debugFilterState();
        
        // Get current filter values
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const statusValue = filterStatus ? filterStatus.value : '';
        const categoryValue = categoryFilter ? categoryFilter.value : '';
        const modelValue = modelFilter ? modelFilter.value : '';
        
        // Save user preferences
        saveUserPreferences({
            searchTerm,
            statusValue,
            categoryValue,
            modelValue,
            sortValue: sortBy ? sortBy.value : '',
            viewMode: currentView
        });
        
        // Render filtered devices
        renderDevices();
    } catch (error) {
        console.error('Error handling filters:', error);
    }
}

// Filter devices based on current filters
function filterDevices(devices) {
    if (!devices || !devices.length) return [];
    
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const statusValue = filterStatus ? filterStatus.value : '';
    const categoryValue = categoryFilter ? categoryFilter.value : '';
    const modelValue = modelFilter ? modelFilter.value : '';
    
    console.log('Filtering devices with:', {
        searchTerm,
        statusValue,
        categoryValue,
        modelValue
    });
    
    return devices.filter(device => {
        // Search filter - search in both full name and device name
        const nameMatch = device.name && device.name.toLowerCase().includes(searchTerm);
        const deviceNameMatch = device.deviceName && device.deviceName.toLowerCase().includes(searchTerm);
        const searchMatch = !searchTerm || nameMatch || deviceNameMatch;
        
        // Status filter
        const statusMatch = !statusValue || device.status === statusValue;
        
        // Category filter
        const categoryMatch = !categoryValue || device.type === categoryValue;
        
        // Model filter - match against device name
        const modelFilterMatch = !modelValue || device.deviceName === modelValue;
        
        return searchMatch && statusMatch && categoryMatch && modelFilterMatch;
    });
}

// Save user preferences to local storage
function saveUserPreferences(prefs) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
        console.error('Error saving preferences:', error);
    }
}

// Handle sort
function handleSort() {
    // Visual confirmation effect for reset
    if (!sortBy.value) {
        showResetConfirmation();
    }
    renderDevices();
}

// Show visual confirmation for reset order
function showResetConfirmation() {
    // Add a brief animation/effect to indicate reset
    const deviceCards = document.querySelectorAll('.card');
    deviceCards.forEach(card => {
        // Add a quick flash effect
        card.classList.add('reset-flash');
        // Remove the class after animation completes
        setTimeout(() => {
            card.classList.remove('reset-flash');
        }, 500);
    });
}

// Toggle view between grid and list
function toggleView() {
    currentView = currentView === 'grid' ? 'list' : 'grid';
    toggleViewBtn.innerHTML = currentView === 'grid' ? 
        '<i class="bi bi-grid"></i> Toggle View' : 
        '<i class="bi bi-list"></i> Toggle View';
    renderDevices();
    
    // Ensure the floating compare button visibility is correct
    setTimeout(() => {
        updateCompareButton();
    }, 100);
}

// Filter and sort devices
function getFilteredDevices() {
    let filtered = [...devices];
    
    // Apply search filter (substring match) - restricted to name and model only
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(device => 
            device.name?.toLowerCase().includes(searchTerm) ||
            device.model?.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply category filter
    const category = categoryFilter.value;
    if (category) {
        filtered = filtered.filter(device => device.type === category);
    }
    
    // Apply model filter
    const model = modelFilter.value;
    if (model) {
        filtered = filtered.filter(device => device.model === model);
    }
    
    // Apply status filter
    const status = filterStatus.value;
    if (status) {
        console.log('Filtering by status:', status);
        filtered = filtered.filter(device => {
            console.log('Device status:', device.status, 'Comparing with:', status);
            return device.status === status;
        });
    }
    
    // Apply sorting or use original order
    const sortBy = sortOptions.value;
    if (!sortBy) {
        // If Reset Order is selected, restore original order while keeping filters
        const filteredIds = filtered.map(device => device.id);
        filtered = originalDevices.filter(device => filteredIds.includes(device.id));
    } else {
        // Otherwise apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'model':
                    return a.model.localeCompare(b.model);
                case 'performance':
                    return b.performance - a.performance;
                case 'status':
                    // Reverse the comparison to sort Enabled first, then Disabled
                    return b.status.localeCompare(a.status);
                default:
                    return 0;
            }
        });
    }
    
    return filtered;
}

// Render devices based on current view
function renderDevices(filteredDevices = null) {
    // If no devices provided, use the current filtered list
    const devicesToRender = filteredDevices || getFilteredDevices();
    
    // Clear existing cards
    const deviceCardsContainer = document.getElementById('deviceCards');
    if (!deviceCardsContainer) return;
    deviceCardsContainer.innerHTML = '';
    
    // Get current view mode
    const currentView = document.body.classList.contains('list-view') ? 'list' : 'grid';

    // Show error message if no devices match filters
    if (devicesToRender.length === 0) {
        deviceCardsContainer.innerHTML = `
            <div class="col-12 text-center my-5">
                <i class="bi bi-search" style="font-size: 3rem; color: #ccc;"></i>
                <h3 class="mt-3">No devices match your filters</h3>
                <p class="text-muted">Try adjusting your search or filter criteria</p>
                <button class="btn btn-outline-primary mt-3" onclick="showResetConfirmation()">
                    <i class="bi bi-arrow-counterclockwise"></i> Reset Filters
                </button>
            </div>
        `;
        return;
    }
    
    // Update device count
    updateDeviceCount();
    
    // Render each device card
    devicesToRender.forEach(device => {
        
        const element = currentView === 'grid' ? 
            createDeviceCard(device) : 
            createDeviceListItem(device);
            
        if (typeof element === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = element;
            const card = tempDiv.firstChild;
            card.classList.add('device-card');
            deviceCardsContainer.appendChild(card);
        } else {
            deviceCardsContainer.appendChild(element);
        }
    });

    // Initialize all toggles after rendering
    setTimeout(() => {
        document.querySelectorAll('.device-card').forEach(card => {
            const cardId = card.getAttribute('data-card-id');
            if (cardId) {
                const basicRadio = document.getElementById(`basic-specs-${cardId}`);
                if (basicRadio) {
                    toggleSpecsView(basicRadio, cardId);
                }
            }
        });
        
        // Initialize tooltips after rendering
        initializeTooltips();
        
        // Update compare checkboxes to match the selected state
        updateCompareCheckboxes();
    }, 0);
}

// Update compare checkboxes to match the selected devices
function updateCompareCheckboxes() {
    // Clear all checkbox states first
    document.querySelectorAll('.compare-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Update checkboxes for selected devices
    if (devicesToCompare.size > 0) {
        devicesToCompare.forEach(deviceId => {
            const gridCheckbox = document.getElementById(`compare-${deviceId}`);
            const listCheckbox = document.getElementById(`list-compare-${deviceId}`);
            
            if (gridCheckbox) gridCheckbox.checked = true;
            if (listCheckbox) listCheckbox.checked = true;
        });
    }
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize search input with debounce
function initializeSearch() {
    if (!searchInput) return;
    
    // Add event listener for search input
    searchInput.addEventListener('input', debounce(() => {
        handleFilters();
    }, 300));
    
    // Add clear search button functionality
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            handleFilters();
        });
    }
}

// Initialize filters based on available data
function initializeFilters() {
    // Initialize filter event listeners
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            console.log('Status filter changed to:', filterStatus.value);
            handleFilters();
        });
    }
    
    if (categoryFilter) {
        // Populate category filter with available device types
        categoryFilter.innerHTML = `
            <option value="">All Categories</option>
            <option value="ai_edge">Edge AI Devices</option>
            <option value="server">AI Edge Servers</option>
        `;
        categoryFilter.addEventListener('change', handleFilters);
    }
    
    if (modelFilter) {
        // Populate model filter with unique device names
        const uniqueModels = [...new Set(devices.map(device => device.deviceName))].sort();
        modelFilter.innerHTML = `
            <option value="">All Models</option>
            ${uniqueModels.map(model => {
                // Get the full display name based on device type
                const device = devices.find(d => d.deviceName === model);
                const displayName = device ? device.name : model;
                return `<option value="${model}">${displayName}</option>`;
            }).join('')}
        `;
        modelFilter.addEventListener('change', handleFilters);
    }
    
    // Initialize search with debounce
    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(handleFilters, 300);
        });
    }
    
    // Apply initial filters if any
    handleFilters();
}

// Export functions
function exportToXLSX() {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Get filtered and sorted devices
    const filteredDevices = getFilteredDevices();

    // Create Device Specifications sheet
    const specHeaders = [
        'Device Name', 'Model', 'AI Performance (TOPS)', 'Memory', 'Storage', 
        'SuperMode', 'GPU', 'Operating System', 'Ethernet', 'I/O Ports', 
        'Price', 'Certifications'
    ];

    // Add filter summary at the top if filters are applied
    const filterSummary = getFilterSummary();
    let specData = [];
    
    if (filterSummary) {
        specData.push(['Filter Summary']);
        specData.push([filterSummary]);
        specData.push([]); // Empty row for spacing
    }

    // Add headers
    specData.push(specHeaders);

    // Add device data
    filteredDevices.forEach(device => {
        specData.push([
            device.name || 'Not Available',
            device.model || 'Not Available',
            device.performance ? `${device.performance} TOPS` : 'Not Available',
            device.specs?.memory || 'Not Available',
            device.specs?.storage || 'Not Available',
            (device.formatted_status || formatStatus(device.status)).replace('Super Mode: ', ''),
            device.specs?.gpu || 'Not Available',
            device.specs?.os || 'Not Available',
            device.specs?.ethernet || 'Not Available',
            device.specs?.io || 'Not Available',
            device.price || 'Not Available',
            device.specs?.certifications || 'Not Available'
        ]);
    });

    // Add Device Specifications sheet
    const specSheet = XLSX.utils.aoa_to_sheet(specData);
    XLSX.utils.book_append_sheet(workbook, specSheet, 'Device Specifications');

    // Style the specifications sheet
    const range = XLSX.utils.decode_range(specSheet['!ref']);
    
    // Style headers and filter summary
    for (let C = range.s.c; C <= range.e.c; C++) {
        // Style filter summary if present
        if (filterSummary) {
            const filterSummaryCell = XLSX.utils.encode_cell({ r: 0, c: C });
            if (specSheet[filterSummaryCell]) {
                specSheet[filterSummaryCell].s = {
                    font: { bold: true, color: { rgb: "4285F4" } },
                    alignment: { horizontal: 'left' }
                };
            }
        }
        
        // Style column headers
        const headerRow = filterSummary ? 3 : 0;
        const address = XLSX.utils.encode_cell({ r: headerRow, c: C });
        if (specSheet[address]) {
            specSheet[address].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "E8F0FE" } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                }
            };
        }
    }

    // Add alternating row colors and cell borders
    for (let R = (filterSummary ? 4 : 1); R <= range.e.r; R++) {
        const isEvenRow = R % 2 === 0;
        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!specSheet[address]) continue;
            
            specSheet[address].s = {
                fill: { fgColor: { rgb: isEvenRow ? "F8F9FA" : "FFFFFF" } },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                }
            };
        }
    }

    // Create Device Comparison sheet
    const comparisonHeaders = [
        'Device Name', 'AI Performance (TOPS)', 'Memory', 'GPU', 
        'SuperMode', 'Price'
    ];

    const comparisonData = [comparisonHeaders];
    filteredDevices.forEach(device => {
        comparisonData.push([
            device.name || 'Not Available',
            device.performance ? `${device.performance} TOPS` : 'Not Available',
            device.specs?.memory || 'Not Available',
            device.specs?.gpu || 'Not Available',
            (device.formatted_status || formatStatus(device.status)).replace('Super Mode: ', ''),
            device.price || 'Not Available'
        ]);
    });

    // Add Device Comparison sheet
    const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
    XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Device Comparison');

    // Style the comparison sheet
    const compRange = XLSX.utils.decode_range(comparisonSheet['!ref']);
    
    // Style headers
    for (let C = compRange.s.c; C <= compRange.e.c; C++) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!comparisonSheet[address]) continue;
        comparisonSheet[address].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E8F0FE" } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            }
        };
    }

    // Add alternating row colors and cell borders to comparison sheet
    for (let R = 1; R <= compRange.e.r; R++) {
        const isEvenRow = R % 2 === 0;
        for (let C = compRange.s.c; C <= compRange.e.c; C++) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!comparisonSheet[address]) continue;
            
            comparisonSheet[address].s = {
                fill: { fgColor: { rgb: isEvenRow ? "F8F9FA" : "FFFFFF" } },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                }
            };
        }
    }

    // Set column widths
    const setCols = (sheet) => {
        const cols = [];
        for (let i = 0; i < 12; i++) {
            cols.push({ wch: i === 0 ? 25 : 20 }); // Device Name column wider
        }
        sheet['!cols'] = cols;
    };

    setCols(specSheet);
    setCols(comparisonSheet);

    // Save the workbook
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `edge_devices_report_${dateStr}.xlsx`);
}

function exportToCSV() {
    // Get filtered and sorted devices
    const filteredDevices = getFilteredDevices();

    // Define headers
    const headers = [
        'Device Name', 'Model', 'AI Performance (TOPS)', 'Memory', 'Storage', 
        'SuperMode', 'GPU', 'Operating System', 'Ethernet', 'I/O Ports', 
        'Price', 'Certifications'
    ];

    // Start with filter summary if filters are applied
    let csvContent = '';
    const filterSummary = getFilterSummary();
    
    if (filterSummary) {
        csvContent += `"Filter Summary"\n"${filterSummary}"\n\n`;
    }

    // Add headers
    csvContent += headers.map(header => `"${header}"`).join(',') + '\n';

    // Add device data
    csvContent += filteredDevices.map(device => [
        device.name || 'Not Available',
        device.model || 'Not Available',
        device.performance ? `${device.performance} TOPS` : 'Not Available',
        device.specs?.memory || 'Not Available',
        device.specs?.storage || 'Not Available',
        (device.formatted_status || formatStatus(device.status)).replace('Super Mode: ', ''),
        device.specs?.gpu || 'Not Available',
        device.specs?.os || 'Not Available',
        device.specs?.ethernet || 'Not Available',
        device.specs?.io || 'Not Available',
        device.price || 'Not Available',
        device.specs?.certifications || 'Not Available'
    ].map(value => {
        // Ensure proper CSV escaping for values containing commas or quotes
        const escapedValue = value.toString().replace(/"/g, '""');
        return `"${escapedValue}"`;
    }).join(',')).join('\n');

    // Add a blank line before comparison data
    csvContent += '\n\n"Device Comparison"\n';

    // Add comparison headers
    const comparisonHeaders = [
        'Device Name', 'AI Performance (TOPS)', 'Memory', 'GPU', 
        'SuperMode', 'Price'
    ];
    csvContent += comparisonHeaders.map(header => `"${header}"`).join(',') + '\n';

    // Add comparison data
    csvContent += filteredDevices.map(device => [
        device.name || 'Not Available',
        device.performance ? `${device.performance} TOPS` : 'Not Available',
        device.specs?.memory || 'Not Available',
        device.specs?.gpu || 'Not Available',
        (device.formatted_status || formatStatus(device.status)).replace('Super Mode: ', ''),
        device.price || 'Not Available'
    ].map(value => {
        const escapedValue = value.toString().replace(/"/g, '""');
        return `"${escapedValue}"`;
    }).join(',')).join('\n');

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `edge_devices_report_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper function to get filter summary
function getFilterSummary() {
    const filters = [];
    
    // Get filter values
    const superModeFilter = document.getElementById('pdfSuperModeFilter')?.value;
    const performanceMin = document.getElementById('pdfPerformanceMin')?.value;
    const performanceMax = document.getElementById('pdfPerformanceMax')?.value;
    const memoryFilter = document.getElementById('pdfMemoryFilter')?.value;
    const sortBy = document.getElementById('pdfSortBy')?.value;
    const sortOrder = document.getElementById('pdfSortOrder')?.value;

    // Add SuperMode filter
    if (superModeFilter) {
        filters.push(`SuperMode: ${superModeFilter.charAt(0).toUpperCase() + superModeFilter.slice(1)}`);
    }

    // Add Performance filter
    if (performanceMin || performanceMax) {
        if (performanceMin && performanceMax) {
            filters.push(`Performance: ${performanceMin} to ${performanceMax} TOPS`);
        } else if (performanceMin) {
            filters.push(`Performance: ≥ ${performanceMin} TOPS`);
        } else if (performanceMax) {
            filters.push(`Performance: ≤ ${performanceMax} TOPS`);
        }
    }

    // Add Memory filter
    if (memoryFilter) {
        filters.push(`Memory: ≥ ${memoryFilter}GB`);
    }

    // Add sort information
    if (sortBy) {
        const sortByText = {
            'performance': 'AI Performance (TOPS)',
            'memory': 'Memory',
            'supermode': 'SuperMode'
        }[sortBy] || 'Device Name';
        const sortOrderText = sortOrder === 'asc' ? 'Lowest to Highest' : 'Highest to Lowest';
        filters.push(`Sorted by: ${sortByText} (${sortOrderText})`);
    }

    return filters.length > 0 ? `Devices filtered by: ${filters.join(', ')}` : '';
}

function exportToPDF() {
    const modalHtml = `
        <div class="modal fade" id="pdfExportModal" tabindex="-1" aria-labelledby="pdfExportModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="pdfExportModalLabel">PDF Export Options</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- SuperMode Filter -->
                        <div class="row mb-3">
                            <div class="col-12">
                                <label class="form-label">SuperMode Filter</label>
                                <select class="form-select" id="pdfSuperModeFilter">
                                    <option value="">All</option>
                                    <option value="enabled">Enabled</option>
                                    <option value="disabled">Disabled</option>
                                </select>
                            </div>
                        </div>

                        <!-- Performance Filter -->
                        <div class="row mb-3">
                            <div class="col-12">
                                <label class="form-label">Performance Filter (TOPS)</label>
                                <div class="input-group">
                                    <input type="number" class="form-control" id="pdfPerformanceMin" placeholder="Min">
                                    <span class="input-group-text">to</span>
                                    <input type="number" class="form-control" id="pdfPerformanceMax" placeholder="Max">
                                </div>
                            </div>
                        </div>

                        <!-- Memory Filter -->
                        <div class="row mb-3">
                            <div class="col-12">
                                <label class="form-label">Memory Filter (GB)</label>
                                <select class="form-select" id="pdfMemoryFilter">
                                    <option value="">All</option>
                                    <option value="8">8GB or more</option>
                                    <option value="16">16GB or more</option>
                                    <option value="32">32GB or more</option>
                                </select>
                            </div>
                        </div>

                        <!-- Sort Options -->
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="form-label">Sort By</label>
                                <select class="form-select" id="pdfSortBy">
                                    <option value="performance">AI Performance</option>
                                    <option value="memory">Memory</option>
                                    <option value="supermode">SuperMode</option>
                                    <option value="price">Price</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label">Sort Order</label>
                                <select class="form-select" id="pdfSortOrder">
                                    <option value="desc">Highest to Lowest</option>
                                    <option value="asc">Lowest to Highest</option>
                                </select>
                            </div>
                        </div>

                        <!-- Filter Summary Option -->
                        <div class="row">
                            <div class="col-12">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="pdfIncludeFilterSummary" checked>
                                    <label class="form-check-label" for="pdfIncludeFilterSummary">
                                        Include filter summary in report
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="generatePDF">Generate PDF</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to document if it doesn't exist
    if (!document.getElementById('pdfExportModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('pdfExportModal'));
    modal.show();

    // Handle PDF generation
    document.getElementById('generatePDF').onclick = function() {
        const sortBy = document.getElementById('pdfSortBy').value;
        const sortOrder = document.getElementById('pdfSortOrder').value;
        const superModeFilter = document.getElementById('pdfSuperModeFilter').value;
        const performanceMin = document.getElementById('pdfPerformanceMin').value;
        const performanceMax = document.getElementById('pdfPerformanceMax').value;
        const memoryFilter = document.getElementById('pdfMemoryFilter').value;
        const includeFilterSummary = document.getElementById('pdfIncludeFilterSummary').checked;

        // Filter and sort devices
        let filteredDevices = [...devices];
        let appliedFilters = [];

        // Apply SuperMode filter
        if (superModeFilter) {
            filteredDevices = filteredDevices.filter(device => {
                const status = (device.status || '').toLowerCase();
                // Check if the status matches either 'enabled'/'enable' or 'disabled'/'disable'
                if (superModeFilter === 'enabled') {
                    return status === 'enabled' || status === 'enable';
                } else if (superModeFilter === 'disabled') {
                    return status === 'disabled' || status === 'disable';
                }
                return true;
            });
            appliedFilters.push(`SuperMode: ${superModeFilter.charAt(0).toUpperCase() + superModeFilter.slice(1)}`);
        }

        // Apply Performance filter
        if (performanceMin || performanceMax) {
            filteredDevices = filteredDevices.filter(device => {
                const performance = parseFloat(device.performance) || 0;
                const min = performanceMin ? parseFloat(performanceMin) : -Infinity;
                const max = performanceMax ? parseFloat(performanceMax) : Infinity;
                return performance >= min && performance <= max;
            });
            if (performanceMin && performanceMax) {
                appliedFilters.push(`Performance: ${performanceMin} to ${performanceMax} TOPS`);
            } else if (performanceMin) {
                appliedFilters.push(`Performance: ≥ ${performanceMin} TOPS`);
            } else if (performanceMax) {
                appliedFilters.push(`Performance: ≤ ${performanceMax} TOPS`);
            }
        }

        // Apply Memory filter
        if (memoryFilter) {
            filteredDevices = filteredDevices.filter(device => {
                const memoryStr = device.specs?.memory || '';
                const memoryMatch = memoryStr.match(/(\d+)GB/);
                if (!memoryMatch) return false;
                const memory = parseInt(memoryMatch[1]);
                return memory >= parseInt(memoryFilter);
            });
            appliedFilters.push(`Memory: ≥ ${memoryFilter}GB`);
        }

        // Sort devices
        filteredDevices.sort((a, b) => {
            let valueA, valueB;
            switch(sortBy) {
                case 'performance':
                    valueA = parseFloat(a.performance) || 0;
                    valueB = parseFloat(b.performance) || 0;
                    break;
                case 'memory':
                    const getMemory = (device) => {
                        const memoryStr = device.specs?.memory || '';
                        const memoryMatch = memoryStr.match(/(\d+)GB/);
                        return memoryMatch ? parseInt(memoryMatch[1]) : 0;
                    };
                    valueA = getMemory(a);
                    valueB = getMemory(b);
                    break;
                case 'supermode':
                    valueA = (a.status || '').toLowerCase();
                    valueB = (b.status || '').toLowerCase();
                    // Sort enabled/enable first
                    if ((valueA === 'enabled' || valueA === 'enable') && (valueB !== 'enabled' && valueB !== 'enable')) return -1;
                    if ((valueB === 'enabled' || valueB === 'enable') && (valueA !== 'enabled' && valueA !== 'enable')) return 1;
                    return 0;
                    break;
                default:
                    valueA = a.name || '';
                    valueB = b.name || '';
            }
            return sortOrder === 'asc' ? 
                (valueA > valueB ? 1 : -1) :
                (valueA < valueB ? 1 : -1);
        });

        // Add sort information to filters
        const sortOrderText = sortOrder === 'asc' ? 'Lowest to Highest' : 'Highest to Lowest';
        const sortByText = {
            'performance': 'AI Performance (TOPS)',
            'memory': 'Memory',
            'price': 'Price',
            'supermode': 'SuperMode'
        }[sortBy] || 'Device Name';
        appliedFilters.push(`Sorted by: ${sortByText} (${sortOrderText})`);

        // Generate PDF with filtered and sorted devices
        generatePDF(filteredDevices, appliedFilters, includeFilterSummary);
        modal.hide();
    };
}

function generatePDF(filteredDevices, appliedFilters, includeFilterSummary) {
    const { jsPDF } = window.jspdf;
    
    // Create PDF in landscape mode
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    
    // Add company logo
    try {
        const imgData = '/static/img/inventec_ai_logo_2.png';
        doc.addImage(imgData, 'PNG', 15, 10, 40, 20);
    } catch (error) {
        console.error('Error adding logo:', error);
    }
    
    // Format current date
    const currentDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Generate export reference number
    const exportRef = `REF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Add title
    doc.setFontSize(28);
    doc.setTextColor(66, 139, 202);
    doc.setFont('helvetica', 'bold');
    doc.text('Edge AI Devices Report', doc.internal.pageSize.width / 2, 25, { align: 'center' });
    
    // Add date and export reference
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exported on: ${currentDate}`, doc.internal.pageSize.width - 15, 15, { align: 'right' });
    doc.text(`Export Reference: ${exportRef}`, doc.internal.pageSize.width - 15, 20, { align: 'right' });
    
    // Add filter summary if requested
    let startY = 40;
    if (includeFilterSummary && appliedFilters && appliedFilters.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(66, 139, 202);
        doc.setFont('helvetica', 'bold');
        doc.text('Filter Summary:', 15, startY);
        startY += 7;
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        
        // Format filter summary in a more readable way
        const filterText = `Devices filtered by: ${appliedFilters.join(', ')}`;
        doc.text(filterText, 20, startY);
        
        startY += 10;
    }

    // Check if we have any devices to display
    if (!filteredDevices || filteredDevices.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('No devices match the selected filters.', 15, startY);
        
        // Add watermark
        const watermarkText = getWatermarkText();
        addWatermarkToAllPages(doc, watermarkText);
        
        // Save PDF with formatted filename
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`edge_devices_report_${dateStr}.pdf`);
        return;
    }

    // Function to add section header
    function addSectionHeader(text, y) {
        doc.setFontSize(14);
        doc.setTextColor(66, 139, 202);
        doc.setFont('helvetica', 'bold');
        doc.text(text, 15, y);
        return y + 8;
    }

    // Create individual device tables
    filteredDevices.forEach((device, index) => {
        if (index > 0) {
            doc.addPage();
            startY = 40;
        }

        startY = addSectionHeader(`Device Details: ${device.name || 'Unknown Device'}`, startY);

        // System Info Section
        const systemInfoHeaders = ['Category', 'Specification'];
        const systemInfoData = [
            ['Processor', device.specs?.processor || 'Not Available'],
            ['Memory', device.specs?.memory || 'Not Available'],
            ['Storage', device.specs?.storage || 'Not Available'],
            ['Operating System', device.specs?.os || 'Not Available']
        ];

        doc.autoTable({
            head: [systemInfoHeaders],
            body: systemInfoData,
            startY: startY + 5,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: [255, 255, 255]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 }
            }
        });

        startY = doc.previousAutoTable.finalY + 10;

        // Performance Section
        startY = addSectionHeader('Performance Specifications', startY);
        const perfHeaders = ['Category', 'Specification'];
        const perfData = [
            ['AI Performance', `${device.performance || 'Not Available'} TOPS`],
            ['GPU', device.specs?.gpu || 'Not Available'],
            ['SuperMode', formatStatus(device.status)]
        ];

        doc.autoTable({
            head: [perfHeaders],
            body: perfData,
            startY: startY + 5,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: [255, 255, 255]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 }
            }
        });

        startY = doc.previousAutoTable.finalY + 10;

        // Connectivity Section
        startY = addSectionHeader('Connectivity', startY);
        const connHeaders = ['Category', 'Specification'];
        const connData = [
            ['Ethernet', device.specs?.ethernet || 'Not Available'],
            ['I/O Ports', device.specs?.io || 'Not Available']
        ];

        doc.autoTable({
            head: [connHeaders],
            body: connData,
            startY: startY + 5,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: [255, 255, 255]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 }
            }
        });

        startY = doc.previousAutoTable.finalY + 10;

        // Additional Info Section
        startY = addSectionHeader('Additional Information', startY);
        const addHeaders = ['Category', 'Specification'];
        const addData = [
            ['Price', device.price || 'Not Available'],
            ['Certifications', device.specs?.certifications || 'Not Available']
        ];

        doc.autoTable({
            head: [addHeaders],
            body: addData,
            startY: startY + 5,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: [255, 255, 255]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 }
            }
        });
    });

    // Add comparison table on a new page
    doc.addPage();
    startY = 40;
    startY = addSectionHeader('Device Comparison', startY);

    const comparisonHeaders = ['Device Name', 'AI Performance', 'Memory', 'GPU', 'SuperMode', 'Price'];
    const comparisonData = filteredDevices.map(device => [
        device.name || 'Not Available',
        `${device.performance || 'Not Available'} TOPS`,
        device.specs?.memory || 'Not Available',
        device.specs?.gpu || 'Not Available',
        (device.formatted_status || formatStatus(device.status)).replace('Super Mode: ', ''),
        device.price || 'Not Available'
    ]);

    doc.autoTable({
        head: [comparisonHeaders],
        body: comparisonData,
        startY: startY + 5,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 5
        },
        headStyles: {
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255]
        },
        columnStyles: {
            0: { fontStyle: 'bold' }
        }
    });

    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        // Page numbers on the left
        doc.text(
            `Page ${i} of ${totalPages}`,
            15,
            doc.internal.pageSize.height - 10
        );
        
        // Export reference on the right
        doc.text(
            `Export Reference: ${exportRef}`,
            doc.internal.pageSize.width - 15,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
        );
    }
    
    // Add watermark
    const watermarkText = getWatermarkText();
    addWatermarkToAllPages(doc, watermarkText);
    
    // Save PDF with formatted filename
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`edge_devices_report_${dateStr}.pdf`);
}

// Helper function to get field value from device object
function getFieldValue(device, field) {
    switch(field) {
        case 'Device Name':
            return device.name || 'Not Available';
        case 'Model':
            return device.model || 'Not Available';
        case 'Status':
            return device.formatted_status || formatStatus(device.status).replace('Super Mode: ', '') || 'Not Available';
        case 'Performance':
            return `${device.performance || 'Not Available'} TOPS`;
        case 'Processor':
            return device.specs.processor || 'Not Available';
        case 'Memory':
            return device.specs.memory || 'Not Available';
        case 'Storage':
            return device.specs.storage || 'Not Available';
        case 'I/O':
            return device.specs.io || 'Not Available';
        case 'GPU':
            return device.specs.gpu || 'Not Available';
        case 'Operating Temperature':
            return device.specs.operating_temperature || 'Not Available';
        case 'Certifications':
            return device.specs.certifications || 'Not Available';
        case 'Wireless':
            return device.specs.wireless || 'Not Available';
        case 'WLAN':
            return device.specs.wlan || 'Not Available';
        case 'BT':
            return device.specs.bt || 'Not Available';
        case 'Camera':
            return device.specs.camera || 'Not Available';
        case 'Video CHs':
            return device.specs.video_chs || 'Not Available';
        case 'Expansion':
            return device.specs.expansion || 'Not Available';
        default:
            return 'Not Available';
    }
}

// Toggle dropdowns (specs and applications)
function toggleDropdown(button, type) {
    const dropdown = button.nextElementSibling;
    const allDropdowns = document.querySelectorAll('.specs-dropdown, .applications-dropdown');
    const allButtons = document.querySelectorAll('.specs-button, .applications-button');
    
    // First, close all dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.add('hidden');
        }
    });
    
    // Reset all button chevrons
    allButtons.forEach(b => {
        if (b !== button) {
            const chevron = b.querySelector('.bi-chevron-down');
            if (chevron) {
                chevron.style.transform = 'rotate(0deg)';
            }
        }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('hidden');
    
    // Toggle chevron rotation
    const chevron = button.querySelector('.bi-chevron-down');
    chevron.style.transform = dropdown.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    
    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
            document.removeEventListener('click', closeDropdown);
        }
    };
    
    if (!dropdown.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 0);
    }
}

// Tab switching function with universal toggle logic
function showTab(button, type, cardId) {
    // Get all tabs for this card
    const tabs = document.querySelectorAll(`.tab[data-card-id="${cardId}"]`);
    const tabContents = document.querySelectorAll(`.tab-content[data-card-id="${cardId}"]`);
    
    // Remove active class from all tabs
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    button.classList.add('active');
    
    // Hide all tab contents
    tabContents.forEach(content => {
        content.classList.add('collapsed');
    });
    
    // Show selected tab content
    const selectedContent = document.querySelector(`.tab-content[data-content="${type}"][data-card-id="${cardId}"]`);
    if (selectedContent) {
        selectedContent.classList.remove('collapsed');
        
        // If it's the specs tab, ensure it's properly displayed
        if (type === 'specs') {
            // Force a reflow to ensure the content is properly displayed
            void selectedContent.offsetHeight;
        }
    }
    
    // Add event listener to close tab when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeTabOutside);
    }, 0);
}

// Helper function to animate TOPS counter
function animateTOPS(element, targetValue, duration = 1000) {
    const startValue = 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);
        element.textContent = `${currentValue} TOPS`;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Helper function to get spec icon
function getSpecIcon(specType) {
    const icons = {
        processor: '🔄',
        cpu: '🔄',
        memory: '💾',
        storage: '💿',
        gpu: '🎮',
        os: '💻',
        ethernet: '🌐',
        io: '🔌',
        expansion: '📦',
        buttons: '🔘',
        operating_temperature: '🌡️',
        wireless: '📶',
        wlan: '📡',
        bt: '🔵',
        camera: '🎥',
        video_chs: '📺',
        certifications: '🏅',
        performance: '⚡',
        ai_performance: '⚡'
    };
    return icons[specType.toLowerCase()] || '📌';
}

// Helper function to determine if a field is a basic spec
function isBasicSpec(fieldName) {
    const basicSpecs = ['Processor', 'Memory', 'Storage', 'GPU', 'OS', 'Ethernet'];
    return basicSpecs.includes(fieldName);
}

// Format value for display, handling null/empty/unknown values
function formatValue(value) {
    // Check for null, undefined, empty string, or any case variation of "unknown", "none", "n/a"
    if (value === null || value === undefined || value === '' || 
        (typeof value === 'string' && (
            value.toLowerCase() === 'unknown' || 
            value.toLowerCase() === 'n/a' || 
            value.toLowerCase() === 'none' ||
            value.toLowerCase() === 'not specified'
        ))) {
        return '<span class="spec-value not-available">Not Available</span>';
    }
    return `<span class="spec-value">${value}</span>`;
}

// Check if a group has any basic specs
function hasBasicSpecInGroup(groupData) {
    if (!groupData || !groupData.groupFields) return false;
    return groupData.groupFields.some(field => isBasicSpec(field));
}

// Get all available fields from both specs object and direct device properties
function getAvailableFields(device) {
    // Define the field groups and their fields
    const fieldGroups = {
        'System Info': [
            'Processor', 'Memory', 'Storage', 'GPU', 'OS'
        ],
        'Connectivity': [
            'Ethernet', 'I/O', 'Wireless', 'WLAN', 'BT'
        ],
        'Multimedia': [
            'Camera', 'Video CHs'
        ],
        'Expansion & Certs': [
            'Expansion', 'Certifications'
        ],
        'Mechanical / Physical': [
            'Buttons', 'Operating Temperature'
        ]
    };
    
    const fields = [];
    
    // Process each group and its fields
    Object.entries(fieldGroups).forEach(([groupName, groupFields]) => {
        // Add group header
        fields.push({
            isHeader: true,
            name: groupName,
            groupFields: groupFields // Store the fields for this group
        });
        
        // Add fields for this group
        groupFields.forEach(field => {
            let value;
            
            // Special handling for fields that need exact MongoDB field names
            switch(field) {
                case 'I/O':
                    value = device['I/O'] || device.specs?.io || null;
                    break;
                case 'Expansion':
                    value = device['Expansion'] || device.specs?.expansion || null;
                    break;
                case 'Video CHs':
                    value = device['Video CHs'] || device.specs?.video_chs || null;
                    break;
                case 'BT':
                    value = device['BT'] || device.specs?.bt || null;
                    break;
                case 'WLAN':
                    value = device['WLAN'] || device.specs?.wlan || null;
                    break;
                case 'AI Performance':
                    value = `${device.performance || 0} TOPS`;
                    break;
                default:
                    const key = field.toLowerCase().replace(/\s+/g, '_');
                    value = device.specs?.[key] || device[field] || null;
            }
            
            fields.push({
                name: field,
                value: value,
                isBasic: isBasicSpec(field),
                icon: getSpecIcon(field === 'I/O' ? 'io' : 
                                field === 'Video CHs' ? 'video_chs' : 
                                field === 'AI Performance' ? 'ai_performance' :
                                field.toLowerCase().replace(/\s+/g, '_'))
            });
        });
    });
    
    return fields;
}

// Create device card
function createDeviceCard(device) {
    // Generate a unique ID for the card that matches the device ID
    const cardId = device.id;
    
    console.log('Creating device card for:', device.name);
    console.log('Device status:', device.status);
    console.log('Device formatted_status:', device.formatted_status);
    console.log('Raw Super Mode value:', device['Super Mode']);
    
    // Diagnostic logging for device tag
    console.log("Device:", device.name || device.deviceName);
    console.log("Device ID used:", device._id || device.id);
    console.log("Device Tag:", device.tag);
    
    // Resolve the ID to use for elements (use either _id or id, whichever is available)
    const resolvedId = device._id || device.id;
    
    const card = document.createElement('div');
    card.className = 'col-12 col-md-6 col-lg-4 mb-4';
    card.setAttribute('data-card-id', cardId);

    // Format the performance value and get display properties
    const performanceValue = device.performance || 0;
    const performanceLevel = getPerformanceLevel(performanceValue);
    const performancePercentage = calculateTopsPercentage(performanceValue);
    const tooltipText = getPerformanceTooltip(performanceValue);
    
    console.log(`Device ${device.name} - Performance: ${performanceValue}, Level: ${performanceLevel}, Percentage: ${performancePercentage}%`);

    // Get device image based on device model or type
    const deviceImagePath = getDeviceImagePath(device.model, device.type);
    
    // Determine if tag should be displayed (only if it exists and is not empty)
    // This ensures consistent tag display behavior for all devices:
    // - A tag is displayed ONLY when the device has a non-null, non-empty tag value
    // - If the tag is null, undefined or empty string, no tag will be displayed
    // - This logic applies consistently to all devices including NCOX and NCON
    const hasValidTag = device.tag && typeof device.tag === 'string' && device.tag.trim() !== '';
    // Get tag class based on the tag value
    const tagClass = hasValidTag ? getTagClass(device.tag.toLowerCase()) : '';

    card.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center">
                        <div class="form-check me-2">
                            <input class="form-check-input compare-checkbox" type="checkbox" value="${device.id}" id="compare-${cardId}" 
                                   onchange="toggleCompareDevice('${device.id}')">
                            <label class="form-check-label" for="compare-${cardId}">
                                Compare
                            </label>
                        </div>
                        <h5 class="card-title mb-1">${device.name}</h5>
                    </div>
                    <span class="badge ${device.status === 'enabled' ? 'bg-success' : 'bg-secondary'}"
                          data-bs-toggle="tooltip" 
                          data-bs-html="true"
                          data-bs-placement="top" 
                          title="⚡ Super Mode: Enables high-performance AI acceleration.<br>💤 Disabled: Runs in standard mode for basic tasks.">
                        ${device.formatted_status || formatStatus(device.status)}
                    </span>
                </div>

                <!-- Device Image -->
                <div class="device-image-container mb-3">
                    <div class="image-wrapper">
                        ${hasValidTag ? `<span class="device-tag ${tagClass}" id="tag-${resolvedId}">${device.tag.toLowerCase()}</span>` : ''}
                        <img src="${deviceImagePath}" alt="${device.name}" class="device-image" 
                             style="background-color: transparent !important;"
                             onerror="this.src=getDeviceImagePlaceholder('device'); this.onerror=null;">
                    </div>
                </div>

                <div class="performance-indicator mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="performance-label">AI Performance</span>
                        <span class="performance-value">
                            ${performanceValue} TOPS
                            <i class="bi bi-info-circle info-icon" data-bs-toggle="tooltip" title="Tera Operations Per Second"></i>
                        </span>
                    </div>
                    <div class="ai-performance-bar">
                        <div class="ai-bar-fill" 
                             data-level="${performanceLevel}"
                             style="width: ${performancePercentage}%"
                             role="progressbar" 
                             aria-valuenow="${performanceValue}" 
                             aria-valuemin="0" 
                             aria-valuemax="1000">
                            <div class="performance-level-indicator"></div>
                        </div>
                        <div class="ai-performance-tooltip">
                            ${tooltipText}
                        </div>
                    </div>
                </div>
                
                <!-- Card Content Area for proper alignment of description and tabs -->
                <div class="card-content-area">
                    <!-- Device Description -->
                    <div class="device-description">
                        <p class="card-text" id="device-description-${cardId}">
                            ${getDeviceDescription(device)}
                        </p>
                    </div>

                    <div class="card-tabs" data-tabs-id="${cardId}">
                        <div class="tab-buttons">
                            <button class="tab" 
                                    data-tab="specs" 
                                    data-card-id="${cardId}"
                                    onclick="showTab(this, 'specs', '${cardId}')">
                                <i class="bi bi-clipboard-data"></i>
                                Device Specs
                            </button>
                            <button class="tab" 
                                    data-tab="apps" 
                                    data-card-id="${cardId}"
                                    onclick="showTab(this, 'apps', '${cardId}')">
                                <i class="bi bi-grid"></i>
                                Applications
                            </button>
                        </div>

                        <div class="tab-content specs-tab collapsed" 
                             data-content="specs" 
                             data-card-id="${cardId}">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>

                        <div class="tab-content apps-tab collapsed" 
                             data-content="apps" 
                             data-card-id="${cardId}">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Function to get device image path based on model or type
function getDeviceImagePath(model, type) {
    // Clean up the model string to use as filename
    const cleanModel = (model || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Try to get a specific model image first
    let imagePath = `static/img/devices/${cleanModel}.png`;
    
    // If no specific model image, try to get a generic type image
    if (!cleanModel || cleanModel === 'unknown_model') {
        const deviceType = (type || '').toLowerCase();
        switch (deviceType) {
            case 'camera':
                return getDeviceImagePlaceholder('camera');
            case 'notebook':
            case 'laptop':
                return getDeviceImagePlaceholder('laptop');
            case 'desktop':
            case 'pc':
                return getDeviceImagePlaceholder('desktop');
            case 'server':
                return getDeviceImagePlaceholder('server');
            case 'embedded':
            case 'iot':
                return getDeviceImagePlaceholder('embedded');
            default:
                return getDeviceImagePlaceholder('device');
        }
    }
    
    // Return the path to the specific model image
    return imagePath;
}

// Generate placeholder images for different device types
function getDeviceImagePlaceholder(type) {
    // Base64 placeholders for device types with transparent backgrounds
    const placeholders = {
        'device': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI1MCIgeT0iNTAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBzdHJva2U9IiM2NjY2NjYiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMDAiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2NjY2Ij5EZXZpY2U8L3RleHQ+PC9zdmc+',
        'camera': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI1MCIgeT0iNzAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNjAiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjUiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIxIi8+PHRleHQgeD0iMTAwIiB5PSIxNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NjY2NiI+Q2FtZXJhPC90ZXh0Pjwvc3ZnPg==',
        'laptop': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0MCIgeT0iNjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjMwIiB5PSIxNDAiIHdpZHRoPSIxNDAiIGhlaWdodD0iMTAiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkxhcCBUb3A8L3RleHQ+PC9zdmc+',
        'desktop': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI2MCIgeT0iNTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI3MCIgc3Ryb2tlPSIjMzMzMzMzIiBmaWxsPSJ0cmFuc3BhcmVudCIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iODAiIHk9IjEyMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBzdHJva2U9IiMzMzMzMzMiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMDAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkRlc2t0b3A8L3RleHQ+PC9zdmc+',
        'server': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI2MCIgeT0iNDAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxMjAiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI2MCIgeTE9IjcwIiB4Mj0iMTQwIiB5Mj0iNzAiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjYwIiB5MT0iMTAwIiB4Mj0iMTQwIiB5Mj0iMTAwIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI2MCIgeTE9IjEzMCIgeDI9IjE0MCIgeTI9IjEzMCIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSIxMjAiIGN5PSI1NSIgcj0iNSIgZmlsbD0iIzc3YjM0OSIvPjxjaXJjbGUgY3g9IjEzMCIgY3k9IjU1IiByPSI1IiBmaWxsPSIjZTdjYjRkIi8+PHRleHQgeD0iMTAwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NjY2NiI+U2VydmVyPC90ZXh0Pjwvc3ZnPg==',
        'embedded': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI1MCIgeT0iNTAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBzdHJva2U9IiMzMzMzMzMiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSI3MCIgY3k9IjcwIiByPSI1IiBmaWxsPSIjOTk5OTk5Ii8+PGNpcmNsZSBjeD0iMTMwIiBjeT0iNzAiIHI9IjUiIGZpbGw9IiM5OTk5OTkiLz48Y2lyY2xlIGN4PSI3MCIgY3k9IjEzMCIgcj0iNSIgZmlsbD0iIzk5OTk5OSIvPjxjaXJjbGUgY3g9IjEzMCIgY3k9IjEzMCIgcj0iNSIgZmlsbD0iIzk5OTk5OSIvPjxyZWN0IHg9IjcwIiB5PSI4MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBzdHJva2U9IiMzMzMzMzMiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2Utd2lkdGg9IjEiLz48dGV4dCB4PSIxMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2NjY2Ij5FbWJlZGRlZDwvdGV4dD48L3N2Zz4=',
        'video_chs': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI1MCIgeT0iNzAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNjAiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjUiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAiIHN0cm9rZT0iIzMzMzMzMyIgZmlsbD0idHJhbnNwYXJlbnQiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTU1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkNhbWVyYTwvdGV4dD48L3N2Zz4='
    };
    
    return placeholders[type] || placeholders['device'];
}

// Function to show the export modal
function showExportModal(cardId) {
    const modalElement = document.getElementById(`exportModal-${cardId}`);
    if (!modalElement) {
        console.error('Modal element not found:', cardId);
        return;
    }
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Function to export device specifications
function exportDeviceSpecs(cardId, deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
        console.error('Device not found:', deviceId);
        return;
    }

    const modalElement = document.getElementById(`exportModal-${cardId}`);
    const format = modalElement.querySelector(`input[name="exportFormat-${cardId}"]:checked`).value;
    const specsLevel = modalElement.querySelector(`input[name="specsLevel-${cardId}"]:checked`).value;

    // Close the modal
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }

    // Export based on selected format
    if (format === 'pdf') {
        exportSingleDevicePDF(device, specsLevel);
    } else {
        exportSingleDeviceExcel(device, specsLevel);
    }
}

// Function to export single device to PDF
function exportSingleDevicePDF(device, specsLevel) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add Inventec logo
    try {
        const imgData = '/static/img/inventec_ai_logo_2.png';
        doc.addImage(imgData, 'PNG', 15, 10, 40, 20);
    } catch (error) {
        console.error('Error adding logo:', error);
    }
    
    // Add title with specification level
    doc.setFontSize(16);
    doc.setTextColor(66, 139, 202);
    doc.text(`Edge AI Device Specifications - ${specsLevel === 'basic' ? 'Basic' : 'Full'} Report`, 20, 40);
    
    // Add device name and date
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Device: ${device.name || 'Unknown Device'}`, 20, 50);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, 60);
    
    // Get specifications based on level
    const specs = getDeviceSpecs(device, specsLevel);
    
    let startY = 70;
    const margin = 20;
    
    // Define specification groups
    const specGroups = {
        'Connectivity & Networking': [
            'Ethernet', 'WLAN', 'BT', 'Wireless', 'I/O Ports'
        ],
        'Performance & Processing': [
            'Processor', 'GPU', 'AI Performance', 'SuperMode', 'Memory', 'Storage', 'Operating System', 'Video CHs'
        ],
        'Physical Environment': [
            'Operating Temperature', 'Weight', 'Expansion', 'Certifications', 'Camera'
        ]
    };
    
    // Add basic device info first
    const basicInfo = {
        'Device Name': specs['Device Name'],
        'Model': specs['Model']
    };
    
    // Add basic device info table
    doc.autoTable({
        startY: startY,
        head: [['Basic Information', 'Value']],
        body: Object.entries(basicInfo).map(([key, value]) => [key, value || 'Not Available']),
        styles: {
            fontSize: 10,
            cellPadding: 5
        },
        headStyles: {
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { left: margin, right: margin }
    });
    
    startY = doc.lastAutoTable.finalY + 15;
    
    // For each group, create a separate table
    Object.entries(specGroups).forEach(([groupName, fields]) => {
        // Check if we need to add a new page
        if (startY > 250) {
            doc.addPage();
            startY = 30;
        }
        
        // Create filtered table data for this group
        const tableData = fields
            .filter(field => specs[field] !== undefined)
            .map(field => [field, specs[field] || 'Not Available']);
        
        // Only add the table if it has data
        if (tableData.length > 0) {
            // Add group header
            doc.setFontSize(14);
            doc.setTextColor(66, 139, 202);
            doc.text(groupName, margin, startY);
            
            // Add specification table for this group
            doc.autoTable({
                startY: startY + 5,
                head: [['Specification', 'Value']],
                body: tableData,
                styles: {
                    fontSize: 10,
                    cellPadding: 5
                },
                headStyles: {
                    fillColor: [66, 139, 202],
                    textColor: [255, 255, 255]
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { left: margin, right: margin }
            });
            
            startY = doc.lastAutoTable.finalY + 15;
        }
    });
    
    // Add any remaining specs that weren't categorized
    const categorizedFields = Object.values(specGroups).flat();
    const remainingFields = Object.keys(specs).filter(
        key => !['Device Name', 'Model'].includes(key) && !categorizedFields.includes(key)
    );
    
    if (remainingFields.length > 0) {
        // Check if we need to add a new page
        if (startY > 250) {
            doc.addPage();
            startY = 30;
        }
        
        // Add other specifications header
        doc.setFontSize(14);
        doc.setTextColor(66, 139, 202);
        doc.text('Other Specifications', margin, startY);
        
        // Create remaining specs table data
        const remainingData = remainingFields.map(field => [field, specs[field] || 'Not Available']);
        
        // Add specification table for remaining fields
        doc.autoTable({
            startY: startY + 5,
            head: [['Specification', 'Value']],
            body: remainingData,
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: [255, 255, 255]
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: margin, right: margin }
        });
    }
    
    // Add watermark
    const watermarkText = getWatermarkText();
    addWatermarkToAllPages(doc, watermarkText);
    
    // Save the PDF
    const dateStr = new Date().toISOString().split('T')[0];
    const specType = specsLevel === 'basic' ? 'basic' : 'full';
    doc.save(`${device.name || 'device'}_${specType}_specs_${dateStr}.pdf`);
}

// Function to export single device to Excel
function exportSingleDeviceExcel(device, specsLevel) {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Get specifications based on level
    const specs = getDeviceSpecs(device, specsLevel);
    
    // Add report type and date as header rows
    const data = [
        [`Edge AI Device Specifications - ${specsLevel === 'basic' ? 'Basic' : 'Full'} Report`],
        [`Export Date: ${new Date().toLocaleDateString()}`],
        [], // Empty row for spacing
        ['Specification', 'Value'],
        ...Object.entries(specs).map(([key, value]) => [
            key,
            value || 'Not Available'
        ])
    ];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Style the worksheet
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Style report type header
    const reportHeaderAddress = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[reportHeaderAddress]) {
        ws[reportHeaderAddress].s = {
            font: { bold: true, color: { rgb: "4285F4" }, sz: 14 },
            alignment: { horizontal: 'left' }
        };
    }
    
    // Style export date
    const dateHeaderAddress = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[dateHeaderAddress]) {
        ws[dateHeaderAddress].s = {
            font: { italic: true, color: { rgb: "666666" } },
            alignment: { horizontal: 'left' }
        };
    }
    
    // Style column headers (row 4 due to added header rows)
    for (let C = range.s.c; C <= range.e.c; C++) {
        const headerAddress = XLSX.utils.encode_cell({ r: 3, c: C });
        if (ws[headerAddress]) {
            ws[headerAddress].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4285F4" } },
                alignment: { horizontal: 'center' }
            };
        }
    }
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Device Specifications');
    
    // Save the file
    const dateStr = new Date().toISOString().split('T')[0];
    const specType = specsLevel === 'basic' ? 'basic' : 'full';
    XLSX.writeFile(wb, `${device.name || 'device'}_${specType}_specs_${dateStr}.xlsx`);
}

// Helper function to get device specifications based on level
function getDeviceSpecs(device, level) {
    const basicSpecs = {
        'Device Name': device.name,
        'Model': device.model,
        'AI Performance': device.performance ? `${device.performance} TOPS` : null,
        'SuperMode': device.formatted_status || formatStatus(device.status),
        'Memory': device.specs?.memory,
        'Storage': device.specs?.storage,
        'GPU': device.specs?.gpu,
        'Operating System': device.specs?.os
    };

    if (level === 'basic') {
        return basicSpecs;
    }

    return {
        ...basicSpecs,
        'Processor': device.specs?.processor,
        'Ethernet': device.specs?.ethernet,
        'I/O Ports': device.specs?.io,
        'Operating Temperature': device.specs?.operating_temperature,
        'Certifications': device.specs?.certifications,
        'Wireless': device.specs?.wireless,
        'WLAN': device.specs?.wlan,
        'BT': device.specs?.bt,
        'Camera': device.specs?.camera,
        'Video CHs': device.specs?.video_chs,
        'Expansion': device.specs?.expansion
    };
}

// Function to export full specification directly
function exportFullSpecification(deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
        console.error('Device not found:', deviceId);
        return;
    }
    
    // Use the exportSingleDevicePDF function with 'full' specification level
    exportSingleDevicePDF(device, 'full');
}

// Add event listener for spec toggles after rendering
function addSpecToggleListeners() {
    document.querySelectorAll('.applications-button').forEach(button => {
        button.addEventListener('click', function() {
            const isCollapsed = this.getAttribute('aria-expanded') === 'false';
            const chevron = this.querySelector('.chevron-icon');
            
            if (isCollapsed) {
                chevron.classList.remove('bi-chevron-down');
                chevron.classList.add('bi-chevron-up');
            } else {
                chevron.classList.remove('bi-chevron-up');
                chevron.classList.add('bi-chevron-down');
            }
        });
    });
}

// Device action functions
function viewDeviceDetails(deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    // Show device details in modal
    const modal = new bootstrap.Modal(document.getElementById('deviceModal'));
    document.querySelector('#deviceModal .modal-title').textContent = device.name;
    document.querySelector('#deviceModal .modal-body').innerHTML = `
        <div class="specs-list">
            <div class="row mb-3">
                <div class="col-4 text-muted">Model</div>
                <div class="col-8">${device.model}</div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-muted">Type</div>
                <div class="col-8">${device.type === 'ai_edge' ? 'Edge AI Device' : 'AI Server'}</div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-muted">Status</div>
                <div class="col-8">
                    <span class="badge ${device.status === 'enabled' ? 'bg-success' : 'bg-secondary'}">
                        ${device.formatted_status || formatStatus(device.status)}
                    </span>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-muted">Performance</div>
                <div class="col-8">${device.performance} TOPS</div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-muted">Processor</div>
                <div class="col-8">${device.specs.processor}</div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-muted">Memory</div>
                <div class="col-8">${device.specs.memory}</div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-muted">Storage</div>
                <div class="col-8">${device.specs.storage}</div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-muted">Last Seen</div>
                <div class="col-8">${new Date(device.lastSeen).toLocaleString()}</div>
            </div>
        </div>
    `;
    modal.show();
}

function restartDevice(deviceId) {
    // Implement restart functionality
    console.log('Restarting device:', deviceId);
    // Add actual restart implementation here
}

function configureDevice(deviceId) {
    // Implement configure functionality
    console.log('Configuring device:', deviceId);
    // Add actual configure implementation here
}

// Create a device list item for list view
function createDeviceListItem(device) {
    const statusClass = device.status === 'enabled' ? 'bg-success' : 'bg-secondary';
    const performancePercentage = Math.min(Math.round((device.performance / 300) * 100), 100);
    const performanceSubtext = getPerformanceSubtext(device.performance, {
        model: device.model, 
        name: device.name,
        deviceName: device.deviceName
    });
    
    // Resolve the ID to use for elements (use either _id or id, whichever is available)
    const resolvedId = device._id || device.id;
    const deviceId = device.id || resolvedId;
    
    // Determine if tag should be displayed (only if it exists and is not empty)
    // This ensures consistent tag display behavior for all devices:
    // - A tag is displayed ONLY when the device has a non-null, non-empty tag value
    // - If the tag is null, undefined or empty string, no tag will be displayed
    // - This logic applies consistently to all devices including NCOX and NCON
    const hasValidTag = device.tag && typeof device.tag === 'string' && device.tag.trim() !== '';
    // Get tag class based on the tag value
    const tagClass = hasValidTag ? getTagClass(device.tag.toLowerCase()) : '';
    
    const listItem = document.createElement('div');
    listItem.className = 'col-12 mb-3';
    listItem.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <div class="d-flex align-items-center">
                                <div class="form-check me-2">
                                    <input class="form-check-input compare-checkbox" type="checkbox" value="${deviceId}" id="list-compare-${deviceId}" 
                                           onchange="toggleCompareDevice('${deviceId}')">
                                    <label class="form-check-label" for="list-compare-${deviceId}">
                                        Compare
                                    </label>
                                </div>
                                <div class="position-relative">
                                    ${hasValidTag ? `<span class="device-tag ${tagClass}" id="list-tag-${resolvedId}">${device.tag.toLowerCase()}</span>` : ''}
                                    <h5 class="mb-1">${device.name || 'Unnamed Device'}</h5>
                                    <p class="text-muted mb-0">
                                        <small>
                                            <i class="bi bi-cpu me-1"></i>
                                            ${device.type === 'ai_edge' ? 'Edge AI Device' : 'AI Server'}
                                        </small>
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Device Description in List View -->
                        <div class="col-md-4">
                            <p class="card-text" id="list-device-description-${deviceId}">
                                ${getDeviceDescription(device)}
                            </p>
                        </div>
                        
                        <div class="col-md-2">
                            <div class="specs-section">
                                <small class="text-muted d-block">
                                <i class="bi bi-memory me-1"></i>${device.specs?.memory || 'N/A'}
                                </small>
                                <small class="text-muted d-block">
                                <i class="bi bi-device-ssd me-1"></i>${device.specs?.storage || 'N/A'}
                                </small>
                            </div>
                        </div>
                        
                        <div class="col-md-2">
                            <div class="performance-section">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="text-muted">Performance</span>
                                    <span class="fw-bold">${device.performance || 0} TOPS</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-primary" 
                                         role="progressbar" 
                                         style="width: ${performancePercentage}%" 
                                         aria-valuenow="${device.performance || 0}" 
                                         aria-valuemin="0" 
                                         aria-valuemax="300">
                                    </div>
                                </div>
                                <small class="text-muted d-block mt-1">${performanceSubtext}</small>
                            </div>
                        </div>
                        
                        <div class="col-md-1 text-md-end">
                            <span class="badge ${statusClass} mb-2 d-inline-block">
                                ${device.formatted_status || formatStatus(device.status)}
                            </span>
                            <small class="text-muted d-block">
                                <i class="bi bi-clock me-1"></i>
                            ${formatDate(device.last_updated)}
                            </small>
                    </div>
                </div>
            </div>
        </div>
    `;
    return listItem;
}

// Toggle applications dropdown
function toggleApplications(button) {
    const dropdown = button.nextElementSibling;
    const allDropdowns = document.querySelectorAll('.applications-dropdown');
    
    // First, close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.add('hidden');
            // Reset all other buttons' chevron rotation
            const otherButton = d.previousElementSibling;
            if (otherButton) {
                otherButton.querySelector('.bi-chevron-down').style.transform = 'rotate(0deg)';
            }
        }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('hidden');
    
    // Toggle chevron rotation
    const chevron = button.querySelector('.bi-chevron-down');
    chevron.style.transform = dropdown.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    
    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
            document.removeEventListener('click', closeDropdown);
        }
    };
    
    if (!dropdown.classList.contains('hidden')) {
        // Small delay to prevent immediate closure
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 0);
    }
}

// Toggle specs dropdown
function toggleSpecs(button) {
    const dropdown = button.nextElementSibling;
    const allDropdowns = document.querySelectorAll('.specs-dropdown, .applications-dropdown');
    
    // First, close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.add('hidden');
        }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('hidden');
    
    // Update button content
    const isOpen = !dropdown.classList.contains('hidden');
    const icon = '<i class="bi bi-clipboard-data"></i>';
    const chevron = isOpen ? '▴' : '▾';
    button.innerHTML = `${icon} Device Specs ${chevron}`;
    
    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            button.innerHTML = `${icon} Device Specs ▾`;
            document.removeEventListener('click', closeDropdown);
        }
    };
    
    if (!dropdown.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 0);
    }
}

// Helper function to get status class
function getStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'online':
        case 'enabled':
        case 'enable':
            return 'enabled';
        case 'inactive':
        case 'offline':
        case 'disabled':
        case 'disable':
            return 'disabled';
        case 'error':
        case 'warning':
            return 'error';
        default:
            return 'disabled';
    }
}

// Helper function to get status icon
function getStatusIcon(status) {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'online':
        case 'enabled':
        case 'enable':
            return 'bi-check-circle-fill';
        case 'inactive':
        case 'offline':
        case 'disabled':
        case 'disable':
            return 'bi-dash-circle-fill';
        case 'error':
        case 'warning':
            return 'bi-exclamation-circle-fill';
        default:
            return 'bi-dash-circle-fill';
    }
}

// Helper function to format status text
function formatStatus(status) {
    console.log('formatStatus input:', status);
    
    if (!status || status === null) {
        console.log('Status is null or empty, returning Disabled');
        return 'Super Mode: Disabled';
    }
    
    const statusText = status.toLowerCase()
        .replace(/enable(d)?/, 'Enabled')
        .replace(/disable(d)?/, 'Disabled')
        .replace(/(^|\s)\S/g, l => l.toUpperCase());
    
    console.log('Formatted status:', `Super Mode: ${statusText}`);
    return `Super Mode: ${statusText}`;
}

// Function to determine performance level based on TOPS value
function getPerformanceLevel(tops) {
    if (tops <= 100) return 'low';
    if (tops <= 500) return 'medium';
    return 'high';
}

// Function to get performance tooltip text
function getPerformanceTooltip(tops) {
    const level = getPerformanceLevel(tops);
    const levelText = {
        low: 'Basic AI Processing',
        medium: 'Moderate AI Processing',
        high: 'Advanced AI Processing'
    }[level];
    
    // Format the TOPS value with a more prominent display and add descriptive text
    return `<strong>${tops} TOPS</strong><span>${levelText}</span>`;
}

// Function to calculate TOPS percentage for bar width
function calculateTopsPercentage(tops) {
    const maxTOPS = 1000; // Maximum TOPS value for scaling
    return Math.min((tops / maxTOPS) * 100, 100);
}

// Function to get performance subtext (v3)
function getPerformanceSubtext(tops, deviceInfo) {
    console.log("Getting performance subtext for device:", deviceInfo);
    
    // Handle both string and object parameters
    if (typeof deviceInfo === 'string') {
        // If deviceInfo is just a string (old format), check if it contains NCOX
        if (deviceInfo.toUpperCase().includes('NCOX')) {
            return "Edge AI NCOX Fanless, high-performance AI edge platform built for tough industrial conditions — excels in edge inference with support for up to 100 TOPS.";
        }
        // Check if it contains TOP1
        if (deviceInfo.toUpperCase().includes('TOP1')) {
            return "Edge AI TOP1 High-performance edge AI system designed for AGVs, AMRs, and medical robotics — rugged, compact, and packed with connectivity for demanding environments.";
        }
        // Check if it contains PSOX
        if (deviceInfo.toUpperCase().includes('PSOX')) {
            return "Edge AI PSOX Advanced edge AI solution powered by NVIDIA Orin NX — ideal for high-throughput, low-power applications in industrial and embedded environments.";
        }
        // Check if it contains PSON
        if (deviceInfo.toUpperCase().includes('PSON')) {
            return "Edge AI PSON Efficient edge computing device built on NVIDIA Orin Nano — perfect for smart vision, robotics, and automation in constrained spaces.";
        }
        // Check if it contains NCON
        if (deviceInfo.toUpperCase().includes('NCON')) {
            return "Edge AI NCON Compact and power-efficient edge AI platform — tailored for lightweight inference tasks in industrial, retail, or IoT environments.";
        }
        // Check if it contains UCON
        if (deviceInfo.toUpperCase().includes('UCON')) {
            return "Edge AI UCON Versatile Orin Nano-based system for deploying real-time AI at the edge — balances power, performance, and flexibility in a fanless form.";
        }
        // Check if it contains AIOOX
        if (deviceInfo.toUpperCase().includes('AIOOX')) {
            return "AI Edge AIOOX Ultra-efficient edge AI system with rugged, fanless design — ideal for real-time processing in space-limited industrial environments.";
        }
        // Check if it contains Nexxis
        if (deviceInfo.toUpperCase().includes('NEXXIS')) {
            return "Edge AI Nexxis enables remote patient monitoring, assists in diagnostics, and improves operational efficiency.";
        }
        // Check if it contains TT-310
        if (deviceInfo.toUpperCase().includes('TT-310')) {
            return "Edge AI TT-310 Rugged AI system with up to 275 TOPS, real-time video processing, and IP67 protection. Optimize predictive maintenance, enhance passenger safety, and improve operational efficiency.";
        }
    } else if (deviceInfo) {
        // Check various properties for NCOX in case it's an object
        const model = deviceInfo.model || '';
        const name = deviceInfo.name || '';
        const deviceName = deviceInfo.deviceName || '';
        
        if (model.toUpperCase().includes('NCOX') || 
            name.toUpperCase().includes('NCOX') || 
            deviceName.toUpperCase().includes('NCOX') ||
            name === 'Edge AI NCOX' ||
            (deviceInfo.id && deviceInfo.id.includes('NCOX'))) {
            return "Edge AI NCOX Fanless, high-performance AI edge platform built for tough industrial conditions — excels in edge inference with support for up to 100 TOPS.";
        }
        
        // Check for TOP1
        if (model.toUpperCase().includes('TOP1') || 
            name.toUpperCase().includes('TOP1') || 
            deviceName.toUpperCase().includes('TOP1') ||
            name === 'Edge AI TOP1' ||
            (deviceInfo.id && deviceInfo.id.includes('TOP1'))) {
            return "Edge AI TOP1 High-performance edge AI system designed for AGVs, AMRs, and medical robotics — rugged, compact, and packed with connectivity for demanding environments.";
        }
        
        // Check for PSOX
        if (model.toUpperCase().includes('PSOX') || 
            name.toUpperCase().includes('PSOX') || 
            deviceName.toUpperCase().includes('PSOX') ||
            name === 'Edge AI PSOX' ||
            (deviceInfo.id && deviceInfo.id.includes('PSOX'))) {
            return "Edge AI PSOX Advanced edge AI solution powered by NVIDIA Orin NX — ideal for high-throughput, low-power applications in industrial and embedded environments.";
        }
        
        // Check for PSON
        if (model.toUpperCase().includes('PSON') || 
            name.toUpperCase().includes('PSON') || 
            deviceName.toUpperCase().includes('PSON') ||
            name === 'Edge AI PSON' ||
            (deviceInfo.id && deviceInfo.id.includes('PSON'))) {
            return "Edge AI PSON Efficient edge computing device built on NVIDIA Orin Nano — perfect for smart vision, robotics, and automation in constrained spaces.";
        }
        
        // Check for NCON
        if (model.toUpperCase().includes('NCON') || 
            name.toUpperCase().includes('NCON') || 
            deviceName.toUpperCase().includes('NCON') ||
            name === 'Edge AI NCON' ||
            (deviceInfo.id && deviceInfo.id.includes('NCON'))) {
            return "Edge AI NCON Compact and power-efficient edge AI platform — tailored for lightweight inference tasks in industrial, retail, or IoT environments.";
        }
        
        // Check for UCON
        if (model.toUpperCase().includes('UCON') || 
            name.toUpperCase().includes('UCON') || 
            deviceName.toUpperCase().includes('UCON') ||
            name === 'Edge AI UCON' ||
            (deviceInfo.id && deviceInfo.id.includes('UCON'))) {
            return "Edge AI UCON Versatile Orin Nano-based system for deploying real-time AI at the edge — balances power, performance, and flexibility in a fanless form.";
        }
        
        // Check for AIOOX
        if (model.toUpperCase().includes('AIOOX') || 
            name.toUpperCase().includes('AIOOX') || 
            deviceName.toUpperCase().includes('AIOOX') ||
            name === 'AI Edge AIOOX' ||
            (deviceInfo.id && deviceInfo.id.includes('AIOOX'))) {
            return "AI Edge AIOOX Ultra-efficient edge AI system with rugged, fanless design — ideal for real-time processing in space-limited industrial environments.";
        }
        
        // Check for Nexxis
        if (model.toUpperCase().includes('NEXXIS') || 
            name.toUpperCase().includes('NEXXIS') || 
            deviceName.toUpperCase().includes('NEXXIS') ||
            name === 'Edge AI Nexxis' ||
            (deviceInfo.id && deviceInfo.id.includes('NEXXIS'))) {
            return "Edge AI Nexxis enables remote patient monitoring, assists in diagnostics, and improves operational efficiency.";
        }
        
        // Check for TT-310
        if (model.toUpperCase().includes('TT-310') || 
            name.toUpperCase().includes('TT-310') || 
            deviceName.toUpperCase().includes('TT-310') ||
            name === 'Edge AI TT-310' ||
            (deviceInfo.id && deviceInfo.id.includes('TT-310'))) {
            return "Edge AI TT-310 Rugged AI system with up to 275 TOPS, real-time video processing, and IP67 protection. Optimize predictive maintenance, enhance passenger safety, and improve operational efficiency.";
        }
    }
    
    // Standard logic for other devices
    const level = getPerformanceLevel(tops);
    const subtexts = {
        low: 'Suitable for basic AI tasks',
        medium: 'Good for most AI applications',
        high: 'Excellent for complex AI workloads'
    };
    return subtexts[level] || 'AI processing capability';
}

// Function to format performance value for display
function formatPerformance(performance) {
    // Convert performance to number and handle invalid values
    const value = parseFloat(performance);
    console.log(`Formatting performance value: ${performance} (parsed: ${value})`);
    
    if (isNaN(value) || value <= 0) {
        return 'N/A';
    }
    return `${value} TOPS`;
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

// Filter dropdown toggle function
function toggleFilterGroup(button) {
    if (!button) return;
    
    const filterGroup = button.closest('.filter-group');
    if (!filterGroup) return;
    
    // Close all other filter groups
    document.querySelectorAll('.filter-group').forEach(group => {
        if (group !== filterGroup && group.classList.contains('expanded')) {
            group.classList.remove('expanded');
            const header = group.querySelector('.filter-group-header');
            if (header) {
                header.setAttribute('aria-expanded', 'false');
            }
            const content = group.querySelector('.filter-content');
            if (content) {
                content.setAttribute('aria-hidden', 'true');
            }
        }
    });
    
    // Toggle current filter group
    const isExpanded = filterGroup.classList.contains('expanded');
    filterGroup.classList.toggle('expanded');
    
    // Update ARIA attributes
    button.setAttribute('aria-expanded', (!isExpanded).toString());
    const content = filterGroup.querySelector('.filter-content');
    if (content) {
        content.setAttribute('aria-hidden', isExpanded.toString());
    }
}

// Initialize filter dropdowns
function initializeFilterDropdowns() {
    const filterGroups = document.querySelectorAll('.filter-group');
    
    filterGroups.forEach(group => {
        const header = group.querySelector('.filter-group-header');
        const content = group.querySelector('.filter-content');
        
        if (header && content) {
            // Set initial state
            content.style.maxHeight = '0px';
            header.setAttribute('aria-expanded', 'false');
            content.setAttribute('aria-hidden', 'true');
            
            // Add click handler
            header.addEventListener('click', () => {
                const isExpanded = group.classList.contains('expanded');
                
                // Close all other dropdowns
                filterGroups.forEach(otherGroup => {
                    if (otherGroup !== group && otherGroup.classList.contains('expanded')) {
                        otherGroup.classList.remove('expanded');
                        const otherContent = otherGroup.querySelector('.filter-content');
                        const otherHeader = otherGroup.querySelector('.filter-group-header');
                        if (otherContent && otherHeader) {
                            otherContent.style.maxHeight = '0px';
                            otherHeader.setAttribute('aria-expanded', 'false');
                            otherContent.setAttribute('aria-hidden', 'true');
                        }
                    }
                });
                
                // Toggle current dropdown
                group.classList.toggle('expanded');
                content.style.maxHeight = isExpanded ? '0px' : `${content.scrollHeight}px`;
                header.setAttribute('aria-expanded', (!isExpanded).toString());
                content.setAttribute('aria-hidden', isExpanded.toString());
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.filter-group')) {
            filterGroups.forEach(group => {
                group.classList.remove('expanded');
                const content = group.querySelector('.filter-content');
                const header = group.querySelector('.filter-group-header');
                if (content && header) {
                    content.style.maxHeight = '0px';
                    header.setAttribute('aria-expanded', 'false');
                    content.setAttribute('aria-hidden', 'true');
                }
            });
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Update filter summary
function updateFilterSummary() {
    const summaryContent = document.getElementById('filterSummaryContent');
    const activeFilters = [];
    
    // Check category filter
    const categoryValue = categoryFilter.value;
    if (categoryValue) {
        activeFilters.push(`Category: ${categoryValue}`);
    }
    
    // Check model filter
    const modelValue = modelFilter.value;
    if (modelValue) {
        activeFilters.push(`Model: ${modelValue}`);
    }
    
    // Check super mode filter
    const statusValue = statusFilter.value;
    if (statusValue) {
        activeFilters.push(`Super Mode: ${statusValue === 'enable' ? 'Enabled' : 'Disabled'}`);
    }
    
    // Update summary content
    if (activeFilters.length > 0) {
        summaryContent.innerHTML = activeFilters.map(filter => `<div>${filter}</div>`).join('');
    } else {
        summaryContent.textContent = 'No active filters';
    }
}

// Initialize tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Update active filters display
function updateActiveFilters() {
    const activeFiltersContent = document.getElementById('activeFiltersContent');
    const activeFilters = [];
    
    // Get current filter values
    const categoryValue = categoryFilter.value;
    const modelValue = modelFilter.value;
    const statusValue = statusFilter.value;
    const sortValue = sortOptions.value;
    
    // Add active filters
    if (categoryValue) {
        activeFilters.push({
            type: 'Category',
            value: categoryValue === 'ai_edge' ? 'Edge AI' : 'AI Server'
        });
    }
    
    if (modelValue) {
        activeFilters.push({
            type: 'Model',
            value: modelValue
        });
    }
    
    if (statusValue) {
        activeFilters.push({
            type: 'Super Mode',
            value: statusValue === 'enable' ? 'Enabled' : 'Disabled'
        });
    }

    if (sortValue) {
        const sortLabels = {
            'name': 'Name (A-Z)',
            'model': 'Model (A-Z)',
            'performance': 'Performance (High-Low)',
            'status': 'Super Mode (Enabled-Disabled)'
        };
        activeFilters.push({
            type: 'Sorted by',
            value: sortLabels[sortValue] || sortValue
        });
    }
    
    // Update the display
    if (activeFilters.length > 0) {
        const filterHtml = activeFilters.map(filter => `
            <div class="active-filter-item">
                <i class="bi bi-tag-fill"></i>
                <span>${filter.type}: ${filter.value}</span>
            </div>
        `).join('');
        activeFiltersContent.innerHTML = filterHtml;
    } else {
        activeFiltersContent.innerHTML = '<span class="no-filters">No active filters</span>';
    }
}

// Filter and sort devices
function filterAndSortDevices() {
    console.log('Filtering and sorting devices...');
    
    // Ensure devices is initialized
    if (!Array.isArray(devices)) {
        console.error('Devices is not an array:', devices);
        devices = [];
    }
    
    const searchTerm = searchInput.value.toLowerCase();
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;
    const modelValue = modelFilter.value;
    const sortValue = sortOptions.value;

    // Save preferences
    const preferences = {
        searchTerm: searchInput.value,
        categoryValue: categoryFilter.value,
        statusValue: statusFilter.value,
        modelValue: modelFilter.value,
        sortValue: sortOptions.value,
        viewMode: viewMode // Use viewMode consistently
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

    // Filter devices
    const filteredDevices = devices.filter(device => {
        // Search filter
        const matchesSearch = device.name.toLowerCase().includes(searchTerm) ||
                            (device.id && device.id.toLowerCase().includes(searchTerm));
        
        // Category filter
        const matchesCategory = !categoryValue || device.type === categoryValue;
        
        // Super Mode status filter
        const deviceStatus = (device.status || '').toLowerCase();
        const matchesStatus = !statusValue || 
            (statusValue === 'enable' && (deviceStatus === 'enable' || deviceStatus === 'enabled')) ||
            (statusValue === 'disable' && (deviceStatus === 'disable' || deviceStatus === 'disabled'));
        
        // Model filter
        const matchesModel = !modelValue || device.model === modelValue;
        
        return matchesSearch && matchesCategory && matchesStatus && matchesModel;
    });

    // Sort devices if sort option is selected
    if (sortValue) {
        filteredDevices.sort((a, b) => {
            switch (sortValue) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'model':
                    return a.model.localeCompare(b.model);
                case 'performance':
                    return (b.performance || 0) - (a.performance || 0);
                case 'status':
                    const statusA = (a.status || '').toLowerCase();
                    const statusB = (b.status || '').toLowerCase();
                    // Sort enabled first
                    if ((statusA === 'enable' || statusA === 'enabled') && (statusB !== 'enable' && statusB !== 'enabled')) return -1;
                    if ((statusB === 'enable' || statusB === 'enabled') && (statusA !== 'enable' && statusA !== 'enabled')) return 1;
                    return 0;
                default:
                    return 0;
            }
        });
    }

    // Update device count
    deviceCount.textContent = filteredDevices.length;

    // Update active filters display
    updateActiveFilters();

    // Render filtered devices
    renderDevices(filteredDevices);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load saved preferences
    try {
        const savedPreferences = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (savedPreferences.searchTerm) searchInput.value = savedPreferences.searchTerm;
        if (savedPreferences.categoryValue) categoryFilter.value = savedPreferences.categoryValue;
        if (savedPreferences.statusValue) statusFilter.value = savedPreferences.statusValue;
        if (savedPreferences.modelValue) modelFilter.value = savedPreferences.modelValue;
        if (savedPreferences.sortValue) sortOptions.value = savedPreferences.sortValue;
        if (savedPreferences.viewMode) {
            viewMode = savedPreferences.viewMode;
            currentView = viewMode; // Keep currentView in sync
            toggleViewBtn.innerHTML = `<i class="bi bi-${viewMode === 'grid' ? 'list' : 'grid'}"></i> Toggle View`;
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }

    // Set up event listeners
    searchInput.addEventListener('input', filterAndSortDevices);
    categoryFilter.addEventListener('change', filterAndSortDevices);
    statusFilter.addEventListener('change', filterAndSortDevices);
    modelFilter.addEventListener('change', filterAndSortDevices);
    sortOptions.addEventListener('change', filterAndSortDevices);
    
    // Initial update
    updateActiveFilters();
    filterAndSortDevices();

    // Initialize filter dropdowns
    initializeFilterDropdowns();
});

// Function to fetch device specifications
async function fetchDeviceSpecifications(deviceId) {
    try {
        const response = await fetch(`/api/devices/specifications/${deviceId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch specifications');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching specifications:', error);
        return null;
    }
}

// Function to fetch device applications
async function fetchDeviceApplications(deviceId) {
    try {
        const device = devices.find(d => d.id === deviceId);
        if (!device) {
            console.error('Device not found:', deviceId);
            return [];
        }

        // Get applications based on device type
        let applications = device.applications || [];
        
        // Add default applications based on device type if none exist
        if (applications.length === 0) {
            if (device.type === 'server') {
                applications = [
                    "High-Performance Computing",
                    "Data Center Operations",
                    "Cloud Services",
                    "Enterprise AI Solutions"
                ];
            } else {
                applications = [
                    "Smart Surveillance",
                    "Industrial Quality Inspection",
                    "Edge Computing"
                ];
            }
        }

        return applications;
    } catch (error) {
        console.error('Error fetching device applications:', error);
        return [];
    }
}

// Update the showTab function to use the correct device ID
async function showTab(button, tabName, cardId) {
    // Get the device ID from the card
    const device = devices.find(d => d.id === cardId);
    if (!device) {
        console.error('Device not found for ID:', cardId);
        return;
    }
    
    const contentDiv = document.querySelector(`.tab-content[data-content="${tabName}"][data-card-id="${cardId}"]`);
    if (!contentDiv) {
        console.error(`Content div not found for tab: ${tabName}, card: ${cardId}`);
        return;
    }
    
    // Remove active class from all tabs
    document.querySelectorAll(`.tab[data-card-id="${cardId}"]`).forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    button.classList.add('active');
    
    // Toggle content visibility
    document.querySelectorAll(`.tab-content[data-card-id="${cardId}"]`).forEach(content => {
        content.classList.add('collapsed');
    });
    contentDiv.classList.remove('collapsed');
    
    // Show loading state
    contentDiv.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading ${tabName}...</p>
        </div>
    `;
    
    try {
        // Fetch and update content based on tab
        if (tabName === 'specs') {
            // For specs, we can use the device data we already have
            updateSpecificationsContent(contentDiv, device);
            
            // Ensure single-view class is present on the specs-grid after content is loaded
            setTimeout(() => {
                const specsGrid = document.getElementById(`specs-grid-${cardId}`);
                if (specsGrid) {
                    // Apply single-view class to all relevant containers
                    specsGrid.classList.add('single-view');
                    
                    // Apply to parent container of specs grid
                    if (specsGrid.parentElement) {
                        specsGrid.parentElement.classList.add('single-view');
                    }
                    
                    // Apply to specs category content if present
                    const specsCategories = specsGrid.querySelectorAll('.specs-category-content');
                    specsCategories.forEach(category => {
                        category.classList.add('single-view');
                    });
                    
                    // Apply to each specs-grid inside
                    const nestedGrids = specsGrid.querySelectorAll('.specs-grid');
                    nestedGrids.forEach(grid => {
                        grid.classList.add('single-view');
                    });
                    
                    // Apply to specs-tab container
                    const specsTab = contentDiv.closest('.specs-tab');
                    if (specsTab) {
                        specsTab.classList.add('single-view');
                    }
                    
                    // Add to device-specs-grid if present
                    const deviceSpecsGrid = document.querySelector('.device-specs-grid');
                    if (deviceSpecsGrid) {
                        deviceSpecsGrid.classList.add('single-view');
                    }
                    
                    // Force a reflow to ensure styles are applied
                    void specsGrid.offsetHeight;
                    
                    // Apply direct style enforcement
                    enforceSpecsSingleColumnView();
                }
            }, 100);
        } else if (tabName === 'apps') {
            console.log(`Fetching applications for device: ${device.name} (ID: ${device.id})`);
            
            // Check if we already have applications data for this device
            if (device.applications && device.applications.length > 0) {
                console.log('Using cached applications data:', device.applications);
                updateApplicationsContent(contentDiv, { applications: device.applications });
            } else {
                try {
                    // Fetch applications from the server
                    const response = await fetch(`${API_URL}/devices/applications/${device.id}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const apps = await response.json();
                    console.log('Fetched applications:', apps);
                    
                    if (apps && apps.applications) {
                        // Cache the applications data for future use
                        device.applications = apps.applications;
                        updateApplicationsContent(contentDiv, apps);
                    } else {
                        contentDiv.innerHTML = `
                            <div class="alert alert-info">
                                No applications available for this device.
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error('Error fetching applications:', error);
                    contentDiv.innerHTML = `
                        <div class="alert alert-danger">
                            Failed to load applications. ${error.message}
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error(`Error loading ${tabName}:`, error);
        contentDiv.innerHTML = `
            <div class="alert alert-danger">
                Failed to load ${tabName}. ${error.message}
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="showTab(document.querySelector('.tab[data-tab=\'${tabName}\'][data-card-id=\'${cardId}\']'), '${tabName}', '${cardId}')">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
            </div>
        `;
    }
}

// Update the specifications content function to use device data directly
function updateSpecificationsContent(contentDiv, device) {
    const cardId = contentDiv.getAttribute('data-card-id');
    
    const specsHtml = `
        <div class="specs-toggle-container">
            <div class="toggle-switch">
                <input type="radio" id="basic-specs-${cardId}" 
                       name="specs-view-${cardId}" 
                       value="basic" checked onclick="toggleSpecsView(this, '${cardId}')">
                <label for="basic-specs-${cardId}">Core Specs</label>
                <input type="radio" id="full-specs-${cardId}" 
                       name="specs-view-${cardId}" 
                       value="full" onclick="toggleSpecsView(this, '${cardId}')">
                <label for="full-specs-${cardId}">Full Specs</label>
            </div>
        </div>
        <div class="device-specs-grid single-view" id="specs-grid-${cardId}">
            ${formatSpecifications(device)}
        </div>
    `;
    contentDiv.innerHTML = specsHtml;
    
    // Add the single-view class to contentDiv as well
    contentDiv.classList.add('single-view');
    
    // Also add the class to any parent containers that might affect layout
    let parent = contentDiv.parentElement;
    while (parent) {
        if (parent.classList.contains('specs-tab') || 
            parent.classList.contains('tab-content') ||
            parent.classList.contains('card-tabs')) {
            parent.classList.add('single-view');
        }
        parent = parent.parentElement;
    }
    
    // Add hover and active effects to spec rows after rendering content
    setTimeout(() => {
        // Find all specs-grid elements and ensure they have the single-view class
        const allSpecsGrids = contentDiv.querySelectorAll('.specs-grid');
        allSpecsGrids.forEach(grid => {
            grid.classList.add('single-view');
        });
        
        // Find all specs-category-content elements and ensure they have the single-view class
        const allSpecsCategories = contentDiv.querySelectorAll('.specs-category-content');
        allSpecsCategories.forEach(category => {
            category.classList.add('single-view');
        });
        
        // Apply active effects
        addSpecRowHoverEffects(contentDiv, device);
        
        // Apply direct style enforcement
        enforceSpecsSingleColumnView();
    }, 100);
}

// Function to add hover effects to spec rows
function addSpecRowHoverEffects(contentDiv, device) {
    const specRows = contentDiv.querySelectorAll('.spec-row');
    
    specRows.forEach(row => {
        // Extract category color based on icon color
        let color = '#4285F4'; // Default blue
        const iconElement = row.querySelector('.bi');
        
        if (row.classList.contains('basic-spec-item')) {
            color = '#0d6efd'; // Primary blue for basic specs
        } else if (row.closest('[data-category="connectivity"]')) {
            color = '#34A853'; // Green for connectivity
        } else if (row.closest('[data-category="performance"]')) {
            color = '#EA4335'; // Red for performance
        } else if (row.closest('[data-category="physical"]')) {
            color = '#FBBC05'; // Yellow for physical
        }
        
        // Make row position relative for proper highlight positioning
        if (window.getComputedStyle(row).position !== 'relative') {
            row.classList.add('spec-row-relative');
        }
        
        // Store the original colors as data attributes to avoid inline styles
        row.dataset.defaultBg = row.classList.contains('full-spec-item') ? '#f8f9fa' : '#fff';
        row.dataset.hoverColor = color;
        
        // Add event listeners for hover effects
        row.addEventListener('mouseenter', () => {
            row.classList.add('spec-row-hover');
            
            // Add highlight element if it doesn't exist
            if (!row.querySelector('.spec-highlight')) {
                const highlight = document.createElement('div');
                highlight.className = 'spec-highlight';
                highlight.style.backgroundColor = color;
                row.appendChild(highlight);
                
                // Trigger animation after a small delay
                setTimeout(() => {
                    highlight.classList.add('spec-highlight-visible');
                }, 10);
            }
            
            // Apply icon color directly since CSS attr() doesn't work well for colors
            if (iconElement) {
                iconElement.style.color = color;
            }
        });
        
        // Remove hover effect
        row.addEventListener('mouseleave', () => {
            row.classList.remove('spec-row-hover');
            
            // Handle highlight removal
            const highlight = row.querySelector('.spec-highlight');
            if (highlight) {
                highlight.classList.remove('spec-highlight-visible');
                // Remove after animation completes
                setTimeout(() => {
                    if (highlight && highlight.parentNode) {
                        highlight.parentNode.removeChild(highlight);
                    }
                }, 300);
            }
            
            // Reset icon color
            if (iconElement) {
                iconElement.style.color = '';
            }
        });
        
        // Add active state via class
        row.addEventListener('mousedown', () => {
            row.classList.add('spec-row-active');
        });
        
        // Restore hover state after click if still hovering
        row.addEventListener('mouseup', () => {
            row.classList.remove('spec-row-active');
            if (row.matches(':hover')) {
                row.classList.add('spec-row-hover');
            }
        });
    });
}

// Update the formatSpecifications function to handle the device data structure
function formatSpecifications(device) {
    const specs = device.specs || {};
    
    // Define specification categories with enhanced metadata
    const categories = {
        core: {
            title: 'Core System Specifications',
            icon: 'bi-cpu',
            description: 'Essential hardware and system specifications',
            specs: [
                { name: 'Processor', value: specs.processor, icon: 'bi-cpu' },
                { name: 'Memory', value: specs.memory, icon: 'bi-memory' },
                { name: 'Storage', value: specs.storage, icon: 'bi-hdd' },
                { name: 'Operating System', value: specs.os, icon: 'bi-windows' }
            ]
        },
        connectivity: {
            title: 'Connectivity & Networking',
            icon: 'bi-hdd-network',
            description: 'Network interfaces and communication capabilities',
            specs: [
                { name: 'Ethernet', value: specs.ethernet, icon: 'bi-ethernet' },
                { name: 'WLAN', value: specs.wlan, icon: 'bi-wifi' },
                { name: 'BT', value: specs.bt, icon: 'bi-bluetooth' }
            ]
        },
        performance: {
            title: 'Performance & Processing',
            icon: 'bi-speedometer2',
            description: 'Processing power and computational capabilities',
            specs: [
                { name: 'GPU', value: specs.gpu, icon: 'bi-gpu-card' },
                { name: 'Super Mode', value: specs.super_mode, icon: 'bi-lightning' },
                { name: 'Video Channels', value: specs.video_chs, icon: 'bi-camera-video' }
            ]
        },
        physical: {
            title: 'Physical & Environmental',
            icon: 'bi-box',
            description: 'Physical specifications and operating conditions',
            specs: [
                { name: 'Operating Temperature', value: specs.operating_temperature, icon: 'bi-thermometer' },
                { name: 'Weight', value: specs.weight, icon: 'bi-box' },
                { name: 'Expansion', value: specs.expansion, icon: 'bi-diagram-3' }
            ]
        }
    };

    // Generate HTML for core specs
    let basicSpecsHtml = `
        <div class="specs-category" data-category="core">
            <div class="specs-category-header collapsed" onclick="toggleSpecsCategory(this)" role="button" aria-expanded="false">
                <i class="bi bi-cpu"></i>
                <span>Core System Specifications</span>
            </div>
            <div class="specs-category-content collapsed" aria-hidden="true">
                <div class="specs-grid">
                    ${categories.core.specs.map(spec => `
                        <div class="spec-row basic-spec-item">
                            <div class="spec-label-container">
                                <i class="bi ${spec.icon}"></i>
                                <span class="spec-label">${spec.name}</span>
                            </div>
                            <div class="spec-value">${formatValue(spec.value)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Generate HTML for full specs
    let fullSpecsHtml = `
        <div class="full-specs-section">
            ${Object.entries(categories).filter(([key]) => key !== 'core').map(([category, data]) => `
                <div class="specs-category" data-category="${category}">
                    <div class="specs-category-header collapsed" onclick="toggleSpecsCategory(this)" role="button" aria-expanded="false">
                        <i class="bi ${data.icon}"></i>
                        <span>${data.title}</span>
                    </div>
                    <div class="specs-category-content collapsed" aria-hidden="true">
                        <div class="category-description">
                            ${data.description}
                        </div>
                        <div class="specs-grid">
                            ${data.specs.map(spec => `
                                <div class="spec-row full-spec-item">
                                    <div class="spec-label-container">
                                        <i class="bi ${spec.icon}"></i>
                                        <span class="spec-label">${spec.name}</span>
                                    </div>
                                    <div class="spec-value">${formatValue(spec.value)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('')}
            
            <div class="expandable-section">
                <button class="expandable-trigger" onclick="toggleAllSpecsCategories(this)">
                    <i class="bi bi-chevron-down"></i> Expand All
                </button>
                <button class="expandable-trigger export-spec-button" onclick="exportFullSpecification('${device.id}')">
                    <i class="bi bi-download"></i> Export Full Specification
                </button>
            </div>
        </div>
    `;

    return `
        <div class="basic-specs">
            ${basicSpecsHtml}
        </div>
        <div class="full-specs" style="display: none;">
            ${fullSpecsHtml}
        </div>
    `;
}

// Function to toggle individual specs category
function toggleSpecsCategory(header) {
    const content = header.nextElementSibling;
    const isCollapsed = header.classList.contains('collapsed');
    
    // Toggle the collapsed state
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
    
    // Update aria attributes
    header.setAttribute('aria-expanded', !isCollapsed);
    content.setAttribute('aria-hidden', isCollapsed);
}

// Function to toggle all specs categories
function toggleAllSpecsCategories(trigger) {
    const fullSpecsSection = trigger.closest('.full-specs-section');
    const headers = fullSpecsSection.querySelectorAll('.specs-category-header');
    const isExpanding = trigger.querySelector('i').classList.contains('bi-chevron-down');
    
    headers.forEach(header => {
        const content = header.nextElementSibling;
        if (isExpanding) {
            header.classList.remove('collapsed');
            content.classList.remove('collapsed');
            header.setAttribute('aria-expanded', 'true');
            content.setAttribute('aria-hidden', 'false');
        } else {
            header.classList.add('collapsed');
            content.classList.add('collapsed');
            header.setAttribute('aria-expanded', 'false');
            content.setAttribute('aria-hidden', 'true');
        }
    });
    
    // Update trigger button
    const icon = trigger.querySelector('i');
    const text = trigger.textContent.trim().replace('Expand All', '').replace('Collapse All', '');
    if (isExpanding) {
        icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
        trigger.innerHTML = `<i class="bi bi-chevron-up"></i> Collapse All`;
    } else {
        icon.classList.replace('bi-chevron-up', 'bi-chevron-down');
        trigger.innerHTML = `<i class="bi bi-chevron-down"></i> Expand All`;
    }
}

// Update toggleSpecsView function to handle the display of basic/full specs
function toggleSpecsView(radio, cardId) {
    const specsGrid = document.getElementById(`specs-grid-${cardId}`);
    if (!specsGrid) return;

    const basicSpecs = specsGrid.querySelector('.basic-specs');
    const fullSpecs = specsGrid.querySelector('.full-specs');

    // Apply single-view class to all relevant containers
    specsGrid.classList.add('single-view');
    
    // Apply to parent container of specs grid
    if (specsGrid.parentElement) {
        specsGrid.parentElement.classList.add('single-view');
    }
    
    // Apply to specs category content if present
    const specsCategories = specsGrid.querySelectorAll('.specs-category-content');
    specsCategories.forEach(category => {
        category.classList.add('single-view');
    });
    
    // Apply to each specs-grid inside
    const nestedGrids = specsGrid.querySelectorAll('.specs-grid');
    nestedGrids.forEach(grid => {
        grid.classList.add('single-view');
    });
    
    // Add to device-specs-grid if present
    const deviceSpecsGrid = document.querySelector('.device-specs-grid');
    if (deviceSpecsGrid) {
        deviceSpecsGrid.classList.add('single-view');
    }

    if (radio.value === 'full') {
        basicSpecs.style.display = 'none';
        fullSpecs.style.display = 'block';
        fullSpecs.classList.add('single-view');
        
        // Keep all categories collapsed when switching to full specs view
        const headers = fullSpecs.querySelectorAll('.specs-category-header');
        headers.forEach(header => {
            if (!header.classList.contains('collapsed')) {
                header.classList.add('collapsed');
                header.nextElementSibling.classList.add('collapsed');
            }
            header.setAttribute('aria-expanded', 'false');
            header.nextElementSibling.setAttribute('aria-hidden', 'true');
        });
    } else {
        basicSpecs.style.display = 'block';
        basicSpecs.classList.add('single-view');
        fullSpecs.style.display = 'none';
        
        // Keep core specs category collapsed when switching to basic specs view
        const coreHeader = basicSpecs.querySelector('.specs-category-header');
        if (coreHeader && !coreHeader.classList.contains('collapsed')) {
            coreHeader.classList.add('collapsed');
            coreHeader.nextElementSibling.classList.add('collapsed');
            coreHeader.setAttribute('aria-expanded', 'false');
            coreHeader.nextElementSibling.setAttribute('aria-hidden', 'true');
        }
    }
    
    // Force browser to recalculate layout
    void specsGrid.offsetHeight;
    
    // Enforce single column view
    setTimeout(enforceSpecsSingleColumnView, 50);
}

// Helper function to format values with enhanced styling
function formatValue(value) {
    if (value === null || value === undefined || value === '' || 
        (typeof value === 'string' && ['unknown', 'n/a', 'none', 'not specified']
            .includes(value.toLowerCase().trim()))) {
        return '<span class="spec-value not-available">Not Available</span>';
    }
    
    // Format numbers with units
    if (typeof value === 'string') {
        // Memory formatting (e.g., "16GB")
        if (value.match(/^\d+\s*GB$/i)) {
            const [num] = value.match(/\d+/);
            return `<span class="spec-value">${num}<span class="unit">GB</span></span>`;
        }
        
        // Temperature formatting (e.g., "0-40°C")
        if (value.match(/[-\d]+°C/)) {
            return `<span class="spec-value">${value.replace('°C', '<span class="unit">°C</span>')}</span>`;
        }
        
        // Weight formatting (e.g., "2.5kg")
        if (value.match(/[\d.]+\s*kg/i)) {
            const [num] = value.match(/[\d.]+/);
            return `<span class="spec-value">${num}<span class="unit">kg</span></span>`;
        }
    }
    
    return `<span class="spec-value">${value}</span>`;
}

function updateApplicationsContent(contentDiv, apps) {
    // Extract applications array from the response object
    const applications = apps.applications || [];
    
    if (!applications || applications.length === 0) {
        contentDiv.innerHTML = `
            <div class="text-center py-3">
                <p class="text-muted mb-0">No applications available</p>
            </div>
        `;
        return;
    }
    
    // Debug mode
    const debugMode = false; // Set to false to hide debug information

    // Match the grid styles with the device specs grid
    const gridStyles = `
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        padding: 16px;
        width: 100%;
        box-sizing: border-box;
        min-width: 0;
        overflow: hidden;
    `;

    // Use consistent card styles that match spec cards
    const cardStyles = `
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        padding: 0;
        transition: all 0.3s ease;
        border: 1px solid #eaecef;
        height: 100%;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        border-left: 4px solid;
        min-width: 0;
    `;

    // Define hover effects to be applied dynamically
    const addCardHoverEffects = () => {
        const cards = document.querySelectorAll('.application-item');
        
        cards.forEach(card => {
            const color = card.style.getPropertyValue('--accent-color');
            
            // Add hover effect
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = `0 10px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px ${color}40`;
                card.style.borderColor = `${color}70`;
                card.style.backgroundColor = '#fafafa';
                
                // Add subtle highlight to the left border
                const highlight = document.createElement('div');
                highlight.className = 'card-highlight';
                highlight.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 4px;
                    height: 100%;
                    background-color: ${color};
                    transform: scaleY(0);
                    transform-origin: top;
                    transition: transform 0.3s ease;
                `;
                
                // Only add if it doesn't exist yet
                if (!card.querySelector('.card-highlight')) {
                    card.appendChild(highlight);
                    // Trigger animation after a small delay
                    setTimeout(() => {
                        highlight.style.transform = 'scaleY(1)';
                    }, 10);
                }
            });
            
            // Remove hover effect
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
                card.style.borderColor = '#eaecef';
                card.style.backgroundColor = '#ffffff';
                
                // Animate highlight removal
                const highlight = card.querySelector('.card-highlight');
                if (highlight) {
                    highlight.style.transform = 'scaleY(0)';
                    // Remove after animation completes
                    setTimeout(() => {
                        if (highlight && highlight.parentNode) {
                            highlight.parentNode.removeChild(highlight);
                        }
                    }, 300);
                }
            });
            
            // Add active state
            card.addEventListener('mousedown', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 1px ${color}60`;
                card.style.backgroundColor = '#f5f5f5';
            });
            
            // Restore hover state after click
            card.addEventListener('mouseup', () => {
                if (card.matches(':hover')) {
                    card.style.transform = 'translateY(-5px)';
                    card.style.boxShadow = `0 10px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px ${color}40`;
                    card.style.backgroundColor = '#fafafa';
                }
            });
        });
    };

    contentDiv.innerHTML = `
        ${debugMode ? `
        <div style="background-color: #f8f9fa; padding: 10px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <div style="font-weight: bold; margin-bottom: 5px;">Icon Debug Info:</div>
            <div style="font-size: 12px; color: #666;">
                This panel shows the actual icon classes being used for each application type.
            </div>
            <ul style="font-size: 12px; margin-top: 8px; padding-left: 20px;">
                <li><strong>Healthcare:</strong> bi-hospital-fill / bi-heart</li>
                <li><strong>Traffic:</strong> bi-stoplights-fill</li>
                <li><strong>Automotive:</strong> bi-cpu-fill</li>
                <li><strong>Building:</strong> bi-building-fill</li>
                <li><strong>Infrastructure:</strong> bi-buildings-fill / bi-building</li>
            </ul>
        </div>
        ` : ''}
        <div class="applications-grid" style="${gridStyles}">
            ${applications.map((app, index) => {
                // If app is a string, create a default object structure
                const appName = typeof app === 'string' ? app : app.name;
                const appType = getAppType(appName);
                // Capitalize the first letter of the type
                const capitalizedAppType = appType.charAt(0).toUpperCase() + appType.slice(1);
                const appDescription = getAppDescription(appName);
                
                // Get icon by app type instead of app name to ensure consistency
                const { icon, color, hasFallback } = getAppIconByAppType(appType);
                
                // Convert hex color to RGB for shadow effect
                const hexToRgb = (hex) => {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16)
                    } : null;
                };
                
                const rgb = hexToRgb(color);
                const rgbValues = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '46, 204, 113';
                
                // For debugging - extract the first icon class if there are fallbacks
                const primaryIcon = icon.split(' ')[0];
                const fallbackIcon = icon.split(' ')[1] || '';
                
                // Determine if the color is dark or light to set appropriate text color
                const isColorDark = (hex) => {
                    // Remove the hash character if present
                    hex = hex.replace('#', '');
                    
                    // Parse the hexadecimal color to RGB
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    
                    // Calculate the relative luminance (perceived brightness)
                    // Formula: 0.299*R + 0.587*G + 0.114*B
                    const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
                    
                    // Return true if the color is dark (brightness < 128)
                    return brightness < 128;
                };
                
                // Create a solid background color for the badge
                const badgeBackgroundColor = color;
                const badgeTextColor = isColorDark(color) ? '#ffffff' : '#ffffff';
                const badgeBorderColor = isColorDark(color) ? color : color;
                
                return `
                    <div class="application-item" style="${cardStyles} --item-index: ${index}; --accent-color: ${color}; --accent-color-light: ${color}80; --icon-color-rgb: ${rgbValues}; border-left-color: ${color};">
                        <div class="app-header" style="background-color: #f5f5f5; padding: 12px 15px; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start;">
                            <div class="app-icon" style="color: ${color}; font-size: 14px; margin-right: 10px; width: 16px; text-align: center; flex-shrink: 0; padding-top: 2px;">
                                <i class="bi ${primaryIcon}"></i>
                            </div>
                            <div class="app-title" style="width: 100%; min-width: 0; display: block; white-space: normal; word-break: break-word; overflow-wrap: break-word; line-height: 1.3;">
                                ${appName}
                            </div>
                        </div>
                        <div class="app-content" style="padding: 12px 15px; display: flex; flex-direction: column; flex: 1;">
                            <div style="margin-bottom: 8px; display: flex; align-items: center;">
                                <span class="badge" style="background-color: ${badgeBackgroundColor}; color: ${badgeTextColor}; font-size: 12px; padding: 4px 8px; border-radius: 4px;">
                                    ${capitalizedAppType}
                                </span>
                            </div>
                            <div class="app-description" style="color: #4a5568; font-size: 13px; line-height: 1.4; flex-grow: 1; overflow-wrap: break-word; word-break: break-word; white-space: normal; min-width: 0; width: 100%; display: block;">
                                ${appDescription}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Add hover effects after rendering content
    setTimeout(() => {
        addCardHoverEffects();
    }, 100);
    
    // Make sure Bootstrap Icons are loaded
    const checkBootstrapIcons = () => {
        // Check if Bootstrap Icons stylesheet is present
        const hasBootstrapIcons = Array.from(document.styleSheets).some(sheet => 
            sheet.href && sheet.href.includes('bootstrap-icons'));
            
        if (!hasBootstrapIcons) {
            console.warn('Bootstrap Icons stylesheet may be missing!');
            
            // Attempt to add Bootstrap Icons if missing
            const head = document.head;
            const link = document.createElement('link');
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css';
            head.appendChild(link);
            
            console.log('Bootstrap Icons stylesheet was added dynamically.');
        }
    };
    
    // Ensure icons are loaded
    checkBootstrapIcons();
}

function getAppDescription(appName) {
    const descriptions = {
        // Edge AI Device Applications
        "Smart Surveillance": "Advanced video analytics and monitoring capabilities",
        "Industrial Quality Inspection": "Automated visual inspection and quality control",
        "Edge Computing": "Real-time data processing at the network edge",
        "Building Monitoring and Management": "Intelligent building systems and security",
        "Optimize Energy Usage": "Smart energy management and optimization",
        "Urban Infrastructure Management": "City infrastructure monitoring and control",
        "Manufacturing Optimization": "Enhanced manufacturing process control",
        "Predictive Maintenance": "AI-driven equipment maintenance prediction",
        "Retail Analytics": "Customer behavior and retail performance analysis",
        "Traffic Violation Detection": "Automated traffic monitoring and enforcement",
        
        // AI Edge Server Applications
        "High-Performance Computing": "Advanced computational capabilities for complex tasks",
        "Data Center Operations": "Efficient data center management and optimization",
        "Cloud Services": "Scalable cloud computing and storage solutions",
        "Enterprise AI Solutions": "Business-focused artificial intelligence applications",
        
        // Default description for unknown applications
        "default": "Advanced AI-powered application"
    };
    
    return descriptions[appName] || descriptions["default"];
}

function getAppIconByAppType(appType) {
    // Create consistent color palette for application categories
    const categoryColors = {
        // Security & Surveillance - Red family
        securityColor: '#e74c3c',  
        
        // Industry & Manufacturing - Blue family
        industryColor: '#3498db',
        
        // Infrastructure & Building - Green family
        infrastructureColor: '#2ecc71',
        
        // Retail & Analytics - Purple family
        retailColor: '#9b59b6',
        
        // Transportation & Logistics - Orange family
        transportColor: '#e67e22',
        
        // Robotics & Automation - Yellow family
        roboticsColor: '#f1c40f',
        
        // Healthcare - Turquoise family
        healthcareColor: '#1abc9c',
        
        // Computing & Data - Dark gray/blue family
        computingColor: '#34495e',
        
        // Maintenance - Gray family
        maintenanceColor: '#95a5a6',
        
        // Default - Light gray
        defaultColor: '#7f8c8d'
    };

    // This mapping connects app types to their appropriate icons and colors
    const typeToIconMapping = {
        // Security & Surveillance group
        'surveillance': { icon: 'bi-camera-video-fill', color: categoryColors.securityColor },
        'traffic': { icon: 'bi-stoplights-fill', color: categoryColors.securityColor },
        
        // Industry & Manufacturing group
        'industrial': { icon: 'bi-search', color: categoryColors.industryColor },
        'manufacturing': { icon: 'bi-gear-fill', color: categoryColors.industryColor },
        
        // Infrastructure & Building group
        'building': { icon: 'bi-building-fill', color: categoryColors.infrastructureColor },
        'energy': { icon: 'bi-lightning-fill', color: categoryColors.infrastructureColor },
        'infrastructure': { icon: 'bi-buildings', color: categoryColors.infrastructureColor },
        
        // Maintenance group
        'maintenance': { icon: 'bi-tools', color: categoryColors.maintenanceColor },
        
        // Retail & Analytics group
        'retail': { icon: 'bi-graph-up', color: categoryColors.retailColor },
        
        // Robotics & Automation group
        'robotics': { icon: 'bi-robot', color: categoryColors.roboticsColor },
        'navigation': { icon: 'bi-compass-fill', color: categoryColors.roboticsColor },
        'automation': { icon: 'bi-lightning-charge-fill', color: categoryColors.roboticsColor },
        
        // Transportation & Logistics group
        'fleet': { icon: 'bi-truck', color: categoryColors.transportColor },
        'automotive': { icon: 'bi-cpu-fill', color: categoryColors.transportColor },
        
        // Healthcare group
        'healthcare': { icon: 'bi-heart', color: categoryColors.healthcareColor },
        
        // Computing & Data group
        'computation': { icon: 'bi-cpu-fill', color: categoryColors.computingColor },
        'computing': { icon: 'bi-pc-display', color: categoryColors.computingColor },
        'datacenter': { icon: 'bi-server', color: categoryColors.computingColor },
        'cloud': { icon: 'bi-cloud-fill', color: categoryColors.computingColor },
        'enterprise': { icon: 'bi-building', color: categoryColors.computingColor },
        'edge': { icon: 'bi-hdd-network', color: categoryColors.computingColor },
        
        // Default
        'other': { icon: 'bi-app', color: categoryColors.defaultColor }
    };
    
    // Get the mapping
    let result = typeToIconMapping[appType] || typeToIconMapping['other'];
    
    return result;
}

function getAppIconByName(app) {
    // Create consistent color palette for application categories
    const categoryColors = {
        // Security & Surveillance - Red family
        securityColor: '#e74c3c',  
        
        // Industry & Manufacturing - Blue family
        industryColor: '#3498db',
        
        // Infrastructure & Building - Green family
        infrastructureColor: '#2ecc71',
        
        // Retail & Analytics - Purple family
        retailColor: '#9b59b6',
        
        // Transportation & Logistics - Orange family
        transportColor: '#e67e22',
        
        // Robotics & Automation - Yellow family
        roboticsColor: '#f1c40f',
        
        // Healthcare - Turquoise family
        healthcareColor: '#1abc9c',
        
        // Computing & Data - Dark gray/blue family
        computingColor: '#34495e',
        
        // Maintenance - Gray family
        maintenanceColor: '#95a5a6',
        
        // Default - Light gray
        defaultColor: '#7f8c8d'
    };

    const iconMapping = {
        // Surveillance & Security
        'Smart Surveillance': { icon: 'bi-camera-video-fill', color: categoryColors.securityColor },
        'Traffic Violation Detection': { icon: 'bi-stoplights-fill', color: categoryColors.securityColor },

        // Industrial & Manufacturing
        'Industrial Quality Inspection': { icon: 'bi-search', color: categoryColors.industryColor },
        'Manufacturing Optimization': { icon: 'bi-gear-fill', color: categoryColors.industryColor },
        'Industrial Automation': { icon: 'bi-robot', color: categoryColors.industryColor },

        // Building & Infrastructure
        'Building Monitoring and Management': { icon: 'bi-building-fill', color: categoryColors.infrastructureColor },
        'Urban Infrastructure Management': { icon: 'bi-city', color: categoryColors.infrastructureColor },
        'Optimize Energy Usage': { icon: 'bi-lightning-fill', color: categoryColors.infrastructureColor },

        // Retail & Analytics
        'Retail Analytics': { icon: 'bi-graph-up', color: categoryColors.retailColor },
        'Customer Behavior Analytics': { icon: 'bi-people-fill', color: categoryColors.retailColor },

        // Robotics & Automation
        'Autonomous Mobile Robot (AMR)': { icon: 'bi-robot', color: categoryColors.roboticsColor },
        'Real-Time Navigation': { icon: 'bi-compass-fill', color: categoryColors.roboticsColor },
        'Automation Efficiency': { icon: 'bi-lightning-charge-fill', color: categoryColors.roboticsColor },

        // Transportation
        'Fleet Management': { icon: 'bi-truck', color: categoryColors.transportColor },
        'Autonomous Driving': { icon: 'bi-cpu-fill', color: categoryColors.transportColor },

        // Healthcare
        'Healthcare and Medical': { icon: 'bi-heart-pulse-fill', color: categoryColors.healthcareColor },

        // Maintenance
        'Predictive Maintenance': { icon: 'bi-tools', color: categoryColors.maintenanceColor },

        // AI & Computing
        'Real-Time AI Computation': { icon: 'bi-cpu-fill', color: categoryColors.computingColor },
        'Edge Computing': { icon: 'bi-hdd-network', color: categoryColors.computingColor },
        'High-Performance Computing': { icon: 'bi-cpu-fill', color: categoryColors.computingColor },
        'Data Center Operations': { icon: 'bi-server', color: categoryColors.computingColor },
        'Cloud Services': { icon: 'bi-cloud-fill', color: categoryColors.computingColor },
        'Enterprise AI Solutions': { icon: 'bi-building', color: categoryColors.computingColor },

        // Default
        'default': { icon: 'bi-app', color: categoryColors.defaultColor }
    };
    
    return iconMapping[app] || iconMapping['default'];
}

function updateDeviceList(devices) {
    const deviceList = document.getElementById('deviceList');
    deviceList.innerHTML = '';
    
    devices.forEach(device => {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device-item';
        
        // Format the performance value
        let performanceDisplay = 'N/A';
        if (device.performance !== undefined && device.performance !== null) {
            const perfValue = parseFloat(device.performance);
            if (!isNaN(perfValue) && perfValue > 0) {
                performanceDisplay = `${perfValue} TOPS`;
            } else {
                // If performance is 0 or negative, show N/A
                performanceDisplay = 'N/A';
            }
        }
        
        // Log the performance value for debugging
        console.log(`Device: ${device.name}, Performance: ${device.performance}, Display: ${performanceDisplay}`);
        
        deviceElement.innerHTML = `
            <h3>${device.name}</h3>
            <p><strong>AI Performance:</strong> ${performanceDisplay}</p>
            <p><strong>Memory:</strong> ${device.memory || 'N/A'}</p>
            <p><strong>Storage:</strong> ${device.storage || 'N/A'}</p>
            <button onclick="showDeviceDetails('${device._id}')">View Details</button>
        `;
        
        deviceList.appendChild(deviceElement);
    });
}

function filterDevices() {
    const selectedCategory = document.getElementById('categoryFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    const devices = document.querySelectorAll('.device-card');
    devices.forEach(device => {
        const deviceType = device.getAttribute('data-category');
        const deviceName = device.querySelector('.card-title').textContent.toLowerCase();
        const matchesCategory = !selectedCategory || deviceType === selectedCategory;
        const matchesSearch = deviceName.includes(searchQuery);
        
        device.style.display = matchesCategory && matchesSearch ? 'block' : 'none';
    });
}

function getAppType(appName) {
    const typeMapping = {
        'Smart Surveillance': 'surveillance',
        'Industrial Quality Inspection': 'industrial',
        'Building Monitoring and Management': 'building',
        'Optimize Energy Usage': 'energy',
        'Urban Infrastructure Management': 'infrastructure',
        'Manufacturing Optimization': 'manufacturing',
        'Predictive Maintenance': 'maintenance',
        'Retail Analytics': 'retail',
        'Traffic Violation Detection': 'traffic',
        'Customer Behavior Analytics': 'retail',
        'Autonomous Mobile Robot (AMR)': 'robotics',
        'Real-Time Navigation': 'navigation',
        'Automation Efficiency': 'automation',
        'Fleet Management': 'fleet',
        'Autonomous Driving': 'automotive',
        'Healthcare and Medical': 'healthcare',
        'Industrial Automation': 'industrial',
        'Real-Time AI Computation': 'computation',
        // Server specific applications
        'High-Performance Computing': 'computing',
        'Data Center Operations': 'datacenter',
        'Cloud Services': 'cloud',
        'Enterprise AI Solutions': 'enterprise',
        'Edge Computing': 'edge'
    };
    return typeMapping[appName] || 'other';
}

// Update this helper function to support adaptive layout
function enforceSpecsSingleColumnView() {
    // Find all elements with single-view class
    const singleViewContainers = document.querySelectorAll('.single-view');
    
    singleViewContainers.forEach(container => {
        // Find all specs-grid elements inside this container
        const specsGrids = container.querySelectorAll('.specs-grid');
        
        specsGrids.forEach(grid => {
            // Apply direct style override to force two-column layout on desktop
            const containerWidth = grid.clientWidth;
            
            if (window.innerWidth <= 767) {
                // Force single column on mobile
                grid.style.setProperty('grid-template-columns', '1fr', 'important');
                
                // Apply direct styles to all direct children to force them to span full width
                const children = grid.children;
                for (let i = 0; i < children.length; i++) {
                    children[i].style.setProperty('grid-column', '1 / -1', 'important');
                    children[i].style.setProperty('width', '100%', 'important');
                }
            } else {
                // Force two columns on larger screens
                grid.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
                
                // Make sure headers and section toggles span full width
                const fullWidthElements = grid.querySelectorAll('.specs-category-header, .category-description, .expandable-section, .specs-toggle-container');
                fullWidthElements.forEach(el => {
                    el.style.setProperty('grid-column', '1 / -1', 'important');
                    el.style.setProperty('width', '100%', 'important');
                });
            }
        });
        
        // Apply two-column layout to any device-specs-grid containers
        const deviceSpecsGrids = container.closest('.device-specs-grid') || container.querySelectorAll('.device-specs-grid');
        if (deviceSpecsGrids) {
            if (deviceSpecsGrids.length) {
                // If we got multiple elements from querySelectorAll
                deviceSpecsGrids.forEach(el => {
                    el.classList.add('single-view');
                    const grids = el.querySelectorAll('.specs-grid');
                    grids.forEach(grid => {
                        if (window.innerWidth > 767) {
                            grid.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
                        } else {
                            grid.style.setProperty('grid-template-columns', '1fr', 'important');
                        }
                    });
                });
            } else if (deviceSpecsGrids.classList) {
                // If we got a single element from closest()
                deviceSpecsGrids.classList.add('single-view');
                const grids = deviceSpecsGrids.querySelectorAll('.specs-grid');
                grids.forEach(grid => {
                    if (window.innerWidth > 767) {
                        grid.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
                    } else {
                        grid.style.setProperty('grid-template-columns', '1fr', 'important');
                    }
                });
            }
        }
        
        // Fix spec-value alignment regardless of layout
        const specValues = container.querySelectorAll('.spec-value, span.spec-value');
        specValues.forEach(value => {
            value.style.setProperty('text-align', 'right', 'important');
            value.style.setProperty('float', 'right', 'important');
        });
    });
}

// Add a window resize listener to update the layout when the viewport changes
window.addEventListener('resize', function() {
    // Use debounce to prevent excessive function calls during resize
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(enforceSpecsSingleColumnView, 150);
});

// Device Comparison Functions
const devicesToCompare = new Set();

// Toggle device selection for comparison
function toggleCompareDevice(deviceId) {
    if (devicesToCompare.has(deviceId)) {
        devicesToCompare.delete(deviceId);
    } else {
        devicesToCompare.add(deviceId);
    }
    
    updateCompareButton();
}

// Update compare button visibility and count
function updateCompareButton() {
    const count = devicesToCompare.size;
    
    if (count > 0) {
        compareButtonContainer.classList.remove('d-none');
        compareCount.textContent = count;
    } else {
        compareButtonContainer.classList.add('d-none');
    }
}

// Show the compare modal with selected devices
function showCompareModal() {
    if (devicesToCompare.size < 1) {
        return;
    }
    
    const selectedDevices = Array.from(devicesToCompare).map(id => 
        devices.find(device => device.id === id)
    ).filter(device => device); // Filter out any undefined devices
    
    if (selectedDevices.length > 0) {
        populateCompareTable(selectedDevices);
        const compareModal = new bootstrap.Modal(document.getElementById('compareModal'));
        compareModal.show();
    }
}

// Populate the comparison table
function populateCompareTable(selectedDevices) {
    const compareTable = document.getElementById('compareTable');
    compareTable.innerHTML = '';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add feature column header
    const featureHeader = document.createElement('th');
    featureHeader.textContent = 'Feature';
    headerRow.appendChild(featureHeader);
    
    // Add device column headers
    selectedDevices.forEach(device => {
        const deviceHeader = document.createElement('th');
        deviceHeader.textContent = device.name;
        headerRow.appendChild(deviceHeader);
    });
    
    thead.appendChild(headerRow);
    compareTable.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Define comparison categories and their fields
    const comparisonCategories = [
        {
            name: 'Basic Info',
            fields: [
                { id: 'model', label: 'Model' },
                { id: 'type', label: 'Type' },
                { id: 'status', label: 'Super Mode', formatter: formatStatus }
            ]
        },
        {
            name: 'Performance',
            fields: [
                { id: 'performance', label: 'AI Performance (TOPS)', formatter: value => `${value} TOPS` }
            ]
        },
        {
            name: 'Specifications',
            fields: [
                { id: 'specs.processor', label: 'Processor', getter: device => device.specs.processor },
                { id: 'specs.memory', label: 'Memory', getter: device => device.specs.memory },
                { id: 'specs.storage', label: 'Storage', getter: device => device.specs.storage },
                { id: 'specs.gpu', label: 'GPU', getter: device => device.specs.gpu },
                { id: 'specs.os', label: 'Operating System', getter: device => device.specs.os }
            ]
        },
        {
            name: 'Connectivity',
            fields: [
                { id: 'specs.ethernet', label: 'Ethernet', getter: device => device.specs.ethernet },
                { id: 'specs.wireless', label: 'Wireless', getter: device => device.specs.wireless },
                { id: 'specs.wlan', label: 'WLAN', getter: device => device.specs.wlan },
                { id: 'specs.bt', label: 'Bluetooth', getter: device => device.specs.bt },
                { id: 'specs.io', label: 'I/O Ports', getter: device => device.specs.io }
            ]
        },
        {
            name: 'Other',
            fields: [
                { id: 'specs.camera', label: 'Camera', getter: device => device.specs.camera },
                { id: 'specs.video_chs', label: 'Video Channels', getter: device => device.specs.video_chs },
                { id: 'specs.operating_temperature', label: 'Operating Temperature', getter: device => device.specs.operating_temperature },
                { id: 'specs.certifications', label: 'Certifications', getter: device => device.specs.certifications }
            ]
        }
    ];
    
    // Add category rows and their fields
    comparisonCategories.forEach(category => {
        // Add category header
        const categoryRow = document.createElement('tr');
        const categoryCell = document.createElement('td');
        categoryCell.colSpan = selectedDevices.length + 1;
        categoryCell.className = 'table-primary fw-bold';
        categoryCell.textContent = category.name;
        categoryRow.appendChild(categoryCell);
        tbody.appendChild(categoryRow);
        
        // Add field rows
        category.fields.forEach(field => {
            const fieldRow = document.createElement('tr');
            
            // Add field name
            const fieldNameCell = document.createElement('td');
            fieldNameCell.textContent = field.label;
            fieldNameCell.className = 'feature-name';
            fieldRow.appendChild(fieldNameCell);
            
            // Add device values for this field
            selectedDevices.forEach(device => {
                const valueCell = document.createElement('td');
                
                let value;
                if (field.getter) {
                    value = field.getter(device);
                } else {
                    // Handle nested properties (e.g., 'specs.processor')
                    value = field.id.split('.').reduce((obj, prop) => obj && obj[prop], device);
                }
                
                // Apply formatter if provided
                if (field.formatter && value !== undefined) {
                    valueCell.innerHTML = field.formatter(value);
                } else {
                    valueCell.textContent = value || 'N/A';
                }
                
                fieldRow.appendChild(valueCell);
            });
            
            // Highlight differences
            highlightDifferences(fieldRow, 1); // Start from index 1 (first value cell)
            
            tbody.appendChild(fieldRow);
        });
    });
    
    compareTable.appendChild(tbody);
    
    // Initialize tooltips in the modal
    setTimeout(() => {
        initializeTooltips();
    }, 0);
}

// Highlight differences in a row
function highlightDifferences(row, startIndex) {
    const cells = Array.from(row.cells).slice(startIndex);
    
    if (cells.length < 2) return; // Need at least 2 cells to compare
    
    // Check if all cells have the same value
    const firstValue = cells[0].textContent;
    const allSame = cells.every(cell => cell.textContent === firstValue);
    
    // If they're different, highlight all cells
    if (!allSame) {
        cells.forEach(cell => {
            cell.classList.add('highlight');
        });
    }
}

// Export the comparison table
document.getElementById('exportComparisonBtn').addEventListener('click', function() {
    const selectedDevices = Array.from(devicesToCompare).map(id => 
        devices.find(device => device.id === id)
    ).filter(device => device);
    
    if (selectedDevices.length === 0) return;
    
    exportDeviceComparison(selectedDevices);
});

// Export comparison to PDF
function exportDeviceComparison(selectedDevices) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    
    // Add Inventec logo
    try {
        const logoPath = '/static/img/inventec_ai_logo_2.png';
        doc.addImage(logoPath, 'PNG', 14, 10, 40, 20);
    } catch (error) {
        console.error('Error adding logo to comparison PDF:', error);
    }
    
    // Add title
    doc.setFontSize(16);
    doc.setTextColor(66, 139, 202);
    doc.text('Device Comparison Report', 14, 40);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 48);
    
    // Prepare data for table
    const tableData = [];
    
    // Define comparison fields (simplified for PDF)
    const comparisonFields = [
        { id: 'model', label: 'Model' },
        { id: 'type', label: 'Type' },
        { id: 'status', label: 'Super Mode' },
        { id: 'performance', label: 'AI Performance' },
        { id: 'specs.processor', label: 'Processor', getter: device => device.specs.processor },
        { id: 'specs.memory', label: 'Memory', getter: device => device.specs.memory },
        { id: 'specs.storage', label: 'Storage', getter: device => device.specs.storage },
        { id: 'specs.gpu', label: 'GPU', getter: device => device.specs.gpu },
        { id: 'specs.os', label: 'OS', getter: device => device.specs.os },
        { id: 'specs.ethernet', label: 'Ethernet', getter: device => device.specs.ethernet }
    ];
    
    // Create header row
    const header = ['Feature', ...selectedDevices.map(d => d.name)];
    tableData.push(header);
    
    // Create rows for each field
    comparisonFields.forEach(field => {
        const row = [field.label];
        selectedDevices.forEach(device => {
            let value;
            if (field.getter) {
                try {
                    value = field.getter(device) || 'N/A';
                } catch (e) {
                    value = 'N/A';
                }
            } else if (field.id === 'status') {
                value = formatStatus(device.status).replace('Super Mode: ', '');
            } else if (field.id === 'performance') {
                value = device.performance ? `${device.performance} TOPS` : 'N/A';
            } else {
                value = device[field.id] || 'N/A';
            }
            row.push(value);
        });
        tableData.push(row);
    });
    
    // Generate the table with comparison data
    doc.autoTable({
        head: [tableData[0]],
        body: tableData.slice(1),
        startY: 55,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 5
        },
        headStyles: {
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 }
        }
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
    }
    
    // Add watermark
    const watermarkText = getWatermarkText();
    addWatermarkToAllPages(doc, watermarkText);
    
    // Save the PDF
    doc.save('Device_Comparison.pdf');
}

// Helper function to add watermark to all pages of a PDF document
function addWatermarkToAllPages(doc, text) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Default text if none provided
  const watermarkText = text || "Edge AI Insights\nInternal Use Only";
  
  // Split the text into lines
  const lines = watermarkText.split('\n');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(30);
    doc.setTextColor(200);
    doc.setFont("helvetica", "normal");

    // Calculate vertical positioning based on number of lines
    const lineSpacing = 20;
    const startY = pageHeight / 2 - ((lines.length - 1) * lineSpacing / 2);

    // Draw each line of the watermark
    lines.forEach((line, index) => {
      doc.text(line, pageWidth / 2, startY + (index * lineSpacing), {
        angle: 45,
        align: 'center'
      });
    });
  }
}

// Helper function to get appropriate watermark text based on export mode
function getWatermarkText() {
  const mode = document.getElementById("exportMode")?.value || "internal";

  let watermarkText = "Edge AI Insights\nInternal Use Only";
  if (mode === "draft") {
    watermarkText = "Edge AI Insights\nDraft\nDo Not Distribute";
  } else if (mode === "external") {
    watermarkText = "Edge AI Insights\nCustomer View – No Redistribution";
  }

  // Debug log
  console.log("Watermark Applied:", watermarkText);
  const debugElement = document.getElementById("watermarkDebug");
  if (debugElement) {
    debugElement.textContent = `Watermark Applied: ${watermarkText.replace('\n', ' | ')}`;
  }

  return watermarkText;
}

// Function to get the appropriate tag class based on tag value
function getTagClass(tagValue) {
    if (!tagValue) return '';
    
    // Normalize the tag value
    const normalizedTag = tagValue.toLowerCase().trim();
    
    // Return appropriate class based on tag value
    switch (normalizedTag) {
        case 'best seller':
            return 'tag-bestseller';
        case 'new':
            return 'tag-new';
        case 'sale':
            return 'tag-sale';
        case 'limited':
            return 'tag-limited';
        case 'most beautiful':
            return 'tag-beautiful';
        default:
            return 'tag-default';
    }
}

// Function to get device description with fallback logic
function getDeviceDescription(device) {
    // If description_summary exists, use it
    if (device.description_summary) {
        return device.description_summary;
    }
    
    // Otherwise, generate a fallback description
    const chip = device.specs?.processor || "Unknown processor";
    
    // Handle different memory formats
    let ram = "N/A";
    if (device.specs?.memory) {
        // Extract number from memory string (e.g., "8GB" → "8")
        const memoryMatch = device.specs.memory.match(/(\d+)\s*(GB|MB|TB|G|M|T)?/i);
        if (memoryMatch && memoryMatch[1]) {
            ram = memoryMatch[1];
            // Add unit if not present in the output string
            const unit = memoryMatch[2] ? "" : "GB";
            ram = `${ram}${unit}`;
        } else {
            ram = device.specs.memory;
        }
    }
    
    const tops = device.performance || "N/A";
    
    return `Edge device with ${chip}, ${ram} RAM, and ${tops} TOPS.`;
}

