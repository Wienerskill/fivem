local godmode = false
local noclip = false
local adminMenuOpen = false

-- ==========================================
-- F11 SPIELER VERWALTUNG (TARGET ADMIN)
-- ==========================================
RegisterCommand('playeradmin', function()
    -- Debug-Print für die F8 Konsole
    print("^3[Admin]^7 F11 gedrueckt - Fordere Spielerliste an...")
    
    -- Wir oeffnen das UI sofort (Sichtbarkeit auf 'block' via JavaScript)
    SetNuiFocus(true, true)
    SendNUIMessage({ action = "openPlayerAdmin", players = {} }) 
    
    -- Daten vom Server abrufen
    TriggerServerEvent('core:requestPlayerList')
end, false)

RegisterKeyMapping('playeradmin', 'Spieler Verwaltung', 'keyboard', 'F11')

RegisterNetEvent('core:receivePlayerList', function(players)
    -- KORREKTUR: Hier darf NUR "updatePlayerList" stehen,
    -- damit das Menü im Hintergrund aktualisiert wird, ohne aufzuploppen!
    SendNUIMessage({ action = "updatePlayerList", players = players })
end)

-- ==========================================
-- F10 ADMIN MENÜ (SELF ADMIN)
-- ==========================================
RegisterCommand('adminmenu', function()
    adminMenuOpen = not adminMenuOpen
    
    if adminMenuOpen then
        SetNuiFocus(true, false)
        SetNuiFocusKeepInput(true)
    else
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
    end
    
    SendNUIMessage({ action = "toggleAdminMenu", state = adminMenuOpen })
end, false)

RegisterKeyMapping('adminmenu', 'Admin Panel oeffnen', 'keyboard', 'F10')

-- Noclip Schleife
CreateThread(function()
    while true do
        Wait(0)
        if noclip then
            local ped = PlayerPedId()
            local x,y,z = table.unpack(GetEntityCoords(ped))
            local dx,dy,dz = GetCamDirection()
            local speed = 0.5
            
            if IsControlPressed(0, 32) then -- W
                x = x + (dx * speed)
                y = y + (dy * speed)
                z = z + (dz * speed)
            end
            if IsControlPressed(0, 33) then -- S
                x = x - (dx * speed)
                y = y - (dy * speed)
                z = z - (dz * speed)
            end
            
            SetEntityCoordsNoOffset(ped, x, y, z, true, true, true)
        else
            Wait(500)
        end
    end
end)

RegisterNUICallback('adminAction', function(data, cb)
    local ped = PlayerPedId()
    
    if data.action == "godmode" then
        godmode = not godmode
        SetPlayerInvincible(PlayerId(), godmode)
        SendNUIMessage({ action = "updateAdminStatus", type = "godmode", status = godmode })
    elseif data.action == "noclip" then
        noclip = not noclip
        FreezeEntityPosition(ped, noclip)
        SetEntityCollision(ped, not noclip, not noclip)
        SetEntityVisible(ped, not noclip, false)
        SendNUIMessage({ action = "updateAdminStatus", type = "noclip", status = noclip })
    elseif data.action == "heal" or data.action == "armor" or data.action == "revive" then
        -- Selbstheilung via Server, um die F11-Liste für alle Admins synchron zu halten
        TriggerServerEvent('core:adminActionOnTarget', GetPlayerServerId(PlayerId()), data.action)
    end
    cb('ok')
end)

RegisterNUICallback('adminTargetAction', function(data, cb)
    TriggerServerEvent('core:adminActionOnTarget', data.target, data.action)
    cb('ok')
end)

-- AUSFÜHRUNG DER AKTIONEN
RegisterNetEvent('core:executeTargetAction')
AddEventHandler('core:executeTargetAction', function(action)
    local ped = PlayerPedId()
    
    if action == "heal" then
        SetEntityHealth(ped, 200)
    elseif action == "armor" then
        SetPedArmour(ped, 100)
    elseif action == "revive" then
        local coords = GetEntityCoords(ped)
        NetworkResurrectLocalPlayer(coords.x, coords.y, coords.z, GetEntityHeading(ped), true, false)
        SetEntityHealth(ped, 200)
        ClearPedBloodDamage(ped)
    elseif action == "freeze" then
        FreezeEntityPosition(ped, not IsEntityPositionFrozen(ped))
    end
end)

RegisterNUICallback('closeAdminMenu', function(data, cb)
    adminMenuOpen = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false) 
    cb('ok')
end)

function GetCamDirection()
    local heading = GetGameplayCamRelativeHeading() + GetEntityHeading(PlayerPedId())
    local pitch = GetGameplayCamRelativePitch()
    local x = -math.sin(heading * math.pi / 180.0)
    local y = math.cos(heading * math.pi / 180.0)
    local z = math.sin(pitch * math.pi / 180.0)
    local len = math.sqrt(x * x + y * y + z * z)
    if len ~= 0 then x = x / len y = y / len z = z / len end
    return x, y, z
end
