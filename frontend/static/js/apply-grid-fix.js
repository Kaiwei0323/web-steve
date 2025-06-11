// Script to apply the grid fixes
(function() {
    console.log('Applying grid fixes...');
    
    // Load the grid-fix CSS
    function loadGridFixCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/static/css/grid-fix.css';
        link.onload = function() {
            console.log('Grid fix CSS loaded successfully');
            applyGridFixes();
        };
        document.head.appendChild(link);
    }
    
    // Apply direct fixes to existing grids
    function applyGridFixes() {
        // Wait for DOM to be fully loaded
        if (document.readyState !== 'complete') {
            window.addEventListener('load', applyDirectFixes);
        } else {
            applyDirectFixes();
        }
    }
    
    // Track current zoom level for layout adjustments
    let currentZoom = 1;
    
    // Detect zoom level
    function detectZoom() {
        const ratio = window.devicePixelRatio || 1;
        return ratio;
    }
    
    // Fix text content to ensure it fits properly
    function fixTextContent() {
        // Find and fix all spec values to ensure they display properly
        const specValues = document.querySelectorAll('.spec-value');
        
        specValues.forEach(value => {
            const text = value.textContent || '';
            
            // Make OS text smaller if it contains Ubuntu
            if (text.includes('Ubuntu') || text.includes('Linux')) {
                value.style.fontSize = '12px';
                value.style.lineHeight = '1.2';
            }
            
            // Make Jetson text smaller
            if (text.includes('NVIDIA') || text.includes('Jetson')) {
                value.style.fontSize = '12px';
                value.style.lineHeight = '1.2';
            }
            
            // Make NVMe text smaller
            if (text.includes('NVMe')) {
                value.style.fontSize = '12px';
                value.style.lineHeight = '1.2';
            }
            
            // Special fix for Weight card to prevent truncation
            const cardHeader = value.closest('.spec-card')?.querySelector('.spec-card-header span');
            if (cardHeader && cardHeader.textContent.trim() === 'Weight') {
                value.style.overflow = 'visible';
                value.style.whiteSpace = 'normal';
                value.style.textOverflow = 'clip';
                value.style.minHeight = '30px';
                value.style.height = 'auto';
                
                // Also fix the parent elements
                const contentDiv = value.closest('.spec-card-content');
                if (contentDiv) {
                    contentDiv.style.overflow = 'visible';
                    contentDiv.style.minHeight = '30px';
                    contentDiv.style.height = 'auto';
                }
                
                const card = value.closest('.spec-card');
                if (card) {
                    card.style.overflow = 'visible';
                    card.style.height = 'auto';
                    card.style.minHeight = '100px';
                }
            }
            
            // Ensure all text wraps properly
            value.style.wordBreak = 'break-word';
            value.style.overflowWrap = 'break-word';
            value.style.whiteSpace = 'normal';
            value.style.display = 'block';
            value.style.width = '100%';
            value.style.boxSizing = 'border-box';
            value.style.minWidth = '0';
        });
    }
    
    // Apply layout adjustments based on zoom level
    function adjustLayoutForZoom() {
        const newZoom = detectZoom();
        
        // Only update if zoom level has changed
        if (newZoom !== currentZoom) {
            console.log(`Zoom level changed from ${currentZoom} to ${newZoom}`);
            currentZoom = newZoom;
            
            // Apply fixes for specs containers
            const specsContainers = document.querySelectorAll('.specs-cards-container');
            specsContainers.forEach(container => {
                // Always use minmax to prevent overflow
                container.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                container.style.minWidth = '0';
                container.style.maxWidth = '100%';
                container.style.width = '100%';
                container.style.boxSizing = 'border-box';
                
                // Ensure cards adjust properly
                const cards = container.querySelectorAll('.spec-card');
                cards.forEach(card => {
                    card.style.width = '100%';
                    card.style.minWidth = '0';
                    card.style.maxWidth = '100%';
                    card.style.boxSizing = 'border-box';
                    
                    // Fix header
                    const header = card.querySelector('.spec-card-header');
                    if (header) {
                        header.style.width = '100%';
                        header.style.minWidth = '0';
                        header.style.boxSizing = 'border-box';
                        header.style.padding = '8px 12px';
                        
                        const headerText = header.querySelector('span');
                        if (headerText) {
                            headerText.style.overflow = 'hidden';
                            headerText.style.textOverflow = 'ellipsis';
                            headerText.style.whiteSpace = 'nowrap';
                        }
                    }
                    
                    // Fix content container
                    const content = card.querySelector('.spec-card-content');
                    if (content) {
                        content.style.width = '100%';
                        content.style.minWidth = '0';
                        content.style.maxWidth = '100%';
                        content.style.boxSizing = 'border-box';
                        content.style.padding = '8px 12px';
                        content.style.overflowWrap = 'break-word';
                    }
                });
            });
            
            // Fix text content for better display
            fixTextContent();
            
            applyDirectFixes();
        }
    }
    
    function applyDirectFixes() {
        console.log('Applying direct grid fixes');
        
        // Find all specs cards containers
        const specsContainers = document.querySelectorAll('.specs-cards-container');
        if (specsContainers.length > 0) {
            console.log(`Found ${specsContainers.length} specs card containers to fix`);
            
            specsContainers.forEach((container, index) => {
                // Force the grid layout with two columns always
                container.style.display = 'grid';
                container.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                container.style.gap = '16px';
                container.style.width = '100%';
                container.style.minWidth = '0';
                container.style.maxWidth = '100%';
                container.style.boxSizing = 'border-box';
                
                // Only change to single column for very small screens
                const viewportWidth = window.innerWidth;
                if (viewportWidth <= 576) { // Only mobile gets single column
                    container.style.gridTemplateColumns = '1fr';
                }
                
                // Ensure all cards are properly styled
                const cards = container.querySelectorAll('.spec-card');
                cards.forEach(card => {
                    card.style.width = '100%';
                    card.style.minWidth = '0';
                    card.style.maxWidth = '100%';
                    card.style.boxSizing = 'border-box';
                    card.style.overflow = 'hidden';
                    
                    // Fix card content
                    const content = card.querySelector('.spec-card-content');
                    if (content) {
                        const valueElement = content.querySelector('.spec-value');
                        if (valueElement) {
                            // Set content styles
                            valueElement.style.display = 'block';
                            valueElement.style.width = '100%';
                            valueElement.style.wordBreak = 'break-word';
                            valueElement.style.overflowWrap = 'break-word';
                            valueElement.style.whiteSpace = 'normal';
                        }
                    }
                });
                
                // Fix any remaining style issues
                fixTextContent();
                
                console.log(`Applied fix to container ${index + 1}`);
            });
        }
        
        // Find all specs grids for backward compatibility
        const specsGrids = document.querySelectorAll('.specs-grid');
        if (specsGrids.length > 0) {
            console.log(`Found ${specsGrids.length} specs grids to fix`);
            
            specsGrids.forEach((grid, index) => {
                // Force the grid layout
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                grid.style.gap = '12px';
                grid.style.width = '100%';
                grid.style.minWidth = '0';
                grid.style.boxSizing = 'border-box';
                
                // Only change to single column for very small screens
                const viewportWidth = window.innerWidth;
                if (viewportWidth <= 576) {
                    grid.style.gridTemplateColumns = '1fr';
                }
                
                console.log(`Applied fix to grid ${index + 1}`);
            });
        } else if (specsContainers.length === 0) {
            console.log('No specs containers found yet, will try again later');
            // Try again later as the content might be loaded dynamically
            setTimeout(applyDirectFixes, 1000);
        }
    }
    
    // Watch for window resize and zoom changes
    function setupResizeAndZoomListeners() {
        // Debounce function to avoid excessive calls
        function debounce(fn, ms) {
            let timer;
            return function() {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    fn.apply(this, arguments);
                }, ms);
            };
        }
        
        // Debounced layout adjustment
        const debouncedAdjust = debounce(() => {
            adjustLayoutForZoom();
            applyDirectFixes();
        }, 250);
        
        // Listen for window resize
        window.addEventListener('resize', debouncedAdjust);
        
        // Check for zoom changes more frequently
        setInterval(adjustLayoutForZoom, 500);
        
        // These events can sometimes indicate zoom changes
        window.addEventListener('scroll', debouncedAdjust);
        window.addEventListener('orientationchange', debouncedAdjust);
        
        // Monitor for mouse wheel events which might be zoom actions
        window.addEventListener('wheel', (e) => {
            // Check if Control key is pressed (common for zoom)
            if (e.ctrlKey) {
                setTimeout(debouncedAdjust, 100);
            }
        });
        
        console.log('Resize and zoom listeners established');
    }
    
    // Initialize
    function init() {
        loadGridFixCSS();
        patchFormatSpecifications();
        observeDOMChanges();
        setupResizeAndZoomListeners();
        
        // Apply initial layout adjustments
        adjustLayoutForZoom();
        fixTextContent();
        
        // Also listen for tab changes which might load specifications
        document.addEventListener('click', function(event) {
            // Check if the clicked element is a tab button or similar
            if (event.target.closest('.tab') || 
                event.target.closest('[data-bs-toggle="tab"]') ||
                event.target.closest('.specs-button')) {
                // Apply fixes after a short delay
                setTimeout(() => {
                    applyDirectFixes();
                    fixTextContent();
                }, 200);
            }
        });
    }
    
    // Patch the formatSpecifications function if needed
    function patchFormatSpecifications() {
        if (typeof window.formatSpecifications === 'function') {
            console.log('Patching formatSpecifications function');
            
            // Save the original function
            const originalFormatSpecifications = window.formatSpecifications;
            
            // Override with our patched version
            window.formatSpecifications = function(device) {
                // Call original function
                const result = originalFormatSpecifications(device);
                
                // Schedule a fix after the content is added to DOM
                setTimeout(() => {
                    applyDirectFixes();
                    fixTextContent();
                }, 100);
                
                return result;
            };
            
            console.log('Patched formatSpecifications successfully');
        } else {
            console.log('formatSpecifications function not found, cannot patch');
        }
    }
    
    // Watch for DOM changes to apply fixes to dynamically added content
    function observeDOMChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    // Check if any specs containers were added
                    let needsFix = false;
                    
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            if ((node.classList && (node.classList.contains('specs-grid') || 
                                                   node.classList.contains('specs-cards-container')))) {
                                needsFix = true;
                            } else if (node.querySelectorAll) {
                                const elements = node.querySelectorAll('.specs-grid, .specs-cards-container');
                                if (elements.length > 0) {
                                    needsFix = true;
                                }
                            }
                        }
                    });
                    
                    if (needsFix) {
                        applyDirectFixes();
                        fixTextContent();
                    }
                }
            });
        });
        
        // Observe the entire document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('DOM observer started');
    }
    
    // Start the fix process
    init();
})(); 