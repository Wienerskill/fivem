fx_version 'cerulean'
game 'gta5'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'html/inventory.js',
    'html/inventory.css',
    'html/img/silhouette.png' -- Vergiss das Bild nicht!
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/main.lua'
}

client_scripts {
    'client/main.lua',
    'client/creator.lua',
    'client/admin.lua'
}
