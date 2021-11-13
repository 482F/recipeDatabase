#!/usr/bin/env node

function toAsyncCallback(func) {
  return new Promise((resolve, reject) => {
    func((err, result) => {
      if (err) reject(err)
      resolve(result)
    })
  })
}

function createDbProxy(dbFile) {
  const sqlite3 = require('sqlite3')
  return new Proxy(new sqlite3.Database(dbFile), {
    get: function (db, key, receiver) {
      if (['run', 'get', 'all'].includes(key)) {
        return (sql, ...params) =>
          new Promise((resolve, reject) => {
            db[key](sql, ...params, (err, result) => {
              if (err) reject(err)
              resolve(result)
            })
          })
      } else {
        return (...args) => db[key](...args)
      }
    },
  })
}

async function getScriptDirPath() {
  const fs = require('fs')
  const scriptPath = process.argv[1]
  const scriptRealPath = await toAsyncCallback((c) =>
    fs.realpath(scriptPath, c)
  )
  const path = require('path')
  const scriptDirPath = path.dirname(scriptRealPath)
  return scriptDirPath
}

class RecipeDb {
  constructor(dbPath) {
    this._db = createDbProxy(dbPath)
  }
  close() {
    this._db.close()
  }
}

async function main() {
  const dbName = process.argv[2]
  const scriptDirPath = await getScriptDirPath()
  const recipeDb = new RecipeDb(`${scriptDirPath}/${dbName}.sqlite3`)

  recipeDb.close()
}

main()
