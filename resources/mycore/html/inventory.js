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
    }
});

function openInventoryUI(data) {
    invOpen = true;
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
            slot.innerHTML = `<img src="img/items/${item.name}.png" class="item-img" title="${item.label}">`;
            // Drag-Events kommen hier später rein
        }

        grid.appendChild(slot);
    }
}

function closeInventoryUI() {
    invOpen = false;
    document.getElementById('inventory-container').style.display = 'none';
    
    // Nur den Hauptcontainer schließen, wenn keine anderen Menüs offen sind
    // (Diese Variablen kommen aus deiner script.js)
    if (typeof adminMenuOpen !== 'undefined' && !adminMenuOpen && !playerAdminOpen) {
        document.getElementById('container').style.display = 'none';
    }

    fetch(`https://${GetParentResourceName()}/closeInventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
}

// Globaler Key Listener für F2 (Zusätzlich zu script.js)
window.addEventListener('keydown', function(e) {
    if (e.key === "F2" || e.key === "Escape") {
        if (invOpen) {
            closeInventoryUI();
        }
    }
});
