// Make only rows with visible tickboxes green
(function() {
    // Find all list items in the building queue
    const rows = document.querySelectorAll('#template_queue li.sortable_row');
    let greenCount = 0;
    
    rows.forEach(function(row) {
        // Check if this row has a checkmark (tickbox) that is visible
        const checkmark = row.querySelector('img[src*="confirm.webp"]');
        
        // Only apply green styling if checkmark exists AND is visible
        if (checkmark && checkmark.style.display !== 'none' && 
            window.getComputedStyle(checkmark).display !== 'none') {
            // Hide the checkmark image
            checkmark.style.display = 'none';
            
            // Make the row green
            row.style.backgroundColor = '#90EE90'; // Light green
            row.style.border = '1px solid #228B22'; // Forest green border
            row.style.padding = '8px';
            row.style.marginBottom = '4px';
            row.style.borderRadius = '4px';
            
            greenCount++;
        }
    });
    
    console.log('Applied green styling to ' + greenCount + ' rows with visible checkmarks out of ' + rows.length + ' total rows');
})();
