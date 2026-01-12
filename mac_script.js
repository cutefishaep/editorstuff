document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
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

    // Fetch data from list_mac.json and list_presets.json
    Promise.all([
        fetch('list_mac.json').then(res => res.json()),
        fetch('list_presets.json').then(res => res.json())
    ])
        .then(([macData, presetData]) => {
            // Filter out any presets that might still be in the mac list (just in case)
            const filteredMac = macData.filter(item => item.category !== 'PRESET');
            softwareList = [...filteredMac, ...presetData].map(item => ({ ...item, selected: false }));
            renderList();
        })
        .catch(error => console.error('Error loading lists:', error));

    function renderList() {
        listContainer.innerHTML = '';
        const isPreset = currentCategory === 'PRESET' && !searchQuery;

        // Update headers in mac.html dynamically
        const listHeader = document.querySelector('.list-header');
        if (isPreset) {
            listHeader.innerHTML = `
                <div class="col-checkbox"><input type="checkbox" id="select-all"></div>
                <div class="col-name">Name</div>
                <div class="col-os">Min (AE)</div>
                <div class="col-size">Format</div>
            `;
        } else {
            listHeader.innerHTML = `
                <div class="col-checkbox"><input type="checkbox" id="select-all"></div>
                <div class="col-name">Name</div>
                <div class="col-os">Min OS</div>
                <div class="col-size">Size</div>
            `;
        }

        const filteredList = softwareList.filter(item => {
            if (searchQuery) {
                return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                return item.category === currentCategory;
            }
        });

        // Re-bind Select All logic every time header is rendered
        const selectAllBtn = document.getElementById('select-all');
        if (selectAllBtn) {
            const allSelected = filteredList.length > 0 && filteredList.every(i => i.selected);
            selectAllBtn.checked = allSelected;
            const someSelected = filteredList.some(i => i.selected);
            selectAllBtn.indeterminate = someSelected && !allSelected;

            selectAllBtn.onchange = (e) => {
                const isChecked = e.target.checked;
                filteredList.forEach(item => item.selected = isChecked);
                renderList();
            };
        }

        filteredList.forEach((item) => {
            const row = document.createElement('div');
            row.className = `list-row ${item.selected ? 'selected' : ''}`;

            row.innerHTML = `
                <div class="col-checkbox">
                    <input type="checkbox" class="item-checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}>
                </div>
                <div class="col-name">${item.filename}</div>
                <div class="col-os">${isPreset ? item.os_min : getOsDisplay(item.os_min)}</div>
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
        renderList(); // Re-render to update Select All state and row highlights
    }

    function updateSummary() {
        const count = softwareList.filter(i => i.selected).length;
        selectedCountSpan.textContent = count;
    }

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
    const downloadOverlay = document.getElementById('download-overlay');
    const downloadList = document.getElementById('download-list');
    const closeDownloadBtn = document.getElementById('close-download-btn');
    const closeDownloadX = document.getElementById('close-download-x');

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

                let buttonsHtml = '';
                const links = [];

                Object.keys(item).forEach(key => {
                    if (/^link\d+$/.test(key)) {
                        const num = key.replace('link', '');
                        links.push({ url: item[key], label: `Mirror ${num}` });
                    }
                });

                if (links.length === 0 && item.link) {
                    links.push({ url: item.link, label: 'Mirror 1' });
                }

                links.sort((a, b) => {
                    const numA = parseInt(a.label.replace('Mirror ', ''));
                    const numB = parseInt(b.label.replace('Mirror ', ''));
                    return numA - numB;
                });

                links.forEach(l => {
                    buttonsHtml += `
                            <a href="${l.url}" target="_blank" style="text-decoration:none;">
                                <button class="btn-primary d-btn" style="min-width: auto; padding: 4px 12px;">${l.label}</button>
                            </a>
                        `;
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
                        <button class="btn-secondary d-btn" style="border-color: var(--accent-color); color: var(--accent-color);" 
                            onclick="showInstruction('${instKey}')">
                            How to Install?
                        </button>
                    `;
                }

                itemDiv.innerHTML = `
                        <div class="d-name">${item.filename}</div>
                        <div style="display:flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; align-items: center;">
                            ${instructionHtml}
                            ${buttonsHtml}
                        </div>
                    `;
                downloadList.appendChild(itemDiv);
            });

            // Show Overlay (Modal) - Do not hide main window
            if (downloadOverlay) downloadOverlay.style.display = 'flex';
        });
    }

    // Close Modal Logic
    function closeModal() {
        if (downloadOverlay) downloadOverlay.style.display = 'none';
    }

    if (closeDownloadBtn) {
        closeDownloadBtn.addEventListener('click', closeModal);
    }

    if (closeDownloadX) {
        closeDownloadX.style.cursor = 'pointer';
        closeDownloadX.addEventListener('click', closeModal);
    }

    // Copy Password Logic
    const copyPassBtn = document.getElementById('copy-pass-btn-mac');
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

    // Instruction Helper
    window.showInstruction = (key) => {
        const data = (window.instructionData || {})[key];
        if (!data) return;

        const overlay = document.getElementById('instruction-overlay');
        const title = document.getElementById('mac-inst-title');
        const content = document.getElementById('mac-inst-content');

        title.innerText = data.name;
        content.innerText = data.text;
        overlay.style.display = 'flex';
    };

    window.closeInstruction = () => {
        document.getElementById('instruction-overlay').style.display = 'none';
    };
    // Window Management Logic
    const windowEl = document.querySelector('.window-container');
    const redLight = document.querySelector('.traffic-lights .light.red');
    const yellowLight = document.querySelector('.traffic-lights .light.yellow');
    const greenLightTraffic = document.querySelector('.traffic-lights .light.green');
    const dock = document.getElementById('mac-dock');
    const restoreBtnMac = document.getElementById('restore-mac-btn');

    if (redLight) {
        redLight.style.cursor = 'pointer';
        redLight.addEventListener('click', () => {
            location.href = 'index.html';
        });
    }

    if (yellowLight) {
        yellowLight.style.cursor = 'pointer';
        yellowLight.addEventListener('click', () => {
            windowEl.classList.add('minimized');
            dock.classList.add('active');
            // Hide overlays
            if (downloadOverlay) downloadOverlay.style.display = 'none';
            document.getElementById('instruction-overlay').style.display = 'none';
        });
    }

    if (greenLightTraffic) {
        greenLightTraffic.style.cursor = 'pointer';
        greenLightTraffic.addEventListener('click', () => {
            windowEl.classList.toggle('maximized');
        });
    }

    if (restoreBtnMac) {
        restoreBtnMac.addEventListener('click', () => {
            windowEl.classList.remove('minimized');
            dock.classList.remove('active');
        });
    }
});
