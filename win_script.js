document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
    const statusText = document.getElementById('status-text');
    const sidebarItems = document.querySelectorAll('.nav-item'); // Updated class
    const confirmBtn = document.getElementById('confirm-btn');
    const downloadWindow = document.getElementById('download-window');
    const downloadList = document.getElementById('download-list');
    const closeBtns = document.querySelectorAll('.close-modal');
    const searchInput = document.getElementById('search-input');

    let softwareList = [];
    let currentCategory = 'SOFTWARE'; // Default
    let searchQuery = '';

    // Fetch data from list_win.json
    fetch('list_win.json')
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
            row.className = `win-row ${item.selected ? 'selected' : ''}`;

            row.innerHTML = `
                <div class="col-check">
                    <input type="checkbox" class="win-checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}>
                </div>
                <div class="col-name">${item.filename}</div>
                <div class="col-size">${item.size}</div>
                <div class="col-os">${item.os_min}</div>
            `;

            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = row.querySelector('.win-checkbox');
                    checkbox.checked = !checkbox.checked;
                    toggleItem(item.id, checkbox.checked);
                }
            });

            const checkbox = row.querySelector('.win-checkbox');
            checkbox.addEventListener('change', (e) => {
                toggleItem(item.id, e.target.checked);
            });

            listContainer.appendChild(row);
        });

        updateStatus();
    }

    function toggleItem(id, isSelected) {
        const item = softwareList.find(i => i.id === id);
        if (item) {
            item.selected = isSelected;
            // Update UI for this specific row only to avoid full re-render flickering
            const checkbox = document.querySelector(`.win-checkbox[data-id="${id}"]`);
            if (checkbox) {
                const row = checkbox.closest('.win-row');
                if (isSelected) row.classList.add('selected');
                else row.classList.remove('selected');
                checkbox.checked = isSelected;
            }
        }
        updateStatus();
    }

    function updateStatus() {
        const count = softwareList.filter(i => i.selected).length;
        statusText.textContent = `${count} selected`; // Simplified text
    }

    // Sidebar Logic
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
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

    // Modal Logic
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const selectedItems = softwareList.filter(i => i.selected);
            if (selectedItems.length === 0) {
                alert('Please select files to install.');
                return;
            }

            downloadList.innerHTML = '';
            selectedItems.forEach(item => {
                const row = document.createElement('div');
                row.className = 'download-item'; // Use new class for styling

                row.innerHTML = `
                    <div style="font-weight: 500;">${item.filename}</div>
                    <a href="${item.link}" target="_blank" style="text-decoration:none;">
                        <button class="win11-btn primary" style="padding: 4px 12px; font-size: 12px;">Get</button>
                    </a>
                `;
                downloadList.appendChild(row);
            });

            downloadWindow.style.display = 'flex';
        });
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            downloadWindow.style.display = 'none';
        });
    });
});
