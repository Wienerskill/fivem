// ==========================================
// GLOBALE VARIABLEN
// ==========================================
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

let adminMenuOpen = false;
let playerAdminOpen = false;
let currentIdx = 0;
let selectedTargetSrc = null;

let allPlayers = []; 

const MAX_DASH = 100.53; 
const CIRCUMFERENCE = 125.66;

// ==========================================
// 1. HAUPT-LISTENER (NACHRICHTEN VOM SPIEL)
// ==========================================
window.addEventListener('message', function(event) {
    let d = event.data;

    // CONTAINER SICHTBARKEIT HERSTELLEN (FÜR F11)
    if (d.action === "openSelection" || d.action === "openCreator" || d.action === "openPlayerAdmin") {
        document.getElementById('container').style.display = 'flex';
    }

    if (d.action === "openSelection") {
        hideAll();
        document.getElementById('selection-screen').style.display = 'block';
        setupSlots(d.chars, d.maxChars);
    } 
    
    if (d.action === "openCreator") {
        hideAll();
        document.getElementById('creator-screen').style.display = 'block';
    } 

    if (d.action === "updateLimits") {
        if (d.limits['face']) {
            document.getElementById('face-slider').max = d.limits['face'] - 1;
        }
        if (d.limits['hair']) {
            document.getElementById('hair-slider').max = d.limits['hair'] - 1;
        }
        if (d.limits['hat']) {
            document.getElementById('hat-slider').max = d.limits['hat'] - 1;
        }
        if (d.limits['mask']) {
            document.getElementById('mask-slider').max = d.limits['mask'] - 1;
        }
        if (d.limits['tshirt']) {
            document.getElementById('tshirt-slider').max = d.limits['tshirt'] - 1;
        }
        if (d.limits['undershirt']) {
            document.getElementById('undershirt-slider').max = d.limits['undershirt'] - 1;
        }
        if (d.limits['arms']) {
            document.getElementById('arms-slider').max = d.limits['arms'] - 1;
        }
        if (d.limits['pants']) {
            document.getElementById('pants-slider').max = d.limits['pants'] - 1;
        }
        if (d.limits['shoes']) {
            document.getElementById('shoes-slider').max = d.limits['shoes'] - 1;
        }
    }

    if (d.action === "updateHUD") {
        document.getElementById('hud-screen').style.display = 'flex';
        let healthVal = (d.health / 100) * MAX_DASH;
        let armorVal = (d.armor / 100) * MAX_DASH;

        let hBar = document.getElementById('hud-health');
        if (hBar) {
            hBar.style.strokeDasharray = healthVal + ", " + CIRCUMFERENCE;
        }

        let aBar = document.getElementById('hud-armor');
        if (aBar) {
            aBar.style.strokeDasharray = armorVal + ", " + CIRCUMFERENCE;
        }

        let fBar = document.getElementById('hud-food');
        if (fBar) {
            fBar.style.strokeDasharray = MAX_DASH + ", " + CIRCUMFERENCE;
        }

        let wBar = document.getElementById('hud-water');
        if (wBar) {
            wBar.style.strokeDasharray = MAX_DASH + ", " + CIRCUMFERENCE;
        }
    }

    if (d.action === "toggleAdminMenu") {
        adminMenuOpen = d.state;
        let menu = document.getElementById('admin-menu');
        if (adminMenuOpen) {
            menu.style.display = 'block';
            currentIdx = 0;
            updateMenuSelection();
        } else {
            menu.style.display = 'none';
        }
    }

    if (d.action === "updateAdminStatus") {
        let statusElement = document.getElementById(d.type + '-status');
        if (statusElement) {
            if (d.status) {
                statusElement.innerText = "AN";
            } else {
                statusElement.innerText = "AUS";
            }
        }
    }

    if (d.action === "openPlayerAdmin" || d.action === "updatePlayerList") {
        allPlayers = d.players;
        playerAdminOpen = true;
        hideAll();
        document.getElementById('player-admin-screen').style.display = 'block';
        filterPlayers(); 
    }
});

// ==========================================
// 2. TASTEN- & MAUS-STEUERUNG
// ==========================================
window.addEventListener('keydown', function(event) {
    if (adminMenuOpen) {
        const items = document.querySelectorAll('#admin-menu .menu-item');
        if (event.key === "ArrowDown") {
            items[currentIdx].classList.remove('active');
            currentIdx = (currentIdx + 1) % items.length;
            items[currentIdx].classList.add('active');
        } else if (event.key === "ArrowUp") {
            items[currentIdx].classList.remove('active');
            currentIdx = (currentIdx - 1 + items.length) % items.length;
            items[currentIdx].classList.add('active');
        } else if (event.key === "Enter") {
            let action = items[currentIdx].getAttribute('data-action');
            fetch(`https://${GetParentResourceName()}/adminAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action })
            });
        }
    }

    if (event.key === "Escape" || event.key === "F10" || event.key === "F11") {
        if (adminMenuOpen) closeAdminMenu();
        if (playerAdminOpen) closePlayerAdmin();
        
        let ctx = document.getElementById('context-menu');
        if (ctx) {
            ctx.style.display = 'none';
        }
    }
});

document.addEventListener('click', function(e) {
    let ctx = document.getElementById('context-menu');
    if (ctx) {
        ctx.style.display = 'none';
    }
});

document.addEventListener('mousedown', function(event) {
    if (event.target.id === "container") {
        isDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});

document.addEventListener('mouseup', function() {
    isDragging = false;
});

document.addEventListener('mousemove', function(event) {
    if (isDragging) {
        let deltaX = event.clientX - lastMouseX;
        let deltaY = event.clientY - lastMouseY;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        fetch(`https://${GetParentResourceName()}/rotateCam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: deltaX, y: deltaY })
        });
    }
});

// ==========================================
// 3. ADMIN TOOLS LOGIK (GRID & DETAILS)
// ==========================================
function updateMenuSelection() {
    const items = document.querySelectorAll('#admin-menu .menu-item');
    for (let i = 0; i < items.length; i++) {
        if (i === currentIdx) {
            items[i].classList.add('active');
        } else {
            items[i].classList.remove('active');
        }
    }
}

function filterPlayers() {
    let searchVal = document.getElementById('player-search').value.toLowerCase();
    let filtered = allPlayers.filter(p => {
        let fullName = (p.firstname + " " + p.lastname).toLowerCase();
        return p.source.toString().includes(searchVal) || 
               fullName.includes(searchVal) || 
               p.cid.toLowerCase().includes(searchVal);
    });
    renderPlayerGrid(filtered);
}

function renderPlayerGrid(players) {
    const container = document.getElementById('player-grid');
    if (!container) return;
    container.innerHTML = '';

    if (!players || players.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#888; width:100%;">Keine Spieler gefunden...</div>';
        return;
    }

    players.forEach(p => {
        let hp = p.status ? Math.round(p.status.health - 100) : 0;
        if (hp < 0) hp = 0;
        let armor = p.status ? p.status.armor : 0;

        let card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="card-id-badge">ID: ${p.source}</div>
            <div class="card-name">${p.firstname} ${p.lastname}</div>
            <div class="card-cid">CID: ${p.cid}</div>
            <div class="card-bar-mini"><div class="card-bar-fill" style="width:${hp}%; background:#e74c3c;"></div></div>
            <div class="card-bar-mini" style="margin-top:2px;"><div class="card-bar-fill" style="width:${armor}%; background:#3498db;"></div></div>
        `;

        card.onclick = function() {
            openPlayerDetails(p);
        };

        card.oncontextmenu = function(e) {
            e.preventDefault();
            selectedTargetSrc = p.source;
            let ctx = document.getElementById('context-menu');
            ctx.style.display = 'block';
            ctx.style.left = e.pageX + 'px';
            ctx.style.top = e.pageY + 'px';
        };

        container.appendChild(card);
    });
}

function openPlayerDetails(p) {
    selectedTargetSrc = p.source; 

    // Header & Basis Info
    document.getElementById('detail-header').innerText = p.firstname + " " + p.lastname;
    document.getElementById('det-id').innerText = p.source;
    document.getElementById('det-cid').innerText = p.cid;
    
    // --- GEBURTSDATUM LOGIK ---
    // Wir prüfen 'birthdate' (deine Angabe) und konvertieren falls ISO Format (YYYY-MM-DD)
    let rawDate = p.birthdate || p.birthday || p.charinfo?.birthdate || "Unbekannt";
    let formattedDate = rawDate;

    if (rawDate !== "Unbekannt" && rawDate.includes("-")) {
        let parts = rawDate.split("-");
        if (parts.length === 3) {
            // Wandelt 2003-12-29 in 29.12.2003 um
            formattedDate = parts[2] + "." + parts[1] + "." + parts[0];
        }
    }
    document.getElementById('det-birth').innerText = formattedDate;

    // Spielzeit Logik
    let totalSeconds = p.playtime || 0;
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    document.getElementById('det-time').innerText = hours + "h " + minutes + "m";

    if (p.first_join) {
        let dateObj = new Date(p.first_join);
        document.getElementById('det-join').innerText = dateObj.toLocaleDateString('de-DE');
    }

    // Status Bars im Modal
    let hp = p.status ? Math.round(p.status.health - 100) : 0;
    if (hp < 0) hp = 0;
    document.getElementById('det-hp-bar').style.width = hp + "%";
    document.getElementById('det-arm-bar').style.width = (p.status ? p.status.armor : 0) + "%";

    // QUICK ACTIONS BUTTONS INTEGRATION
    let footerBars = document.querySelector('.modal-bars');
    let existingActions = document.getElementById('modal-quick-actions');
    if (!existingActions) {
        let actionDiv = document.createElement('div');
        actionDiv.id = 'modal-quick-actions';
        actionDiv.style = "display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; border-top:1px solid #333; padding-top:20px;";
        actionDiv.innerHTML = `
            <button onclick="triggerAdminAction('heal')" style="flex:1; padding:12px; background:#27ae60; border:none; color:white; cursor:pointer; border-radius:5px; font-weight:bold; font-family:inherit;">HEILEN</button>
            <button onclick="triggerAdminAction('armor')" style="flex:1; padding:12px; background:#2980b9; border:none; color:white; cursor:pointer; border-radius:5px; font-weight:bold; font-family:inherit;">WESTE</button>
            <button onclick="triggerAdminAction('revive')" style="flex:1; padding:12px; background:#e67e22; border:none; color:white; cursor:pointer; border-radius:5px; font-weight:bold; font-family:inherit;">REVIVE</button>
            <button onclick="triggerAdminAction('freeze')" style="flex:1; padding:12px; background:#9b59b6; border:none; color:white; cursor:pointer; border-radius:5px; font-weight:bold; font-family:inherit;">FREEZE</button>
            <button onclick="triggerAdminAction('kick')" style="flex:1.5; padding:12px; background:#c0392b; border:none; color:white; cursor:pointer; border-radius:5px; font-weight:bold; font-family:inherit;">KICKEN</button>
        `;
        footerBars.appendChild(actionDiv);
    }

    document.getElementById('player-detail-modal').style.display = 'flex';
    
    fetch(`https://${GetParentResourceName()}/show3DPed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: p.source })
    });
}

function closeDetailModal() {
    document.getElementById('player-detail-modal').style.display = 'none';
    fetch(`https://${GetParentResourceName()}/hide3DPed`, { method: 'POST' });
}

function triggerAdminAction(actionType) {
    if (!selectedTargetSrc) return;
    fetch(`https://${GetParentResourceName()}/adminTargetAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: parseInt(selectedTargetSrc), action: actionType })
    });
    let ctx = document.getElementById('context-menu');
    if(ctx) ctx.style.display = 'none';
}

function closeAdminMenu() {
    adminMenuOpen = false;
    document.getElementById('admin-menu').style.display = 'none';
    fetch(`https://${GetParentResourceName()}/closeAdminMenu`, { method: 'POST' });
}

function closePlayerAdmin() {
    playerAdminOpen = false;
    document.getElementById('player-admin-screen').style.display = 'none';
    document.getElementById('container').style.display = 'none';
    closeDetailModal();
    fetch(`https://${GetParentResourceName()}/closeAdminMenu`, { method: 'POST' });
}

// ==========================================
// 4. CHARAKTER SYSTEM FUNKTIONEN
// ==========================================
function setupSlots(chars, max) {
    hideAll();
    document.getElementById('selection-screen').style.display = 'block';
    const container = document.getElementById('char-slots');
    container.innerHTML = '';

    for (let i = 0; i < max; i++) {
        let char = chars[i];
        let div = document.createElement('div');
        div.className = 'slot';
        
        if (char) {
            div.innerHTML = `
                <h3 style="margin-top:0; margin-bottom:5px;">${char.firstname} ${char.lastname}</h3>
                <p style="font-size:12px; color:#aaa; margin:0;">CID: ${char.citizenid}</p>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteChar('${char.citizenid}')">LÖSCHEN</button>
            `;
            div.onclick = function() { selectChar(char); };
        } else {
            div.innerHTML = `<h3>LEERER SLOT</h3><p style="font-size:12px; color:#777; margin:0;">Klicken zum Erstellen</p>`;
            div.onclick = function() {
                hideAll();
                document.getElementById('identity-screen').style.display = 'block';
            };
        }
        container.appendChild(div);
    }
}

function submitIdentity() {
    const fname = document.getElementById('firstname').value;
    const lname = document.getElementById('lastname').value;
    const bdate = document.getElementById('birthdate').value;
    if (!fname || !lname || !bdate) return;

    fetch(`https://${GetParentResourceName()}/saveNewCharacter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstname: fname, lastname: lname, birthdate: bdate })
    });
}

function updateGender(g) {
    if (g === 'male') {
        document.getElementById('btn-male').classList.add('active');
        document.getElementById('btn-female').classList.remove('active');
    } else {
        document.getElementById('btn-male').classList.remove('active');
        document.getElementById('btn-female').classList.add('active');
    }
    fetch(`https://${GetParentResourceName()}/updateGender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: g })
    });
}

function sync(type, val) {
    let input = document.getElementById(type + '-num');
    if (input) {
        input.value = val;
    }
    updateSkin(type, val);
}

function changeVal(type, delta) {
    let input = document.getElementById(type + '-num');
    let slider = document.getElementById(type + '-slider');
    let currentVal = parseInt(input.value);
    let newVal = currentVal + delta;
    
    let minLimit = 0;
    if (type === 'hat') { minLimit = -1; }
    if (newVal < minLimit) { newVal = minLimit; }
    
    if (slider && newVal > parseInt(slider.max)) {
        newVal = parseInt(slider.max);
    }

    input.value = newVal;
    if (slider) {
        slider.value = newVal;
    }
    updateSkin(type, newVal);
}

function updateSkin(type, val) {
    fetch(`https://${GetParentResourceName()}/updateSkinPreview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, value: val })
    });
}

function saveDesign() {
    document.getElementById('container').style.display = 'none';
    document.getElementById('hud-screen').style.display = 'flex'; 
    fetch(`https://${GetParentResourceName()}/saveCharacterDesign`, { method: 'POST' });
}

function selectChar(char) {
    document.getElementById('container').style.display = 'none';
    document.getElementById('hud-screen').style.display = 'flex';
    fetch(`https://${GetParentResourceName()}/selectChar`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ char: char }) 
    });
}

function deleteChar(cid) {
    fetch(`https://${GetParentResourceName()}/deleteChar`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizenid: cid }) 
    });
}

function hideAll() {
    let selection = document.getElementById('selection-screen');
    if (selection) { selection.style.display = 'none'; }

    let identity = document.getElementById('identity-screen');
    if (identity) { identity.style.display = 'none'; }

    let creator = document.getElementById('creator-screen');
    if (creator) { creator.style.display = 'none'; }

    let hud = document.getElementById('hud-screen');
    if (hud) { hud.style.display = 'none'; }

    let playerAdmin = document.getElementById('player-admin-screen');
    if (playerAdmin) { playerAdmin.style.display = 'none'; }
}
