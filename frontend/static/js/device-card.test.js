/**
 * @jest-environment jsdom
 */

// Mock localStorage before importing the module
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(key => store[key]),
        setItem: jest.fn((key, value) => {
            store[key] = value;
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: false
});

// Import functions to test
const {
    renderDevices,
    formatSpecifications,
    getStatusColor,
    getTopsColor,
    calculateTopsPercentage,
    initializeDOMElements
} = require('./main.js');

// Mock device data
const mockDevice = {
    id: 'device1',
    name: 'Test Device',
    type: 'camera',
    status: 'enable',
    performance: 120,
    model: 'NCOX',
    specs: {
        processor: 'Test Processor',
        memory: '8GB RAM',
        storage: '128GB SSD',
        operating_system: 'Linux',
        networking: 'Gigabit Ethernet',
        io_interfaces: 'USB 3.0, HDMI',
        dimensions: '300x200x50mm',
        weight: '2.5kg',
        power_input: '12V DC',
        operating_temperature: '0-40°C'
    }
};

describe('Device Card Component', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="deviceCardsContainer"></div>
            <span id="deviceCount">0</span>
            <div id="deviceModal" class="modal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-body"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize global variables
        global.devices = [mockDevice];
        global.viewMode = 'grid';

        // Initialize DOM elements
        initializeDOMElements();

        // Mock bootstrap modal
        global.bootstrap = {
            Modal: jest.fn().mockImplementation(() => ({
                show: jest.fn(),
                hide: jest.fn()
            }))
        };
    });

    test('renders device card with all core information', () => {
        renderDevices([mockDevice]);
        const container = document.getElementById('deviceCardsContainer');
        expect(container.innerHTML).toContain('Test Device');
        expect(container.innerHTML).toContain('NCOX');
        expect(container.innerHTML).toContain('120 TOPS');
        expect(container.innerHTML).toContain('Test Processor');
    });

    test('renders performance indicator correctly', () => {
        renderDevices([mockDevice]);
        const container = document.getElementById('deviceCardsContainer');
        expect(container.innerHTML).toContain('progress-bar');
        expect(container.innerHTML).toContain(`width: ${calculateTopsPercentage(mockDevice.performance)}%`);
        expect(container.innerHTML).toContain(getTopsColor(mockDevice.performance));
    });

    test('renders all specification categories', () => {
        renderDevices([mockDevice]);
        const container = document.getElementById('deviceCardsContainer');
        expect(container.innerHTML).toContain('System');
        expect(container.innerHTML).toContain('Connectivity');
        expect(container.innerHTML).toContain('Physical');
    });

    test('renders all device specifications correctly', () => {
        renderDevices([mockDevice]);
        const container = document.getElementById('deviceCardsContainer');
        expect(container.innerHTML).toContain('Test Processor');
        expect(container.innerHTML).toContain('8GB RAM');
        expect(container.innerHTML).toContain('128GB SSD');
        expect(container.innerHTML).toContain('Linux');
        expect(container.innerHTML).toContain('Gigabit Ethernet');
        expect(container.innerHTML).toContain('USB 3.0, HDMI');
    });

    test('handles missing specifications gracefully', () => {
        const deviceWithoutSpecs = { ...mockDevice, specs: null };
        renderDevices([deviceWithoutSpecs]);
        const container = document.getElementById('deviceCardsContainer');
        expect(container.innerHTML).toContain('N/A');
    });

    test('renders action buttons correctly', () => {
        renderDevices([mockDevice]);
        const container = document.getElementById('deviceCardsContainer');
        expect(container.innerHTML).toContain('View Details');
        expect(container.innerHTML).toContain('Restart');
        expect(container.innerHTML).toContain('Configure');
    });

    test('renders accordion structure correctly', () => {
        renderDevices([mockDevice]);
        const container = document.getElementById('deviceCardsContainer');
        expect(container.innerHTML).toContain('accordion');
        expect(container.innerHTML).toContain('Device Specifications');
        expect(container.innerHTML).toContain('accordion-collapse collapse');
    });

    test('handles different view modes correctly', () => {
        // Set up DOM
        document.body.innerHTML = '<div id="deviceCardsContainer"></div>';
        
        // Set up list view
        localStorage.setItem('viewMode', 'list');
        renderDevices([mockDevice]);
        const listHtml = document.getElementById('deviceCardsContainer').innerHTML;
        expect(listHtml).toContain('class="col-12 mb-4"');
        expect(listHtml).not.toContain('col-md-6');
        expect(listHtml).not.toContain('col-lg-4');

        // Set up grid view
        localStorage.setItem('viewMode', 'grid');
        renderDevices([mockDevice]);
        const gridHtml = document.getElementById('deviceCardsContainer').innerHTML;
        expect(gridHtml).toContain('class="col-12 col-md-6 col-lg-4 mb-4"');
    });

    test('handles different status styles correctly', () => {
        const statuses = [
            { status: 'enable', expectedColor: 'success' },
            { status: 'disable', expectedColor: 'secondary' }
        ];

        statuses.forEach(({ status, expectedColor }) => {
            const deviceWithStatus = { ...mockDevice, status };
            renderDevices([deviceWithStatus]);
            const container = document.getElementById('deviceCardsContainer');
            expect(container.innerHTML).toContain(`bg-${expectedColor}`);
            expect(container.innerHTML).toContain(`status-${status}`);
        });
    });
}); 