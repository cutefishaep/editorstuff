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

    // Fetch data from list_win.json and list_presets.json
    Promise.all([
        fetch('list_win.json').then(res => res.json()),
        fetch('list_presets.json').then(res => res.json())
    ])
        .then(([winData, presetData]) => {
            // Filter out any presets that might still be in the win list (just in case)
            const filteredWin = winData.filter(item => item.category !== 'PRESET');
            softwareList = [...filteredWin, ...presetData].map(item => ({ ...item, selected: false }));
            renderList();
        })
        .catch(error => console.error('Error loading lists:', error));

    function renderList() {
        listContainer.innerHTML = '';
        const isPreset = currentCategory === 'PRESET' && !searchQuery;

        // Update headers in win.html dynamically
        const listHeader = document.querySelector('.list-header');
        const headerHtml = isPreset ? `
                <div class="col-check"><input type="checkbox" id="select-all"></div>
                <div class="col-name">Name</div>
                <div class="col-os">Min (AE)</div>
                <div class="col-size">Format</div>
            ` : `
                <div class="col-check"><input type="checkbox" id="select-all"></div>
                <div class="col-name">Name</div>
                <div class="col-os">Windows</div>
                <div class="col-size">Size</div>
            `;
        listHeader.innerHTML = headerHtml;

        const filteredList = softwareList.filter(item => {
            if (searchQuery) {
                return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                return item.category === currentCategory;
            }
        });

        const selectAllBtn = document.getElementById('select-all');
        if (selectAllBtn) {
            selectAllBtn.checked = filteredList.length > 0 && filteredList.every(i => i.selected);
            selectAllBtn.indeterminate = filteredList.some(i => i.selected) && !selectAllBtn.checked;

            selectAllBtn.onchange = (e) => {
                filteredList.forEach(item => {
                    item.selected = e.target.checked;
                });
                renderList();
            };
        }

        filteredList.forEach((item) => {
            const row = document.createElement('div');
            row.className = `win-row ${item.selected ? 'selected' : ''}`;

            row.innerHTML = `
                <div class="col-check">
                    <input type="checkbox" class="win-checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}>
                </div>
                <div class="col-name">${item.filename}</div>
                <div class="col-os">${item.os_min}</div>
                <div class="col-size">${item.size}${isPreset ? '' : ' GB'}</div>
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
            const checkbox = document.querySelector(`.win-checkbox[data-id="${id}"]`);
            if (checkbox) {
                const row = checkbox.closest('.win-row');
                if (isSelected) row.classList.add('selected');
                else row.classList.remove('selected');
                checkbox.checked = isSelected;
            }
        }
        updateStatus();

        // Update Select All state without full re-render
        const filteredList = softwareList.filter(item => {
            if (searchQuery) return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            return item.category === currentCategory;
        });
        const selectAllBtn = document.getElementById('select-all');
        if (selectAllBtn) {
            selectAllBtn.checked = filteredList.length > 0 && filteredList.every(i => i.selected);
            selectAllBtn.indeterminate = filteredList.some(i => i.selected) && !selectAllBtn.checked;
        }
    }

    function updateStatus() {
        const count = softwareList.filter(i => i.selected).length;
        statusText.textContent = `${count} selected`;
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

                let buttonsHtml = '';
                const links = [];

                // Check for numbered links
                Object.keys(item).forEach(key => {
                    if (/^link\d+$/.test(key)) {
                        const num = key.replace('link', '');
                        links.push({ url: item[key], label: `Mirror ${num}` });
                    }
                });

                // Fallback for legacy 'link'
                if (links.length === 0 && item.link) {
                    links.push({ url: item.link, label: 'Mirror 1' });
                }

                // Sort by mirror number
                links.sort((a, b) => {
                    const numA = parseInt(a.label.replace('Mirror ', ''));
                    const numB = parseInt(b.label.replace('Mirror ', ''));
                    return numA - numB;
                });

                // Add instruction button if it exists and is not a preset
                let instructionHtml = '';
                if (item.instruction && item.instruction.trim() !== '' && item.category !== 'PRESET') {
                    const instKey = `inst_${item.id}`;
                    if (!window.instructionData) window.instructionData = {};
                    window.instructionData[instKey] = {
                        name: item.filename,
                        text: item.instruction
                    };

                    instructionHtml = `
                        <button class="win11-btn secondary small" style="border: 1px solid var(--accent-color); color: var(--accent-color);" 
                            onclick="showInstruction('${instKey}')">
                            How to Install?
                        </button>
                    `;
                }

                links.forEach(l => {
                    buttonsHtml += `
                            <a href="${l.url}" target="_blank" style="text-decoration:none;">
                                <button class="win11-btn primary small">${l.label}</button>
                            </a>
                        `;
                });

                row.innerHTML = `
                        <div style="font-weight: 500; font-size: 14px;">${item.filename}</div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            ${instructionHtml}
                            ${buttonsHtml}
                        </div>
                    `;
                downloadList.appendChild(row);
            });

            downloadWindow.style.display = 'flex';
        });
    }

    // Instruction Helper
    window.showInstruction = (key) => {
        const data = (window.instructionData || {})[key];
        if (!data) return;

        const modal = document.getElementById('instruction-modal');
        const title = document.getElementById('inst-title');
        const content = document.getElementById('inst-content');

        title.innerText = data.name;
        content.innerText = data.text;
        modal.style.display = 'flex';
    };

    window.closeInstruction = () => {
        document.getElementById('instruction-modal').style.display = 'none';
    };

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            downloadWindow.style.display = 'none';
        });
    });

    // Copy Password Logic
    const copyPassBtn = document.getElementById('copy-pass-btn-win');
    if (copyPassBtn) {
        copyPassBtn.addEventListener('click', () => {
            navigator.clipboard.writeText('EDITINGSTUFF').then(() => {
                const originalIcon = copyPassBtn.innerHTML;
                copyPassBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => {
                    copyPassBtn.innerHTML = originalIcon;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }
    // Window Management Logic
    const windowEl = document.querySelector('.win11-window');
    const minBtn = document.querySelector('.control-btn.minimize');
    const maxBtn = document.querySelector('.control-btn.maximize');
    const closeBtn = document.querySelector('.control-btn.close');
    const taskbar = document.getElementById('win-taskbar');
    const restoreBtn = document.getElementById('restore-win-btn');

    if (minBtn) {
        minBtn.addEventListener('click', () => {
            windowEl.classList.add('minimized');
            taskbar.classList.add('active');
            // Hide any open modals to prevent floating modals while minimized
            downloadWindow.style.display = 'none';
            document.getElementById('instruction-modal').style.display = 'none';
        });
    }

    if (maxBtn) {
        maxBtn.addEventListener('click', () => {
            windowEl.classList.toggle('maximized');
            // Update icon if wanted
            const icon = maxBtn.querySelector('i');
            if (windowEl.classList.contains('maximized')) {
                icon.className = 'fa-regular fa-clone'; // Multitasking/Restore icon
            } else {
                icon.className = 'fa-regular fa-square';
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            location.href = 'index.html';
        });
    }

    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            windowEl.classList.remove('minimized');
            taskbar.classList.remove('active');
        });
    }
});
