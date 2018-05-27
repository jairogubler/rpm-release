var fs = require('fs')
var lodash = require("lodash")
var csv = require('fast-csv')
var releases = null
var readdirp = require('readdirp');
var path = require('path')

async function readReleases(fileName) {
  return new Promise(resolve => {
    const stream = fs.createReadStream(fileName, { encoding: 'utf8' });
    var csvStream = csv()
      .on("data", function (data) {
        var r = lodash.filter(releases, { 'id': data[0] });
        if (r.length === 0) {
          releases.push({ 'id': data[0], 'descricao': data[1] })
        }
        else
          r.descricao = data[1];

        console.log(data)
      })
      .on("end", function () {
        resolve();
      });
    stream.pipe(csvStream);
  })
}

async function readReleaseInfo(id, versao) {
  return new Promise((resolve) => {
    var pacotesGrp = {}
    var idx;

    for (idx = 0; idx < versao.grupos.length; idx++) {
      var grp = versao.grupos[idx];
      pacotesGrp[grp.grupo] = [];
      grp.pacotes = pacotesGrp[grp.grupo];
    }

    var fileName = 'ReleaseInfo/' + id + '/ReleasePacotes-' + id + '-' + versao.versao
    const stream = fs.createReadStream(fileName, { encoding: 'utf8' });
    var csvStream = csv()
      .on("data", function (data) {
        var pacote = data[0]
        var gruposPacote = data[1].split(';');
        var idx
        for (idx = 0; idx < gruposPacote.length; idx++) {
          var grp = 'digitro-' + id + '-' + gruposPacote[idx]
          if (pacotesGrp[grp]) {
            pacotesGrp[grp].push(pacote);
          }
        }
      })
      .on("end", function () {
        resolve();
      })
    stream.on('error', function (error) {
      resolve();
    });
    stream.pipe(csvStream);
  })
}


async function readRPMFiles(dir) {
  return new Promise((resolve) => {
    var settings = {
      root: dir,
      fileFilter: ['*.rpm']
    };

    var allFilePaths = [];

    readdirp(settings,
      function (fileInfo) {
        allFilePaths.push(
          fileInfo.fullPath
        );
      },

      function (err, res) {
        if (err) {
          return resolve([])
        }

        var dirs = {}
        allFilePaths.forEach(function (fileName) {
          var basename = path.basename(fileName);
          var dirname = path.dirname(fileName)
          var idx = dirname.indexOf(settings.root)
          dirname = dirname.substring(idx + settings.root.length)
          if (!dirs[dirname]) {
            dirs[dirname] = []
          }
          dirs[dirname].push(basename);
        });
        var resultado = []
        Object.keys(dirs).forEach(function (dir) {
          resultado.push({ 'dir': dir, 'files': dirs[dir] })
        })
        resolve(resultado);
      }
    )
  })
}



async function readReleaseInfoFiles(id, versao) {
    var dirName = 'dir/' + id + '/' + versao.versao + '/'
    var fileNames = await readRPMFiles(dirName)
    versao.files = fileNames;
}


async function readInfoReleaseVersao(release) {
  for (const versao of release.versoes) {
    await readReleaseInfo(release.id, versao)
    await readReleaseInfoFiles(release.id, versao);
  }
}

async function readReleasesInfoFull() {
  for (const release of releases) {
    await readInfoReleaseVersao(release)
  }
}

function readReleasesVersao(fileName) {
  return new Promise(resolve => {
    const stream = fs.createReadStream(fileName, { encoding: 'utf8' });
    var csvStream = csv()
      .on("data", function (data) {
        console.log(data)
        var r = lodash.filter(releases, { 'id': data[0] });
        if (r.length === 1) {
          var release = r[0]
          if (release.versoes === undefined) {
            release.versoes = []
          }

          var grupos = data[3].split(';')
          var versoes = lodash.filter(release.versoes, { 'versao': data[1] });
          if (versoes.length === 0 && grupos !== null) {
            var releaseVersao = { 'versao': data[1], 'grupos': [] }
            var idx
            for (idx = 0; idx < grupos.length; idx++) {
              releaseVersao.grupos.push({ 'grupo': grupos[idx], 'pacotes': [] })
            }
            release.versoes.push(releaseVersao)
          }
        }
      })
      .on("end", function () {
        resolve();
      });
    stream.pipe(csvStream);
  })
}

async function loadData() {
  releases = require('./rpm-releases.json')
  await readReleases('Releases')
  await readReleasesVersao('ReleasesVersao')
  await readReleasesInfoFull()
  console.log(JSON.stringify(releases, null, 2))
}

loadData();


function save() {
  fs.writeFile('rpm-releases.json', JSON.stringify(releases, null, 2), 'utf8', () => { });
}

/**
 * Lista Releases
 */
exports.list = (req, h) => {
  return releases.map(a => a.id);
}

/**
 * GET
 */
exports.get = (req, h) => {
  var r = lodash.filter(releases, { 'id': req.params.id });
  if (r.length > 0) {
    return r[0]
  }
  return {};
}


/**
 * POST 
 */
exports.create = (req, h) => {
  console.log(req.payload);
  releases.push({ "id": req.payload.id, "descricao": req.payload.descricao });
  console.log(JSON.stringify(releases));
  save();
  return { message: "Release adicionada" }
}

/**
 * PUT 
 */
exports.update = (req, h) => {
  var release = lodash.filter(releases, { 'id': req.params.id });
  if (release) {
    release.id = req.payload.id;
    release.descricao = req.payload.descricao;
    save();
  }
  return { message: "Release alterada" }
}

/**
 * Delete 
 */
exports.remove = (req, h) => {
  var idx
  for (idx = 0; idx < releases.length; idx++) {
    if (releases[idx].id === req.params.id) {
      releases.splice(idx, 1)
      save();
      return { message: "Release excluida" }
    }
  }
  return { message: "Release nao encontrada" }
}
