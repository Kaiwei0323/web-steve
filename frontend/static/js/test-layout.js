// Test script to verify the two-column layout for specifications
document.addEventListener('DOMContentLoaded', function() {
    console.log('Testing two-column layout for specifications...');
    
    // Function to check if the CSS is properly applied
    function checkSpecsLayout() {
        // Look for both old and new container classes
        const specsGrids = document.querySelectorAll('.specs-grid, .specs-cards-container');
        
        if (specsGrids.length === 0) {
            console.error('No specs layout containers found in the document');
            return false;
        }
        
        console.log(`Found ${specsGrids.length} specs layout containers`);
        
        // Check computed styles for each container
        specsGrids.forEach((grid, index) => {
            const computedStyle = window.getComputedStyle(grid);
            const gridTemplateColumns = computedStyle.getPropertyValue('grid-template-columns');
            const display = computedStyle.getPropertyValue('display');
            
            console.log(`Container ${index + 1}:`);
            console.log(`- Element class: ${grid.className}`);
            console.log(`- Display: ${display}`);
            console.log(`- Grid Template Columns: ${gridTemplateColumns}`);
            
            // Create visual indicator
            grid.style.border = '2px dashed red';
            
            // Check the child items
            let childItems;
            if (grid.classList.contains('specs-cards-container')) {
                childItems = grid.querySelectorAll('.spec-card');
                console.log(`- Contains ${childItems.length} spec cards`);
            } else {
                childItems = grid.querySelectorAll('.spec-row');
                console.log(`- Contains ${childItems.length} spec rows`);
            }
            
            // Add a visible class to help identify the grid layout
            grid.classList.add('test-grid-visible');
            
            // Temporarily highlight the grid
            setTimeout(() => {
                grid.style.border = '';
                grid.classList.remove('test-grid-visible');
            }, 5000);
        });
        
        return true;
    }
    
    // Add temporary styles to help visualize the grid
    const style = document.createElement('style');
    style.textContent = `
        .test-grid-visible {
            background-color: rgba(255, 0, 0, 0.05);
            transition: all 0.3s ease;
        }
        .test-grid-visible .spec-row,
        .test-grid-visible .spec-card {
            box-shadow: 0 0 0 2px rgba(0, 128, 255, 0.5);
        }
    `;
    document.head.appendChild(style);
    
    // Run the test after a short delay to ensure the DOM is fully rendered
    setTimeout(checkSpecsLayout, 1000);
    
    // Log the specs-grid CSS variables
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    console.log('CSS Variables:');
    console.log('--specs-grid-gap:', computedStyle.getPropertyValue('--specs-grid-gap'));
    console.log('--specs-label-width:', computedStyle.getPropertyValue('--specs-label-width'));
    console.log('--spec-label-gap:', computedStyle.getPropertyValue('--spec-label-gap'));
});

// Force refresh the layout
function forceRefreshLayout() {
    // Handle both old and new container classes
    const specsContainers = document.querySelectorAll('.specs-grid, .specs-cards-container');
    specsContainers.forEach(container => {
        // Force a reflow
        container.style.display = 'none';
        container.offsetHeight; // Trigger reflow
        container.style.display = 'grid';
        
        // Ensure grid template columns is set
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        
        // Reset at mobile breakpoints
        if (window.innerWidth <= 768) {
            container.style.gridTemplateColumns = '1fr';
        }
    });
    console.log('Layout refresh forced on', specsContainers.length, 'containers');
}

// Run the force refresh after the page loads
window.addEventListener('load', function() {
    setTimeout(forceRefreshLayout, 500);
    
    // Refresh on window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(forceRefreshLayout, 100);
    });
    
    // Also run when switching between basic and full specs
    const specToggles = document.querySelectorAll('input[name^="specs-view-"]');
    specToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            setTimeout(forceRefreshLayout, 100);
        });
    });
}); 