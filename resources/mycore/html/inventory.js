/**
 * ============================================================
 * INVENTORY SYSTEM - LOGIC
 * ============================================================
 */

let invOpen = false;
let currentWeight = 0;
let maxWeight = 30.0;

window.addEventListener('message', function(event) {
    let d = event.data;

    if (d.action === "toggleInventory") {
        if (d.state) {
            openInventoryUI(d);
        } else {
            closeInventoryUI();
        }
    } else if (d.action === "updateInventory") {
        updateInventoryUI(d);
    }
});

function openInventoryUI(data) {
    invOpen = true;
    
    // Schließe andere UIs
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('identity-screen').style.display = 'none';
    document.getElementById('creator-screen').style.display = 'none';
    document.getElementById('admin-menu').style.display = 'none';
    // Weitere hinzufügen, falls nötig
    
    // Zeige den Hauptcontainer (aus style.css) und das Inventar
    document.getElementById('container').style.display = 'flex';
    document.getElementById('inventory-container').style.display = 'flex';
    
    currentWeight = data.currentWeight || 0;
    maxWeight = data.maxWeight || 30.0;
    
    updateWeightUI();
    setupInventoryGridUI(data.items || [], data.maxSlots || 25);
}

function updateWeightUI() {
    const bar = document.getElementById('weight-bar');
    const label = document.getElementById('weight-label');
    if (bar && label) {
        let percent = (currentWeight / maxWeight) * 100;
        bar.style.width = percent + "%";
        label.innerText = currentWeight.toFixed(1) + " / " + maxWeight.toFixed(1) + " KG";
    }
}

function setupInventoryGridUI(items, maxSlots) {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 1; i <= maxSlots; i++) {
        let slot = document.createElement('div');
        slot.className = 'slot inv-slot';
        slot.id = 'inv-slot-' + i;
        slot.setAttribute('data-slot', i);

        // Suche Item für diesen Slot
        let item = items.find(it => it.slot === i);
        if (item) {
            slot.innerHTML = `<img src="img/items/${item.name}.png" class="item-img" title="${item.label}" draggable="true" data-item="${JSON.stringify(item)}">`;
            let img = slot.querySelector('.item-img');
            img.addEventListener('dragstart', handleDragStart);
        }

        // Drop Events für alle Slots
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);

        grid.appendChild(slot);
    }

    // Equip Slots und Quick Slots auch droppable machen
    const equipSlots = document.querySelectorAll('.equip-slot');
    equipSlots.forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        // Klick zum Equippen/Dequippen
        slot.addEventListener('click', handleEquipClick);
    });

    const quickSlots = document.querySelectorAll('.q-slot');
    quickSlots.forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
    });
}

function updateInventoryUI(data) {
    currentWeight = data.currentWeight || 0;
    maxWeight = data.maxWeight || 30.0;
    updateWeightUI();
    setupInventoryGridUI(data.items || [], data.maxSlots || 25);
}

function closeInventoryUI() {
    invOpen = false;
    document.getElementById('inventory-container').style.display = 'none';
    document.getElementById('container').style.display = 'none';  // Immer schließen, da keine anderen Menüs

    // Fetch entfernt, um Loop zu vermeiden
}

// ==========================================
// DRAG & DROP FUNKTIONEN
// ==========================================
let draggedItem = null;

// ESC für Schließen
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && invOpen) {
        fetch(`https://${GetParentResourceName()}/closeInventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
    }
});

function handleDragStart(e) {
    draggedItem = JSON.parse(e.target.getAttribute('data-item'));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleEquipClick(e) {
    const slot = e.currentTarget;
    const slotType = slot.getAttribute('data-type');
    
    // Wenn es ein Waffen-Slot ist und eine Waffe drin ist, equippe/dequippe sie
    if (slotType === 'weapon') {
        const itemImg = slot.querySelector('.item-img');
        if (itemImg) {
            const item = JSON.parse(itemImg.getAttribute('data-item'));
            equipWeapon(item, !slot.classList.contains('equipped'));
        }
    }
}

function equipWeapon(item, equip) {
    fetch(`https://${GetParentResourceName()}/equipWeapon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            item: item,
            equip: equip
        })
    }).then(response => {
        if (response.ok) {
            // UI aktualisieren
            const weaponSlot = document.getElementById('slot-weapon');
            if (equip) {
                weaponSlot.classList.add('equipped');
            } else {
                weaponSlot.classList.remove('equipped');
            }
        }
    });
}
