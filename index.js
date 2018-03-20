let request = require('request-promise-native'),
    discord = require('discord.js'),
    path = require('path'),
    fs = require('fs'),
    config,
    cache

// Path to the known freeleech cache.
let cachepath = path.join(__dirname, 'cache.json')

// Formatting function to convert a byte Number to String.
function formatBytes(bytes){
  if (bytes === 0){
    return '0 B'
  }

  let k = 1024
  let sizes = [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB' ]
  let i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

try {
  // Load user configuration.
  config = require('./config.json')
} catch (err){
  if (err.message.includes('Cannot find module')){
    console.error('Please create a config.json from the example config.')
  }

  if (err.message.includes('Unexpected')){
    console.error(err)
  }

  process.exit()
}

try {
  // Load known freeleech cache.
  cache = require('./cache.json')

  if (!cache.freeleech){
    cache.freeleech = [ ]
  }
} catch (err){
  if (err.message.includes('Cannot find module')){
    cache = {
      freeleech: [ ]
    }
  } else {
    console.error(err)
    process.exit()
  }
}

// Run remainder of script within an asynchronous function to make use of async/wait.
(async () => {
  // Remember cookie credentials between request AJAX calls.
  request = request.defaults({
    jar: true
  })

  let req

  try {
    // Attempt to log into PassThePopcorn.
    req = await request({
      method: 'POST',
      uri: 'https://passthepopcorn.me/ajax.php?action=login',
      form: {
        username: config.username,
        password: config.password,
        passkey: config.passkey,
        keeplogged: '0',
        login: 'Login!'
      },
      resolveWithFullResponse: true
    })
  } catch (err){
    console.error('PTP login failed!')
    console.error(err)

    process.exit()
  }

  let webhook

  if (config.discord){
    // Attempt to log into Discord if a webhook URI is available.
    try {
      req = await request({
        method: 'GET',
        uri: config.discord,
        resolveWithFullResponse: true
      })
    } catch (err){
      console.error('Discord webhook login failed!')
      console.error(err)

      process.exit()
    }

    let data = JSON.parse(req.body)
    webhook = new discord.WebhookClient(data.id, data.token)
  }

  try {
    // Attempt to request current freeleech torrent information from PassThePopcorn.
    req = await request({
      method: 'GET',
      uri: 'https://passthepopcorn.me/torrents.php?freetorrent=1&grouping=0&json=noredirect',
      resolveWithFullResponse: true
    })
  } catch (err){
    console.error('PTP request failed!')
    console.error(err)

    process.exit()
  }

  // Parse requested freeleech information into JSON.
  let data = JSON.parse(req.body)

  let authkey = data.AuthKey
  let passkey = data.PassKey

  // Loop & interate between all freeleech torrents available.
  for (let group of data.Movies){
    let torrent = group.Torrents[0]

    // Parse torrent seeder, leecher, and size information.
    let seeders = Number(torrent.Seeders)
    let leechers = Number(torrent.Leechers)
    let size = Number(torrent.Size)

    // Parse user seeder configuration.
    let minseeders = Number(config.minseeders)
    let maxseeders = Number(config.maxseeders)

    // Parse user leecher configuration.
    let minleechers = Number(config.minleechers)
    let maxleechers = Number(config.maxleechers)

    // Parse user size configuration.
    let minsize = Number(config.minsize) * 1024 * 1024
    let maxsize = Number(config.maxsize) * 1024 * 1024

    // Create download & permalink URLs for later use.
    let download = `https://passthepopcorn.me/torrents.php?action=download&id=${torrent.Id}&authkey=${authkey}&torrent_pass=${passkey}`
    let permalink = `https://passthepopcorn.me/torrents.php?id=${group.GroupId}&torrentid=${torrent.Id}`

    // Check if torrent is already within the known freeleech cache.
    if (!cache.freeleech.includes(torrent.Id)){
      // Run a series of checks based on user configuration.
      if (minseeders === -1 || seeders >= minseeders){
        if (maxseeders === -1 || seeders <= maxseeders){
          if (minleechers === -1 || leechers >= minleechers){
            if (maxleechers === -1 || leechers <= maxleechers){
              if (minsize === -1 || size >= minsize){
                if (maxsize === -1 || size <= maxsize){

                  // If discord webhook URI is present, log to Discord using an embed.
                  if (config.discord){
                    webhook.send(
                      new discord.RichEmbed()
                        .attachFile(new discord.Attachment(group.Cover, 'file.jpg'))
                        .setAuthor('Freeleech Torrent', 'https://i.imgur.com/vBKpag5.png')
                        .setDescription(group.Title)
                        .setThumbnail('attachment://file.jpg')
                        .addField('Source', torrent.Source, true)
                        .addField('Codec', torrent.Codec, true)
                        .addField('Resolution', torrent.Resolution, true)
                        .addField('Size', formatBytes(torrent.Size), true)
                        .addField('Seeders', torrent.Seeders, true)
                        .addField('Leechers', torrent.Leechers, true)
                        .addField('Torrent Permalink', `[Click Here](${permalink})`, true)
                        .addField('Download URL', `[Click Here](${download})`, true)
                    )
                  }

                  // If autodownload path is present, download torrent to specified path.
                  if (config.autodownload){
                    if (fs.existsSync(config.autodownload)){
                      try {
                        req = await request({
                          method: 'GET',
                          uri: download,
                          resolveWithFullResponse: true
                        })
                      } catch (err){
                        console.error('autodownload: The download request failed.')
                        console.error(err)
                      }

                      // Retrieve filename from existing response headers.
                      let filename = req.headers['content-disposition'].split('filename=')[1].replace(/\"/g, '')

                      try {
                        // Convert stream callbacks to a Promise for use with async/await.
                        await new Promise((resolve, reject) => {
                          let res = require('request')(download)
                          let write = fs.createWriteStream(path.join(config.autodownload, filename))

                          write.on('error', reject)

                          res.on('error', reject)
                          res.on('end', resolve)

                          // Write response information to file.
                          res.pipe(write)
                        })
                      } catch (err){
                        console.error('autodownload: Could not write torrent file to path.')
                        console.error(err)
                      }
                    } else {
                      config.autodownload = ''
                      console.error('autodownload: Invalid path provided.')
                    }
                  }

                  // Add torrent ID to known freeleech cache.
                  cache.freeleech.push(torrent.Id)

                  // Log torrent permalink & download URL to the console.
                  console.log(
`
Torrent Permalink: ${permalink}
Torrent Download: ${download}`
                  )
                }
              }
            }
          }
        }
      }
    }
  }

  try {
    // After running the script, attempt to write the known freeleech cache to the cache file.
    fs.writeFileSync(cachepath, JSON.stringify({
      freeleech: cache.freeleech
    }, null, '  '), {
      encoding: 'utf8'
    })
  } catch (err){
    console.error('cache: Unable to update the known freeleech cache.')
    console.error(err)
  }
})()
