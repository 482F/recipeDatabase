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
        return async (sql, ...params) =>
          await toAsyncCallback((c) => db[key](sql, ...params, c))
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
  async init() {
    await this._db.run(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER UNIQUE NOT NULL PRIMARY KEY,
        name VARCHAR(200) UNIQUE NOT NULL,
        max_stuck INTEGER
      );`)
    await this._db.run(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER UNIQUE NOT NULL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        product_number INTEGER NOT NULL DEFAULT 1,
        material_id INTEGER NOT NULL,
        material_required_number INTEGER NOT NULL,
        FOREIGN KEY(product_id) REFERENCES materials(id),
        FOREIGN KEY(material_id) REFERENCES materials(id),
        UNIQUE (product_id, material_id)
      );`)
  }
  close() {
    this._db.close()
  }
}

async function main() {
  const dbName = process.argv[2]
  const scriptDirPath = await getScriptDirPath()
  const recipeDb = new RecipeDb(`${scriptDirPath}/${dbName}.sqlite3`)

  await recipeDb.init()

  recipeDb.close()
}

main()
