document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
    const selectAllCheckbox = document.getElementById('select-all');
    const selectedCountSpan = document.getElementById('selected-count');
    const menuItems = document.querySelectorAll('.sidebar .menu-item');
    const searchInput = document.getElementById('search-input');

    let softwareList = [];
    let currentCategory = 'SOFTWARE'; // Default category
    let searchQuery = '';

    const osMapping = {
        "10": "High Sierra",
        "11": "Big Sur",
        "12": "Monterey",
        "13": "Ventura",
        "14": "Sonoma",
        "15": "Sequoia",
        "Win": "Windows"
    };

    function getOsDisplay(os) {
        return osMapping[os] || `macOS ${os}`;
    }

    // Fetch data from list_mac.json
    fetch('list_mac.json')
        .then(response => response.json())
        .then(data => {
            softwareList = data.map(item => ({ ...item, selected: false }));
            renderList();
        })
        .catch(error => console.error('Error loading list:', error));

    function renderList() {
        listContainer.innerHTML = '';

        const filteredList = softwareList.filter(item => {
            // Flexible Search: If query exists, search everything. If empty, respect category.
            if (searchQuery) {
                return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                return item.category === currentCategory;
            }
        });

        filteredList.forEach((item) => {
            const row = document.createElement('div');
            row.className = `list-row ${item.selected ? 'selected' : ''}`;

            row.innerHTML = `
                <div class="col-checkbox">
                    <input type="checkbox" class="item-checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}>
                </div>
                <div class="col-name">${item.filename}</div>
                <!-- Category column removed as requested -->
                <div class="col-os">${getOsDisplay(item.os_min)}</div>
                <div class="col-size">${item.size}</div>
            `;

            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = row.querySelector('.item-checkbox');
                    checkbox.checked = !checkbox.checked;
                    toggleItem(item.id, checkbox.checked);
                }
            });

            const checkbox = row.querySelector('.item-checkbox');
            checkbox.addEventListener('change', (e) => {
                toggleItem(item.id, e.target.checked);
            });

            listContainer.appendChild(row);
        });

        updateSummary();
        updateSelectAllState(filteredList);
    }

    function toggleItem(id, isSelected) {
        const item = softwareList.find(i => i.id === id);
        if (item) {
            item.selected = isSelected;
            const checkbox = document.querySelector(`.item-checkbox[data-id="${id}"]`);
            if (checkbox) {
                const row = checkbox.closest('.list-row');
                if (row) {
                    if (isSelected) row.classList.add('selected');
                    else row.classList.remove('selected');
                    checkbox.checked = isSelected;
                }
            }
        }
        updateSummary();
        // Check state relative to current view (Global search or Category)
        const filteredList = softwareList.filter(item => {
            if (searchQuery) {
                return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                return item.category === currentCategory;
            }
        });
        updateSelectAllState(filteredList);
    }

    function updateSummary() {
        const count = softwareList.filter(i => i.selected).length;
        selectedCountSpan.textContent = count;
    }

    function updateSelectAllState(currentViewList) {
        const allSelected = currentViewList.length > 0 && currentViewList.every(i => i.selected);
        selectAllCheckbox.checked = allSelected;

        const someSelected = currentViewList.some(i => i.selected);
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    }

    // Select All Logic (relative to current view)
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const currentViewList = softwareList.filter(item => {
            if (searchQuery) {
                return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                return item.category === currentCategory;
            }
        });

        currentViewList.forEach(item => item.selected = isChecked);
        renderList();
    });

    // Sidebar Filtering Logic
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.getAttribute('data-category');
            renderList();
        });
    });

    // Search Logic
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderList();
        });
    }

    // Support Dark mode toggle via shortcut or just keep as user might have liked it.
    // User requested dark mode previously. I'll remove the settings button reliance 
    // since I replaced that menu item, or I can add a dedicated toggle later.
    // For now, I'll allow clicking the traffic light green to toggle dark mode as an 'easter egg' or just keep it system-pref only.
    // Actually, I'll just remove the JS toggle for now unless user asks back, focusing on the requested categories.
    // Or I can put dark mode toggle on the green traffic light:
    const greenLight = document.querySelector('.light.green');
    if (greenLight) {
        greenLight.style.cursor = 'pointer';
        greenLight.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }
    // Confirm Button Logic
    const confirmBtn = document.getElementById('confirm-btn');
    const mainWindow = document.querySelector('.window-container:not(.download-window)');
    const downloadWindow = document.getElementById('download-window');
    const downloadList = document.getElementById('download-list');
    const closeDownloadBtn = document.getElementById('close-download');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const selectedItems = softwareList.filter(i => i.selected);
            if (selectedItems.length === 0) {
                alert('Please select at least one item.');
                return;
            }

            // Populate Download Window
            downloadList.innerHTML = '';
            selectedItems.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'download-item';

                itemDiv.innerHTML = `
                    <div class="d-name">${item.filename}</div>
                    <a href="${item.link}" target="_blank" style="text-decoration:none;">
                        <button class="btn-primary d-btn">Download</button>
                    </a>
                `;
                downloadList.appendChild(itemDiv);
            });

            // Switch Windows
            mainWindow.style.display = 'none';
            downloadWindow.style.display = 'flex';
        });
    }

    if (closeDownloadBtn) {
        closeDownloadBtn.addEventListener('click', () => {
            downloadWindow.style.display = 'none';
            mainWindow.style.display = 'flex';
        });
    }
});
