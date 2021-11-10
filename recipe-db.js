#!/usr/bin/env node

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

async function main() {
  const db = createDbProxy('./test.sqlite3')

  db.close()
}

main()
